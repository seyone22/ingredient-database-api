// scripts/scrapeCargillsVerbose.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import fetch from "node-fetch";
import { Product } from "@/models/Product";
import dbConnect from "@/utils/dbConnect";
import {normalizePrice, normalizeQuantityUnit} from "@/utils/normalizeQtyUtil";

import { chromium } from "playwright";
import {CargillsFetcher} from "@/services/cargillsFetcher";

async function main() {
    console.log("🔹 Starting full Cargills scrape...");
    await dbConnect();

    const fetcher = new CargillsFetcher();

    const alphabet = "abcdefghijklmnopqrstuvwxyz".split("",12);

    let rawProducts: any[] = [];

    for (const letter of alphabet) {
        console.log(`🔤 Fetching products starting with '${letter.toLowerCase()}'...`);

        try {
            const result = await fetcher.fetchFromSource({
                itemsPerPage: 10000,
                ingredientName: letter
            });

            if (Array.isArray(result) && result.length > 0) {
                rawProducts = rawProducts.concat(result);
                console.log(`✅ Got ${result.length} items for '${letter}'`);
            } else {
                console.log(`⚠️ No results for '${letter}'`);
            }

            // Optional: small delay to avoid rate-limiting
            await new Promise(r => setTimeout(r, 500));

        } catch (err) {
            console.error(`❌ Error fetching '${letter}':`, err);
        }
    }

    console.log(`📦 Retrieved ${rawProducts.length} raw items.`);

    if (!rawProducts.length) {
        console.warn("⚠️ No products returned. Exiting.");
        await mongoose.disconnect();
        return;
    }

    const mappedProducts = rawProducts.map(raw => {
        const { quantity, unit } = normalizeQuantityUnit(raw);
        const price = normalizePrice(raw.Price);
        const normalized = fetcher.mapToProduct(raw, "000000000000000000000000");
        return { ...normalized, quantity, unit, price, raw: JSON.stringify(raw) };
    });

    console.log("💾 Saving/updating in MongoDB...");
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
                        raw: product.raw,
                    },
                    $setOnInsert: { ingredient: product.ingredient },
                },
                upsert: true,
            }
        }));

        const result = await Product.bulkWrite(bulkOps);
        console.log(`✅ Bulk upsert complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`);
    } catch (err: any) {
        console.error("⚠️ Bulk upsert error:", err.message);
    }

    await mongoose.disconnect();
    console.log("🔻 Done. MongoDB connection closed.");
}

main().catch(err => {
    console.error("❌ Fatal scrape error:", err);
    process.exit(1);
});
