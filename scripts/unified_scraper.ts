import dotenv from "dotenv";
import { db } from "@/utils/db";
import { products, priceHistories, stockHistories, auditLogs } from "@/utils/schema";
import { eq } from "drizzle-orm"; // Removed 'and' since we don't need the complex SELECT anymore
import { normalizeQuantityUnit } from "@/utils/normalizeQtyUtil";

import { CargillsFetcher } from "@/services/cargillsFetcher";
import { KeellsFetcher } from "@/services/keelsFetcher";
import { SparFetcher } from "@/services/sparFetcher";

dotenv.config({ path: ".env.local" });

// Define supported stores
const STORES = [
    { name: "Cargills", fetcher: CargillsFetcher, mode: "alphabet" },
    { name: "Keells", fetcher: KeellsFetcher, mode: "all" },
    { name: "Spar", fetcher: SparFetcher, mode: "all" },
];

async function fetchStoreData(storeName: string, FetcherClass: any, mode: string) {
    console.log(`\n🔹 Starting ${storeName} scrape...`);
    const fetcher = new FetcherClass();

    let rawProducts: any[] = [];

    if (mode === "alphabet") {
        const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
        for (const letter of alphabet) {
            console.log(`🔤 Fetching products starting with '${letter}'...`);
            try {
                const result = await fetcher.fetchFromSource({
                    itemsPerPage: 10000,
                    ingredientName: letter,
                });
                if (Array.isArray(result) && result.length > 0) {
                    rawProducts.push(...result);
                    console.log(`✅ Got ${result.length} items for '${letter}'`);
                } else {
                    console.log(`⚠️ No results for '${letter}'`);
                }
            } catch (err) {
                console.error(`❌ Error fetching '${letter}':`, err);
            }
            await new Promise(r => setTimeout(r, 500)); // avoid rate limits
        }
    } else {
        console.log("⚙️ Fetching all products...");
        rawProducts = await fetcher.fetchFromSource({ itemsPerPage: 10000, ingredientName: "" });
    }

    console.log(`📦 Retrieved ${rawProducts.length} raw items from ${storeName}.`);
    return { fetcher, rawProducts };
}

async function processAndUpsert(fetcher: any, rawProducts: any[], storeName: string) {
    if (!rawProducts.length) return;

    console.log(`🧪 Normalizing ${storeName} products...`);
    const mappedProducts = rawProducts.map(raw => {
        // 1. Get the unified data structure from the specific store's fetcher
        const normalized = fetcher.mapToProduct(raw, "");

        // 2. Apply your global quantity/unit normalizer
        const { quantity, unit } = normalizeQuantityUnit(raw);

        // 3. Merge data cleanly for PostgreSQL
        return {
            ...normalized,
            quantity: quantity || normalized.quantity,
            unit: unit || normalized.unit,
            sourceId: normalized.sourceId || fetcher.sourceId,
            sku: normalized.itemCode || normalized.sku || null,
            raw: raw
        };
    });

    console.log(`💾 Saving/updating ${storeName} in PostgreSQL...`);
    let upsertCount = 0;
    let dailyPricePoints = 0;
    let dailyStockPoints = 0;

    try {
        // Process sequentially to manage relationships safely
        for (const scraped of mappedProducts) {
            if (!scraped.externalId || !scraped.sourceId) continue;

            // 1. Upsert the core product data
            // (We no longer need to SELECT the previous state first!)
            const [upserted] = await db
                .insert(products)
                .values({
                    ...scraped,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: [products.externalId, products.sourceId],
                    set: { ...scraped, updatedAt: new Date() },
                })
                .returning({ id: products.id });

            upsertCount++;

            // 2. Record Daily Price History (Every time, if valid)
            if (scraped.price !== undefined && scraped.price > 0) {
                await db.insert(priceHistories).values({
                    productId: upserted.id,
                    price: scraped.price,
                    currency: scraped.currency || "LKR",
                });
                dailyPricePoints++;
            }

            // 3. Record Daily Stock History (Every time, if valid)
            if (scraped.stockInHand !== undefined && scraped.stockInHand !== null) {
                await db.insert(stockHistories).values({
                    productId: upserted.id,
                    stock: scraped.stockInHand,
                    averageDailySales: scraped.averageSale,
                });
                dailyStockPoints++;
            }
        }

        console.log(`✅ ${storeName}: ${upsertCount} products processed.`);
        console.log(`📈 Logged ${dailyPricePoints} daily price history data points.`);
        console.log(`📊 Logged ${dailyStockPoints} daily stock history data points.`);

    } catch (err: any) {
        console.error(`⚠️ Database error (${storeName}):`, err.message);
    }
}

async function main() {
    console.log("🔸 Starting unified store scrape...");

    // 1. Create an independent Audit Log for THIS specific execution
    const [currentLog] = await db.insert(auditLogs).values({
        type: 'SCRAPE_RUN',
        status: 'pending',
        tag: 'AUTO_SCRAPE',
        initiatedBy: 'system_scraper',
        metadata: {
            stores: STORES.map(s => s.name),
            environment: process.env.NODE_ENV || 'development'
        }
    }).returning({ id: auditLogs.id });

    console.log(`📝 Audit Log created: ${currentLog.id}`);

    let successCount = 0;
    let errorMessages: string[] = [];

    // 2. Wrap the loop in a try-catch to ensure the log is updated on failure
    try {
        for (const store of STORES) {
            try {
                const { fetcher, rawProducts } = await fetchStoreData(store.name, store.fetcher, store.mode);
                await processAndUpsert(fetcher, rawProducts, store.name);
                successCount++;
            } catch (err: any) {
                const msg = `❌ Error processing ${store.name}: ${err.message}`;
                console.error(msg);
                errorMessages.push(msg);
            }
        }

        // 3. Finalize success
        await db.update(auditLogs).set({
            status: errorMessages.length === 0 ? 'completed' : 'partial_success',
            endTime: new Date(),
            updatedAt: new Date(),
            message: `Finished scraping. Successful stores: ${successCount}/${STORES.length}. ${errorMessages.join(' | ')}`
        }).where(eq(auditLogs.id, currentLog.id));

        console.log("✅ Audit Log finalized.");

    } catch (fatalErr: any) {
        // 4. Handle Fatal script-level crashes
        await db.update(auditLogs).set({
            status: 'failed',
            endTime: new Date(),
            updatedAt: new Date(),
            message: `Fatal Scraper Error: ${fatalErr.message}`
        }).where(eq(auditLogs.id, currentLog.id));

        throw fatalErr; // Re-throw to trigger GitHub Action failure state
    }
}

// --- Execution Entry Point ---
main().then(() => {
    console.log("🔻 Done. Exiting process.");
    process.exit(0);
}).catch(err => {
    console.error("❌ Fatal execution error:", err);
    process.exit(1);
});