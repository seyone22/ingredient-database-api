import { db } from "@/utils/db";
import { priceSources, products, mappings } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { toPgId } from "@/utils/uuid";

export interface FetchProductParams {
    ingredientName?: string;
    productId?: string | number;
    country?: string;
    itemsPerPage?: number;
}

export abstract class SupermarketFetcher {
    abstract sourceName: string;
    abstract country: string;

    // Subclasses will implement these
    protected abstract fetchFromSource(params: FetchProductParams): Promise<any[]>;

    // 🔥 FIX: Removed 'Partial<>'. This forces subclasses to return the strictly required fields (name, price, sourceId)
    protected abstract mapToProduct(raw: any, ingredientId?: string): typeof products.$inferInsert;

    /**
     * Primary entry point to fetch and persist products from a supermarket.
     */
    async getProducts(ingredientId: string, ingredientName: string): Promise<any[]> {
        // Ensure ID is a valid Postgres UUID
        const pgIngredientId = toPgId(ingredientId);

        // 1️⃣ Get or create source doc in Postgres
        let sourceId: string;
        const existingSource = await db
            .select({ id: priceSources.id })
            .from(priceSources)
            .where(eq(priceSources.name, this.sourceName))
            .limit(1);

        if (existingSource.length > 0) {
            sourceId = existingSource[0].id;
        } else {
            const [newSource] = await db.insert(priceSources).values({
                name: this.sourceName,
                country: this.country,
                type: "scraper" // Default type for fetchers
            }).returning({ id: priceSources.id });

            sourceId = newSource.id;
        }

        // Inform subclasses of the resolved sourceId in case they need it internally
        (this as any).sourceId = sourceId;

        // 2️⃣ Fetch raw products from source
        const rawProducts = await this.fetchFromSource({ ingredientName });

        if (!rawProducts || rawProducts.length === 0) return [];

        const newProducts = [];

        // 3️⃣ Map and insert into Postgres using the Junction Table (mappings)
        for (const raw of rawProducts) {
            try {
                // Because of the strict return type, TypeScript now guarantees 'mapped' has name, price, etc.
                const mapped = this.mapToProduct(raw, pgIngredientId);

                // Build strict payload to satisfy Drizzle TS compiler
                const insertPayload: typeof products.$inferInsert = {
                    ...mapped,
                    sourceId, // explicitly enforce the resolved ID
                    lastFetched: new Date()
                };

                // A. Insert the mapped product
                const [product] = await db.insert(products).values(insertPayload).returning();

                // B. Create the Mapping to link Product <-> Ingredient
                await db.insert(mappings).values({
                    productId: product.id,
                    sourceId: sourceId,
                    matchedIngredients: [pgIngredientId], // Stored as a UUID array
                    method: "auto",
                    confidence: 1.0,
                    notes: `Auto-mapped during fetch for: ${ingredientName}`
                });

                newProducts.push(product);
            } catch (err) {
                console.warn(`Failed to create product/mapping for raw item (Name: ${raw.ItemName || raw.title || raw.name || 'Unknown'}):`, err);
            }
        }

        return newProducts;
    }
}