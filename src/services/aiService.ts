import {GoogleGenAI} from "@google/genai";
import {z} from "zod";
import {zodToJsonSchema} from "zod-to-json-schema";
import {db} from "@/utils/db";
import {auditLogs, ingredients} from "@/utils/schema";
import {eq, inArray} from "drizzle-orm";
import {toPgId} from "@/utils/uuid";

// Zod schema for Gemini enrichment response
// Updated to match Drizzle schema property names (camelCase)
export const schema = z.object({
    id: z.string(),
    name: z.string(),
    aliases: z.array(z.string()).optional().default([]),
    country: z.array(z.string()).optional().default([]),
    cuisine: z.array(z.string()).optional().default([]),
    region: z.array(z.string()).optional().default([]),
    flavorProfile: z.array(z.string()).optional().default([]),
    dietaryFlags: z.array(z.string()).optional().default([]),
    substitutes: z.array(z.string()).optional().default([]),
    comment: z.string().optional().default(""),
    pronunciation: z.string().optional().default(""),
    photo: z.string().optional().default(""),
});

const CONFIG = {
    GEMINI_MODEL: "gemini-2.5-flash",
    USE_AI: true,
};

/**
 * Fetch ingredient(s) by ID(s)
 */
export async function getIngredientsByIds(ids: string[]) {
    // Translate legacy Mongo ObjectIds to Postgres UUIDs
    const pgIds = ids.map(id => toPgId(id));

    if (pgIds.length === 0) return [];

    return db.query.ingredients.findMany({
        where: inArray(ingredients.id, pgIds)
    });
}

/**
 * Merge arrays and remove duplicates
 */
function mergeArrays(existing: any[] = [], incoming: any[] = []) {
    const set = new Set([...(existing || []), ...(incoming || [])].map((i) => JSON.stringify(i)));
    return Array.from(set).map((s) => JSON.parse(s));
}

/**
 * Update ingredient in PostgreSQL
 */
export async function updateIngredientInDb(enriched: any) {
    // Fetch current state to merge
    const existing = await db.query.ingredients.findFirst({
        where: eq(ingredients.id, enriched.id)
    });

    if (existing) {
        for (const key of ["aliases", "country", "cuisine", "region", "flavorProfile", "dietaryFlags", "substitutes"]) {
            enriched[key] = mergeArrays((existing as any)[key] || [], enriched[key] || []);
        }
        for (const key of ["comment", "pronunciation"]) {
            if (!enriched[key]) enriched[key] = (existing as any)[key] || null;
        }
    }

    // Map AI enrichment data to Drizzle schema formats
    const updateData: any = {
        aliases: enriched.aliases,
        country: enriched.country,
        cuisine: enriched.cuisine,
        region: enriched.region,
        flavorProfile: enriched.flavorProfile,
        dietaryFlags: enriched.dietaryFlags,
        substitutes: enriched.substitutes,
        comment: enriched.comment || null,
        pronunciation: enriched.pronunciation || null,
        lastModified: new Date()
    };

    // If Gemini returns a photo string, map it to our new JSONB image column
    if (enriched.photo) {
        updateData.image = {url: enriched.photo, source: "Gemini", missing: false};
    }

    // Execute Postgres Update
    await db.update(ingredients)
        .set(updateData)
        .where(eq(ingredients.id, enriched.id));
}

/**
 * Enhance ingredient(s) by ID using Google Gemini
 */
export async function enhanceIngredientsById(ids: string[]) {
    if (!CONFIG.USE_AI) return {};

    const fetchedIngredients = await getIngredientsByIds(ids);
    if (!fetchedIngredients.length) return {};

    const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY!});
    const enrichedMap: Record<string, any> = {};

    for (const ing of fetchedIngredients) {
        const prompt = `
Provide detailed enrichment for the ingredient: "${ing.name}".
Return JSON with:
- id: "${ing.id}"
- name
- aliases: array of alternative names
- country, cuisine, region, flavorProfile, dietaryFlags as arrays
- comment: a string description of what the ingredient is, how it's used in cooking, where it's from, how it can be stored
- pronunciation: as standard format for pronunciation
Use valid JSON only.
`;

        try {
            const response = await ai.models.generateContent({
                model: CONFIG.GEMINI_MODEL,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseJsonSchema: zodToJsonSchema(schema as any)
                }
            });

            if (response.text !== undefined) {
                console.log(response.text);

                const enriched = JSON.parse(response.text);
                enrichedMap[enriched.id] = enriched;

                // Update the PostgreSQL document
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

/**
 * Orchestrates the AI enhancement process, wrapping it safely in an Audit Log.
 */
export async function processAiEnrichment(ids: string[]) {
    if (!ids || ids.length === 0) {
        throw new Error("No IDs provided");
    }

    // 1. Create the "Pending" Audit Log
    const [log] = await db.insert(auditLogs).values({
        type: "AI_ENRICHMENT",
        tag: "GEMINI_FLASH", // Updated to match your current AI provider
        initiatedBy: "user",
        status: "pending",
        metadata: {
            ingredientIds: ids,
            count: ids.length,
            step: "starting"
        }
    }).returning({id: auditLogs.id});

    try {
        // 2. Call the actual AI Enhancement Service
        // (This is the enhanceIngredientsById function you already wrote)
        const result = await enhanceIngredientsById(ids);

        // 3. Update Audit Log to Success
        await db.update(auditLogs).set({
            status: "completed",
            message: `Successfully enriched ${ids.length} ingredient(s).`,
            metadata: {
                ingredientIds: ids,
                count: ids.length,
                step: "completed",
                // Note: If Gemini returns token usage, you can append it here
            },
            endTime: new Date(),
            updatedAt: new Date()
        }).where(eq(auditLogs.id, log.id));

        return result;

    } catch (err: any) {
        // 4. Update Audit Log to Failed if an error occurs
        await db.update(auditLogs).set({
            status: "failed",
            error: err.message,
            metadata: {
                ingredientIds: ids,
                count: ids.length,
                step: "failed"
            },
            endTime: new Date(),
            updatedAt: new Date()
        }).where(eq(auditLogs.id, log.id));

        throw err;
    }
}