// services/sparFetcher.ts
import { SupermarketFetcher } from "@/services/supermarketFetcher";
import { ObjectId } from "bson";

export class SparFetcher extends SupermarketFetcher {
    sourceName = "SPAR";
    country = "LK";
    sourceId = "69034165c17582fc6ab77c78"; // placeholder ObjectId

    private BASE_API = "https://spar2u.lk";

    async fetchFromSource(params: { ingredientName?: string; itemsPerPage?: number, pageCount?: number } = {}): Promise<any[]> {
        const itemsPerPage = params.itemsPerPage || 250;
        const maxPages = params.pageCount || 15;

        const allItems: any[] = [];

        async function backoff(attempt: number) {
            const base = 300; // ms
            const max = 5000;
            const jitter = Math.random() * 200;
            const delay = Math.min(base * Math.pow(2, attempt), max) + jitter;
            return new Promise(res => setTimeout(res, delay));
        }

        for (let page = 1; page <= maxPages; page++) {
            const url = `${this.BASE_API}/products.json?limit=${itemsPerPage}&page=${page}`;
            console.log(`Fetching SPAR page ${page}...`);

            let attempts = 0;
            let json = null;

            while (attempts < 5) {
                attempts++;

                const res = await fetch(url, {
                    headers: {
                        "User-Agent": "IngredientScraper/1.0",
                        "Accept": "application/json"
                    }
                });

                if (res.status === 429 || res.status === 503) {
                    console.warn(`Rate limited (page ${page}, attempt ${attempts}), backing off...`);
                    await backoff(attempts);
                    continue;
                }

                if (!res.ok) {
                    console.warn(`SPAR fetch failed for page ${page}: ${res.statusText}`);
                    break; // skip page
                }

                try {
                    json = await res.json();
                } catch {
                    console.warn(`Invalid JSON, page ${page}`);
                    break;
                }

                break; // success
            }

            if (!json) continue;

            const products = json.products || [];

            if (!products.length) {
                console.log("No more products, stopping early.");
                break;
            }

            allItems.push(...products);

            // pacing delay for normal requests
            await new Promise(r => setTimeout(r, 350));
        }

        console.log(`Total SPAR products fetched: ${allItems.length}`);
        return allItems;
    }

    mapToProduct(raw: any, ingredientId: string) {
        // price is from the first available variant (fallback if none available)
        const variant = raw.variants?.find((v: { available: any; }) => v.available) || raw.variants?.[0];

        return {
            name: raw.title,
            source: new ObjectId(this.sourceId),
            ingredient: new ObjectId(ingredientId),
            unit: raw.unit,
            quantity: raw.quantity,
            price: parseFloat(variant?.price || "0"),
            currency: "LKR",
            url: "", // SPAR JSON has images under `images` array, can take first if exists
            externalId: raw.id?.toString(),
            itemCode: variant?.sku?.toString(),
            isAvailable: variant?.available ?? true,
            departmentCode: raw.product_type || "Misc",
            raw: JSON.stringify(raw),
        };
    }
}
