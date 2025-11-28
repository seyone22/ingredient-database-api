import { MongoClient, ObjectId } from "mongodb";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Zod schema for Gemini enrichment response
export const schema = z.object({
    _id: z.string(),
    name: z.string(),
    aliases: z.array(z.string()).optional().default([]),
    country: z.array(z.string()).optional().default([]),
    cuisine: z.array(z.string()).optional().default([]),
    region: z.array(z.string()).optional().default([]),
    flavor_profile: z.array(z.string()).optional().default([]),
    dietary_flags: z.array(z.string()).optional().default([]),
    substitutes: z.array(z.string()).optional().default([]),
    comment: z.string().optional().default(""),
    pronunciation: z.string().optional().default(""),
    photo: z.string().optional().default(""),
});

const CONFIG = {
    MONGO_URI: process.env.MONGO_URI!,
    MONGO_DB: "foodrepo",
    MONGO_COLLECTION: "ingredients",
    GEMINI_MODEL: "gemini-2.5-flash",
    USE_AI: true,
};

let mongoClient: MongoClient;

async function getCollection() {
    if (!mongoClient) {
        mongoClient = new MongoClient(CONFIG.MONGO_URI);
        await mongoClient.connect();
    }
    return mongoClient.db(CONFIG.MONGO_DB).collection(CONFIG.MONGO_COLLECTION);
}

/**
 * Fetch ingredient(s) by ID(s)
 */
export async function getIngredientsByIds(ids: string[]) {
    const collection = await getCollection();
    const objectIds = ids.map((id) => new ObjectId(id));
    return collection.find({ _id: { $in: objectIds } }).toArray();
}

/**
 * Merge arrays and remove duplicates
 */
function mergeArrays(existing: any[] = [], incoming: any[] = []) {
    const set = new Set([...existing, ...incoming].map((i) => JSON.stringify(i)));
    return Array.from(set).map((s) => JSON.parse(s));
}

/**
 * Update ingredient in MongoDB
 */
export async function updateIngredientInDb(enriched: any) {
    const collection = await getCollection();
    const existing = await collection.findOne({ _id: new ObjectId(enriched._id) });

    if (existing) {
        for (const key of ["aliases", "country", "cuisine", "region", "flavor_profile", "dietary_flags", "substitutes"]) {
            enriched[key] = mergeArrays(existing[key] || [], enriched[key] || []);
        }
        for (const key of ["comment", "pronunciation", "photo"]) {
            if (!enriched[key]) enriched[key] = existing[key] || "";
        }
    }

    // Exclude _id from the update object
    const { _id, ...updateData } = enriched;

    await collection.updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateData },
        { upsert: true }
    );
}

/**
 * Enhance ingredient(s) by ID using Google Gemini
 */
export async function enhanceIngredientsById(ids: string[]) {
    if (!CONFIG.USE_AI) return {};

    const ingredients = await getIngredientsByIds(ids);
    if (!ingredients.length) return {};

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const enrichedMap: Record<string, any> = {};

    for (const ing of ingredients) {
        const prompt = `
Provide detailed enrichment for the ingredient: "${ing.name}".
Return JSON with:
- _id: "${ing._id}"
- name
- aliases: array of alternative names
- country, cuisine, region, flavor_profile, dietary_flags as arrays
- comment: a string description of what the ingredient is, how it's used in cooking, where it's from, how it can be stored
- pronunciation: as standard format for pronunciation
Use valid JSON only.
`;

        try {
            const response = await ai.models.generateContent({
                model: CONFIG.GEMINI_MODEL,
                contents: prompt,
                config:{
                    responseMimeType: "application/json",
                    responseJsonSchema: zodToJsonSchema(schema as any)
                }
            });

            // Parse the JSON string returned by Gemini
            if (response.text !== undefined) {

                console.log(response.text);

                const enriched = JSON.parse(response.text);
                enrichedMap[enriched._id] = enriched;

                // Update the MongoDB document
                await updateIngredientInDb(enriched);
            } else {
                throw new Error("Response error from Gemini.");
            }
        } catch (err: any) {
            console.error(`Failed to enrich ingredient ${ing.name}:`, err.message || err);
        }
    }

    return enrichedMap;
}
