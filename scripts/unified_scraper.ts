// scripts/scrapeAllStores.ts
import dotenv from "dotenv";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import {Product} from "@/models/Product";
import {normalizeQuantityUnit} from "@/utils/normalizeQtyUtil";

import {CargillsFetcher} from "@/services/cargillsFetcher";
import {KeellsFetcher} from "@/services/keelsFetcher";
import {SparFetcher} from "@/services/sparFetcher";
import {PriceHistory} from "@/models/PriceHistory";
import {AuditLog} from "@/models/AuditLog";
import {StockHistory} from "@/models/StockHistory"; // Add this to your imports

dotenv.config({path: ".env.local"});

// Define supported stores
const STORES = [
    {name: "Cargills", fetcher: CargillsFetcher, mode: "alphabet"},
    {name: "Keells", fetcher: KeellsFetcher, mode: "all"},
    {name: "Spar", fetcher: SparFetcher, mode: "all"},
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
        rawProducts = await fetcher.fetchFromSource({itemsPerPage: 10000, ingredientName: ""});
    }

    console.log(`📦 Retrieved ${rawProducts.length} raw items from ${storeName}.`);
    return {fetcher, rawProducts};
}

async function processAndUpsert(fetcher: any, rawProducts: any[], storeName: string) {
    if (!rawProducts.length) return;

    console.log(`🧪 Normalizing ${storeName} products...`);
    const mappedProducts = rawProducts.map(raw => {
        // 1. Get the unified data structure from the specific store's fetcher
        // (Passing an empty string for ingredientId since we map that later in the UI)
        const normalized = fetcher.mapToProduct(raw, "");

        // 2. Apply your global quantity/unit normalizer
        const {quantity, unit} = normalizeQuantityUnit(raw);

        // 3. DO NOT overwrite the price. Just merge the normalized data with your custom raw/qty fields.
        return {
            ...normalized,
            quantity: quantity || normalized.quantity,
            unit: unit || normalized.unit,
            raw: JSON.stringify(raw)
        };
    });

    console.log(`💾 Saving/updating ${storeName} in MongoDB...`);
    try {
        const bulkOps = mappedProducts.map(product => ({
            updateOne: {
                filter: { externalId: product.externalId, source: product.source },
                update: {
                    $set: {
                        // Existing Fields
                        name: product.name,
                        price: product.price,
                        unit: product.unit,
                        quantity: product.quantity,
                        url: product.url,
                        last_fetched: new Date(),
                        currency: product.currency,
                        departmentCode: product.departmentCode,

                        // --- New Advanced Market Data ---
                        brand: product.brand ?? null,
                        stockInHand: product.stockInHand ?? null,
                        averageSale: product.averageSale ?? null,
                        maxQty: product.maxQty ?? null,
                        categoryPath: product.categoryPath ?? [],
                        subDepartmentCode: product.subDepartmentCode ?? null,
                        isPromotionApplied: product.isPromotionApplied ?? false,
                        promotionDiscountValue: product.promotionDiscountValue ?? 0,
                        sku: product.itemCode ?? null, // Mapping Keells itemCode to SKU

                        raw: product.raw,
                    }
                },
                upsert: true,
            },
        }));

        const result = await Product.bulkWrite(bulkOps);
        console.log(`✅ ${storeName}: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`);

        const externalIds = mappedProducts.map(p => p.externalId);
        const savedProducts = await Product.find({
            source: fetcher.sourceId,
            externalId: {$in: externalIds}
        }, {_id: 1, externalId: 1, price: 1}).lean();

        const historyDocs = mappedProducts.map(scraped => {
            const dbProduct = savedProducts.find(db => db.externalId === scraped.externalId);
            // CRITICAL: Only create history if dbProduct exists AND price is a valid number > 0
            if (!dbProduct || scraped.price === undefined || scraped.price <= 0) return null;

            return {
                product: dbProduct._id,
                price: scraped.price,
                currency: scraped.currency || "LKR",
                timestamp: new Date()
            };
        }).filter(Boolean);

        if (historyDocs.length > 0) {
            await PriceHistory.insertMany(historyDocs);
            console.log(`📈 Logged ${historyDocs.length} price history data points.`);
        }

        // 2. Add inside processAndUpsert after the PriceHistory block:
        const stockHistoryDocs = mappedProducts.map(scraped => {
            const dbProduct = savedProducts.find(db => db.externalId === scraped.externalId);
            // Only log if stock data exists (currently Keells)
            if (!dbProduct || scraped.stockInHand === undefined) return null;

            return {
                product: dbProduct._id,
                stock: scraped.stockInHand,
                averageDailySales: scraped.averageDailySales,
                timestamp: new Date()
            };
        }).filter(Boolean);

        if (stockHistoryDocs.length > 0) {
            await StockHistory.insertMany(stockHistoryDocs);
            console.log(`📊 Logged ${stockHistoryDocs.length} stock history data points.`);
        }

    } catch (err: any) {
        console.error(`⚠️ Bulk upsert error (${storeName}):`, err.message);
    }
}

async function main() {
    console.log("🔸 Starting unified store scrape...");
    await dbConnect();

    // 1. Create an independent Audit Log for THIS specific execution
    const currentLog = await AuditLog.create({
        type: 'SCRAPE_RUN',
        status: 'pending',
        startTime: new Date(),
        initiatedBy: 'system_scraper', // Identifies this as the script's own log
        tag: 'AUTO_SCRAPE',
        metadata: {
            stores: STORES.map(s => s.name),
            environment: process.env.NODE_ENV || 'development'
        }
    });

    console.log(`📝 Audit Log created: ${currentLog._id}`);

    let successCount = 0;
    let errorMessages: string[] = [];

    // 2. Wrap the loop in a try-catch to ensure the log is updated on failure
    try {
        for (const store of STORES) {
            try {
                const {fetcher, rawProducts} = await fetchStoreData(store.name, store.fetcher, store.mode);
                await processAndUpsert(fetcher, rawProducts, store.name);
                successCount++;
            } catch (err: any) {
                const msg = `❌ Error processing ${store.name}: ${err.message}`;
                console.error(msg);
                errorMessages.push(msg);
            }
        }

        // 3. Finalize success
        await AuditLog.findByIdAndUpdate(currentLog._id, {
            status: errorMessages.length === 0 ? 'completed' : 'partial_success',
            endTime: new Date(),
            message: `Finished scraping. Successful stores: ${successCount}/${STORES.length}. ${errorMessages.join(' | ')}`
        });
        console.log("✅ Audit Log finalized.");

    } catch (fatalErr: any) {
        // 4. Handle Fatal script-level crashes
        await AuditLog.findByIdAndUpdate(currentLog._id, {
            status: 'failed',
            endTime: new Date(),
            message: `Fatal Scraper Error: ${fatalErr.message}`
        });
        throw fatalErr; // Re-throw to trigger GitHub Action failure state
    } finally {
        await mongoose.disconnect();
        console.log("🔻 Done. MongoDB connection closed.");
    }
}