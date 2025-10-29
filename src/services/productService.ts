import { Product, IProductData } from "@/models/Product";
import OpenAI from "openai";

export interface ProductFetchResponse {
    product: IProductData | null;
}

export interface ProductListResponse {
    products: IProductData[];
    total: number;
}

// -------------------------
// Gemini client (for embeddings if needed)
// -------------------------
const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// -------------------------
// Fetch single product by ID
// -------------------------
export async function fetchProduct(id: string): Promise<ProductFetchResponse> {
    try {
        const product = await Product.findById(id).lean();
        return { product };
    } catch (err: any) {
        console.error(`Error fetching product ${id}:`, err);
        return { product: null };
    }
}

// -------------------------
// Fetch multiple products by IDs
// -------------------------
export async function fetchProductsByIds(ids: string[]): Promise<ProductListResponse> {
    try {
        const products = await Product.find(
            { _id: { $in: ids } },
            { embedding: 0 } // Exclude the 'embedding' field
        ).lean();

        return { products, total: products.length };
    } catch (err: any) {
        console.error("Error fetching products by IDs:", err);
        return { products: [], total: 0 };
    }
}

// -------------------------
// Fetch all products (with optional pagination)
// -------------------------
interface FetchAllOptions {
    page?: number;
    limit?: number;
}
export async function fetchAllProducts({ page = 1, limit = 50 }: FetchAllOptions = {}): Promise<ProductListResponse> {
    try {
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            Product.find().skip(skip).limit(limit).lean(),
            Product.countDocuments(),
        ]);
        return { products, total };
    } catch (err: any) {
        console.error("Error fetching all products:", err);
        return { products: [], total: 0 };
    }
}

// -------------------------
// Refresh all products (placeholder)
// -------------------------
export async function refreshProducts(): Promise<void> {
    // TODO: implement logic to fetch latest product prices and details
}
