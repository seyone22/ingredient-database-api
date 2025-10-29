import { IProduct } from "@/models/Product";

export interface FetchProductParams {
    ingredientName?: string;
    productId?: string | number;
    country?: string;
    itemsPerPage?: number;
}

export abstract class SupermarketFetcher {
    abstract sourceName: string;
    abstract country: string;

    protected abstract fetchFromSource(params: FetchProductParams): Promise<any[]>;
    protected abstract mapToProduct(raw: any, ingredientId: string): Partial<IProduct>;

    async getProducts(ingredientId: string, ingredientName: string): Promise<IProduct[]> {
        const Product = (await import("@/models/Product")).Product;
        const PriceSource = (await import("@/models/PriceSource")).PriceSource;

        // 1️⃣ Get or create source doc
        let sourceDoc = await PriceSource.findOne({ name: this.sourceName });
        if (!sourceDoc) {
            sourceDoc = await PriceSource.create({ name: this.sourceName, country: this.country });
        }

        // 2️⃣ Fetch raw products from source
        const rawProducts = await this.fetchFromSource({ ingredientName });

        if (!rawProducts || rawProducts.length === 0) return [];

        const newProducts: IProduct[] = [];

        for (const raw of rawProducts) {
            try {
                const mapped = this.mapToProduct(raw, ingredientId);

                // Optimistically map to the ingredient we're searching by
                const product = await Product.create({
                    ...mapped,
                    ingredient: ingredientId,
                    source: sourceDoc._id,
                    last_fetched: new Date()
                });

                newProducts.push(product);
            } catch (err) {
                console.warn(`Failed to create product for raw item ${raw.itemID || raw.itemId}:`, err);
            }
        }

        return newProducts;
    }
}
