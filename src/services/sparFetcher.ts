// services/sparFetcher.ts
import { SupermarketFetcher } from "@/services/supermarketFetcher";
import { ObjectId } from "bson";

export class SparFetcher extends SupermarketFetcher {
    sourceName = "SPAR";
    country = "LK";
    sourceId = "69034165c17582fc6ab77c78"; // placeholder ObjectId

    private BASE_API = "https://spar2u.lk";

    async fetchFromSource(params: { ingredientName?: string; itemsPerPage?: number } = {}): Promise<any[]> {
        const itemsPerPage = params.itemsPerPage || 25;
        const maxPages = 120; // SPAR has ~116 pages, go slightly over

        let allItems: any[] = [];

        for (let page = 1; page <= maxPages; page++) {
            const url = `${this.BASE_API}/products.json?limit=${itemsPerPage}&page=${page}`;
            console.log(`Fetching SPAR page ${page}...`);

            const res = await fetch(url);
            if (!res.ok) {
                console.warn(`SPAR fetch failed for page ${page}: ${res.statusText}`);
                continue;
            }

            const json = await res.json();
            const products = json?.products || [];
            if (!products.length) break; // stop early if no more products

            allItems.push(...products);
        }

        console.log(`📦 Total SPAR products fetched: ${allItems.length}`);
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
