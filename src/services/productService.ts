import dbConnect from "@/utils/dbConnect";
import { Product, IProductData } from "@/models/Product";
import { PriceSource } from "@/models/PriceSource";
import OpenAI from "openai";

export interface ProductFetchResponse {
    product: IProductData | null;
}

export interface ProductListResponse {
    products: IProductData[];
    total: number;
    page?: number;
    limit?: number;
}

// -------------------------
// Gemini client
// -------------------------
const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// -------------------------
// Search Products (Text & SKU)
// -------------------------
export async function searchProducts(query: string, page: number = 1, limit: number = 25): Promise<ProductListResponse> {
    await dbConnect(); // DB connection handled entirely in the service
    const _forceRegister = PriceSource.modelName;

    const skip = (page - 1) * limit;
    const cleanQuery = query.trim();

    const filter: any = {};
    let rawProducts: any[];
    let total: number;

    if (cleanQuery.length >= 2) {
        const prefixRegex = new RegExp(`^${cleanQuery}`, "i");
        const containsRegex = new RegExp(cleanQuery, "i");

        filter.$or = [
            { name: containsRegex },
            { sku: containsRegex }
        ];

        const [aggResults, count] = await Promise.all([
            Product.aggregate([
                { $match: filter },
                {
                    $addFields: {
                        isExactMatch: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: [{ $toLower: "$name" }, cleanQuery.toLowerCase()] },
                                        { $eq: [{ $toLower: "$sku" }, cleanQuery.toLowerCase()] }
                                    ]
                                },
                                1, 0
                            ]
                        },
                        isStartsWith: {
                            $cond: [
                                {
                                    $or: [
                                        { $regexMatch: { input: "$name", regex: prefixRegex } },
                                        { $regexMatch: { input: "$sku", regex: prefixRegex } }
                                    ]
                                },
                                1, 0
                            ]
                        }
                    }
                },
                { $sort: { isExactMatch: -1, isStartsWith: -1, name: 1 } },
                { $skip: skip },
                { $limit: limit },
                { $project: { embedding: 0, isExactMatch: 0, isStartsWith: 0 } }
            ]),
            Product.countDocuments(filter)
        ]);

        rawProducts = aggResults;
        total = count;
    } else {
        const [findResults, count] = await Promise.all([
            Product.find(filter)
                .skip(skip)
                .limit(limit)
                .select("-embedding")
                .sort({ name: 1 })
                .lean(),
            Product.countDocuments(filter)
        ]);

        rawProducts = findResults;
        total = count;
    }

    const products = await Product.populate(rawProducts, { path: "source", select: "name" });

    return { products, total, page, limit };
}

// -------------------------
// Fetch single product by ID
// -------------------------
export async function fetchProduct(id: string): Promise<ProductFetchResponse> {
    try {
        await dbConnect(); // DB connection
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
        await dbConnect(); // DB connection
        const products = await Product.find(
            { _id: { $in: ids } },
            { embedding: 0 }
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
        await dbConnect(); // DB connection
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            Product.find().skip(skip).limit(limit).select("-embedding").lean(),
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