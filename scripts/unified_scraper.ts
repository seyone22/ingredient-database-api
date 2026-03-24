// scripts/scrapeAllStores.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import { Product } from "@/models/Product";
import { normalizePrice, normalizeQuantityUnit } from "@/utils/normalizeQtyUtil";

import { CargillsFetcher } from "@/services/cargillsFetcher";
import { KeellsFetcher } from "@/services/keelsFetcher";
import { SparFetcher } from "@/services/sparFetcher";

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

import { PriceHistory } from "@/models/PriceHistory";
import {AuditLog} from "@/models/AuditLog"; // Add this to your imports

async function processAndUpsert(fetcher: any, rawProducts: any[], storeName: string) {
    if (!rawProducts.length) return;

    console.log(`🧪 Normalizing ${storeName} products...`);
    const mappedProducts = rawProducts.map(raw => {
        // 1. Get the unified data structure from the specific store's fetcher
        // (Passing an empty string for ingredientId since we map that later in the UI)
        const normalized = fetcher.mapToProduct(raw, "");

        // 2. Apply your global quantity/unit normalizer
        const { quantity, unit } = normalizeQuantityUnit(raw);

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
                        name: product.name,
                        price: product.price,
                        unit: product.unit,
                        quantity: product.quantity,
                        url: product.url,
                        last_fetched: new Date(),
                        currency: product.currency,
                        departmentCode: product.departmentCode,
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
            externalId: { $in: externalIds }
        }, { _id: 1, externalId: 1, price: 1 }).lean();

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

    } catch (err: any) {
        console.error(`⚠️ Bulk upsert error (${storeName}):`, err.message);
    }
}

async function main() {
    console.log("🔸 Starting unified store scrape...");
    await dbConnect();

    for (const store of STORES) {
        try {
            const { fetcher, rawProducts } = await fetchStoreData(store.name, store.fetcher, store.mode);
            await processAndUpsert(fetcher, rawProducts, store.name);
        } catch (err) {
            console.error(`❌ Error processing ${store.name}:`, err);
        }
    }

    // --- MOVE AUDIT LOG UPDATE BEFORE DISCONNECT ---
    console.log("📝 Finalizing Audit Log...");
    const latestLog = await AuditLog.findOne({
        type: 'SCRAPE_RUN',
        status: 'pending'
    }).sort({ startTime: -1 });

    if (latestLog) {
        await AuditLog.findByIdAndUpdate(latestLog._id, {
            status: 'completed',
            endTime: new Date(),
            message: `Finished scraping all stores. Updated ${STORES.length} stores.`
        });
        console.log("✅ Audit Log updated to completed.");
    }

    await mongoose.disconnect();
    console.log("🔻 Done. MongoDB connection closed.");
}

main().catch(err => {
    console.error("❌ Fatal scrape error:", err);
    process.exit(1);
});
