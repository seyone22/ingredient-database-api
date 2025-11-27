// scripts/createIngredientIndex.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import dbConnect from "../src/utils/dbConnect";
import { Ingredient } from "../src/models/Ingredient"; // full ingredient model

interface MinimalIngredient {
    foodDbId: string;
    name: string;
}

async function main() {
    console.log("🔹 Starting creation of ingredient index...");

    // 1️⃣ Connect to MongoDB
    await dbConnect();

    // 2️⃣ Fetch all active ingredients from the main collection
    const allIngredients = await Ingredient.find({ active: true }).lean();
    console.log(`📦 Fetched ${allIngredients.length} active ingredients.`);

    if (!allIngredients.length) {
        console.warn("⚠️ No ingredients found. Exiting.");
        await mongoose.disconnect();
        return;
    }

    // 3️⃣ Map to minimal index
    const minimalIndex: MinimalIngredient[] = allIngredients.map(ing => ({
        foodDbId: (ing._id as any).toString(),
        name: ing.name.trim(),
    }));

    // 4️⃣ Define collection
    const indexCollection = mongoose.connection.collection("index_ingredients");

    // 5️⃣ Optional: create a text index for search on `name`
    await indexCollection.createIndex({ name: "text" });
    console.log("🔎 Text index on `name` created.");

    // 6️⃣ Bulk upsert
    const bulkOps = minimalIndex.map(item => ({
        updateOne: {
            filter: { foodDbId: item.foodDbId },
            update: { $set: { name: item.name } },
            upsert: true,
        },
    }));

    try {
        const result = await indexCollection.bulkWrite(bulkOps);
        console.log(`✅ Bulk write complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`);
    } catch (err: any) {
        console.error("⚠️ Bulk write error:", err.message);
    }

    // 7️⃣ Disconnect cleanly
    await mongoose.disconnect();
    console.log("🔻 Done. MongoDB connection closed.");
}

main().catch(err => {
    console.error("❌ Fatal error creating ingredient index:", err);
    process.exit(1);
});
