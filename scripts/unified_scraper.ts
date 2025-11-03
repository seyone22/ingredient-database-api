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

async function processAndUpsert(fetcher: any, rawProducts: any[], storeName: string) {
    if (!rawProducts.length) {
        console.warn(`⚠️ No products from ${storeName}. Skipping.`);
        return;
    }

    console.log(`🧪 Normalizing ${storeName} products...`);
    const mappedProducts = rawProducts.map(raw => {
        const { quantity, unit } = normalizeQuantityUnit(raw);
        const price = raw.Price ? normalizePrice(raw.Price) : raw.price;
        const normalized = fetcher.mapToProduct(raw, "000000000000000000000000");
        return {
            ...normalized,
            quantity,
            unit,
            price,
            raw: JSON.stringify(raw),
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
                    },
                    $setOnInsert: { ingredient: product.ingredient },
                },
                upsert: true,
            },
        }));

        const result = await Product.bulkWrite(bulkOps);
        console.log(`✅ ${storeName}: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`);
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

    await mongoose.disconnect();
    console.log("🔻 Done. MongoDB connection closed.");
}

main().catch(err => {
    console.error("❌ Fatal scrape error:", err);
    process.exit(1);
});
