// src/services/imageService.ts

import {auditLogs, ingredients} from "@/utils/schema";
import {db} from "@/utils/db";
import {eq} from "drizzle-orm";
import {toPgId} from "@/utils/uuid";

export interface ImageFetchResult {
    url: string;
    author: string;
    source: string;
}

export async function fetchIngredientImage(name: string): Promise<ImageFetchResult | null> {
    const safeName = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";

    // ==========================================
    // STEP 1: WIKIDATA STRICT (The Scalpel)
    // ==========================================
    try {
        const strictQuery = `
            SELECT DISTINCT ?image WHERE {
              VALUES ?label { "${safeName}"@en }
              ?ingredient rdfs:label ?label.
              ?ingredient wdt:P31/wdt:P279* ?type.
              FILTER (?type IN (wd:Q2095, wd:Q756, wd:Q10943, wd:Q11002, wd:Q1364, wd:Q11004, wd:Q393822)) 
              ?ingredient wdt:P18 ?image.
            } LIMIT 1
        `.trim();

        const res = await fetch(WIKIDATA_ENDPOINT, {
            method: 'POST',
            headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/sparql+json", "User-Agent": "FoodRepoBot/1.0" },
            body: new URLSearchParams({ query: strictQuery, format: 'json' })
        });

        if (res.ok) {
            const data = await res.json();
            const url = data.results?.bindings?.[0]?.image?.value;
            if (url) return { url, author: "Wikimedia Commons", source: "wikidata_strict" };
        }
    } catch (err) {
        console.warn(`Wikidata Strict failed for ${name}`);
    }

    // ==========================================
    // STEP 2: WIKIDATA BROAD (The Shield)
    // ==========================================
    try {
        const broadQuery = `
            SELECT DISTINCT ?image WHERE {
              VALUES ?label { "${safeName}"@en }
              ?ingredient rdfs:label ?label.
              ?ingredient wdt:P18 ?image.
              MINUS { ?ingredient wdt:P31 wd:Q4830453 . } # No Businesses
              MINUS { ?ingredient wdt:P31 wd:Q783794 . }  # No Tech Companies
            } LIMIT 1
        `.trim();

        const res = await fetch(WIKIDATA_ENDPOINT, {
            method: 'POST',
            headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/sparql+json", "User-Agent": "FoodRepoBot/1.0" },
            body: new URLSearchParams({ query: broadQuery, format: 'json' })
        });

        if (res.ok) {
            const data = await res.json();
            const url = data.results?.bindings?.[0]?.image?.value;
            if (url) return { url, author: "Wikimedia Commons", source: "wikidata_broad" };
        }
    } catch (err) {
        console.warn(`Wikidata Broad failed for ${name}`);
    }

    // ==========================================
    // STEP 3: PEXELS FALLBACK (The Stock Net)
    // ==========================================
    if (process.env.PEXELS_API_KEY) {
        try {
            // Append "food" to ensure we get culinary contexts, not random objects
            const pexelsQuery = encodeURIComponent(`${name} food ingredient`);
            const res = await fetch(`https://api.pexels.com/v1/search?query=${pexelsQuery}&per_page=1&orientation=landscape`, {
                headers: {
                    "Authorization": process.env.PEXELS_API_KEY
                }
            });

            if (res.ok) {
                const data = await res.json();
                const photo = data.photos?.[0];
                if (photo) {
                    return {
                        url: photo.src.large, // Good quality for dashboard/UI
                        author: `<a href="${photo.photographer_url}" target="_blank">${photo.photographer} on Pexels</a>`,
                        source: "pexels"
                    };
                }
            }
        } catch (err) {
            console.warn(`Pexels fetch failed for ${name}`);
        }
    }

    // If all fail, return null
    return null;
}

export async function processIngredientImage(id: string) {
    const pgId = toPgId(id);

    // 1. Fetch the ingredient to get its name
    const ingredient = await db.query.ingredients.findFirst({
        where: eq(ingredients.id, pgId),
        columns: { id: true, name: true }
    });

    if (!ingredient) {
        throw new Error("Ingredient not found");
    }

    // 2. Create the "Pending" Audit Log
    const [log] = await db.insert(auditLogs).values({
        type: "SYSTEM_FETCH",
        tag: "IMAGE_WATERFALL",
        initiatedBy: "admin",
        status: "pending",
        metadata: {
            ingredientId: pgId,
            ingredientName: ingredient.name
        }
    }).returning({ id: auditLogs.id });

    try {
        // 3. Delegate to the external Image Waterfall (Wikidata -> Pexels)
        const imageResult = await fetchIngredientImage(ingredient.name);

        if (!imageResult) {
            // Update log as completed but with no results
            await db.update(auditLogs).set({
                status: "completed",
                message: `Waterfall exhausted. No image found for "${ingredient.name}".`,
                metadata: { ingredientId: pgId, ingredientName: ingredient.name, status: "no_results" },
                endTime: new Date(),
                updatedAt: new Date()
            }).where(eq(auditLogs.id, log.id));

            return null; // Return null so the route knows it failed to find one
        }

        // 4. Update the Ingredient with the found image
        const [updated] = await db.update(ingredients).set({
            image: {
                url: imageResult.url,
                author: imageResult.author,
                source: imageResult.source,
                missing: false
            },
            updatedAt: new Date()
        }).where(eq(ingredients.id, pgId)).returning();

        // 5. Update Audit Log to Success
        await db.update(auditLogs).set({
            status: "completed",
            message: `Successfully mapped image via ${imageResult.source}`,
            metadata: {
                ingredientId: pgId,
                ingredientName: ingredient.name,
                sourceUsed: imageResult.source,
                imageUrl: imageResult.url
            },
            endTime: new Date(),
            updatedAt: new Date()
        }).where(eq(auditLogs.id, log.id));

        return updated;

    } catch (err: any) {
        // 6. Update Audit Log to Failed if an unexpected error occurs
        await db.update(auditLogs).set({
            status: "failed",
            error: err.message,
            endTime: new Date(),
            updatedAt: new Date()
        }).where(eq(auditLogs.id, log.id));

        throw err;
    }
}