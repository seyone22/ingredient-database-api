// scripts/scrapeSparAll.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { Product } from "@/models/Product";
import { SparFetcher } from "@/services/sparFetcher";
import dbConnect from "@/utils/dbConnect";
import { normalizeQuantityUnit } from "@/utils/normalizeQtyUtil";

async function main() {
    console.log("🔹 Starting full SPAR scrape...");

    // 1️⃣ Connect to MongoDB
    await dbConnect();

    // 2️⃣ Instantiate the fetcher
    const fetcher = new SparFetcher();

    // 3️⃣ Fetch everything
    console.log("⚙️ Fetching all SPAR products (this may take a while)...");
    const rawProducts = await fetcher.fetchFromSource({ itemsPerPage: 25, pageCount: 120 });
    console.log(`📦 Retrieved ${rawProducts.length} raw items from SPAR.`);

    if (!rawProducts.length) {
        console.warn("⚠️ No products returned. Exiting.");
        await mongoose.disconnect();
        return;
    }

    // 4️⃣ Map to Product schema and normalize
    const mappedProducts = rawProducts.map(raw => {
        // normalize quantity/unit from title
        const { quantity, unit } = normalizeQuantityUnit(raw);

        // console.log(quantity, unit);

        // map to product schema (ingredient placeholder ObjectId)
        const normalizedProduct = fetcher.mapToProduct(raw, "000000000000000000000000");

        return {
            ...normalizedProduct,
            quantity,
            unit,
            raw: JSON.stringify(raw), // store raw JSON for traceability
        };
    });

    // 5️⃣ Bulk upsert
    console.log("💾 Saving/updating in database...");
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
                    $setOnInsert: {
                        ingredient: product.ingredient, // only set placeholder if document is new
                    },
                },
                upsert: true,
            },
        }));

        const result = await Product.bulkWrite(bulkOps);
        console.log(`✅ Bulk upsert complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`);
    } catch (err: any) {
        console.error("⚠️ Bulk upsert error:", err.message);
    }

    // 6️⃣ Disconnect cleanly
    await mongoose.disconnect();
    console.log("🔻 Done. MongoDB connection closed.");
}

main().catch(err => {
    console.error("❌ Fatal scrape error:", err);
    process.exit(1);
});
