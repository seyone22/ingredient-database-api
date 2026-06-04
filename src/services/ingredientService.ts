import { Ingredient, IIngredientData } from "@/models/Ingredient";
import OpenAI from "openai";
import { QueryEmbedding } from "@/models/QueryEmbedding";
import {IProductData, Product} from "@/models/Product";
import {ObjectId} from "bson";
import dbConnect from "@/utils/dbConnect";

export interface IngredientSearchResponse {
    results: IIngredientData[];
    page: number;
    totalPages: number;
    total: number;
}

interface SearchOptions {
    page?: number;
    limit?: number;
    country?: string | null;
    autosuggest?: boolean;
    cuisine?: string | null;
    region?: string | null;
    flavor?: string | null;
    includeProducts?: boolean;
}

export interface IngredientListResponse {
    ingredients: IIngredientData[];
    total: number;
}

// -------------------------
// Gemini client
// -------------------------
const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

// -------------------------
// Vector Search with Product Inclusion
// -------------------------
export async function searchIngredientsVector(
    query: string,
    {
        page = 1,
        limit = 20,
        country,
        cuisine,
        region,
        flavor,
        includeProducts = false,
    }: SearchOptions
): Promise<IngredientSearchResponse> {
    if (!query.trim()) {
        return { results: [], page: 1, totalPages: 0, total: 0 };
    }

    const skip = (page - 1) * limit;

    // 1️⃣ Check cache first
    let cached = await QueryEmbedding.findOne({ query: query.trim() });
    let queryVector: number[];

    if (cached) {
        queryVector = cached.embedding;
    } else {
        // 2️⃣ Generate embedding
        const embeddingResponse = await openai.embeddings.create({
            model: "gemini-embedding-001",
            input: query,
        });
        queryVector = embeddingResponse.data[0].embedding;

        // 3️⃣ Store in cache
        await QueryEmbedding.create({ query: query.trim(), embedding: queryVector });
    }

    // 4️⃣ Structured filters
    const filters: any = {};
    if (country) filters.country = country;
    if (cuisine) filters.cuisine = cuisine;
    if (region) filters.region = region;
    if (flavor) filters.flavor_profile = flavor;

    // 5️⃣ Vector search pipeline
    const pipeline: any[] = [
        {
            $vectorSearch: {
                index: "vector_index", // your Atlas vector index
                path: "embedding",
                queryVector,
                numCandidates: 100,
                limit: limit,
            },
        },
        { $match: filters },
        { $skip: skip },
        { $limit: limit },
        {
            // ✅ Never return embeddings
            $project: {
                embedding: 0,
            },
        },
    ];

    // 6️⃣ Execute aggregation
    const results = await Ingredient.aggregate(pipeline);
    const total = await Ingredient.countDocuments(filters);

    // 7️⃣ Include related products (optional)
    if (includeProducts) {
        const ingredientIds = results.map((r) => r._id);
        const productsByIngredient = await Product.aggregate([
            { $match: { ingredient: { $in: ingredientIds } } },
            {
                $group: {
                    _id: "$ingredient",
                    products: { $push: "$$ROOT" },
                },
            },
        ]);

        const productMap = new Map(
            productsByIngredient.map((p) => [p._id.toString(), p.products])
        );

        // Attach products to results
        results.forEach((r: any) => {
            const products = productMap.get(r._id.toString());
            if (products) r.products = products;
        });
    }

    return {
        results,
        page,
        totalPages: Math.ceil(total / limit),
        total,
    };
}


// -------------------------
// Text Search
// -------------------------
export async function searchIngredients(
    query: string,
    {
        page = 1,
        limit = 20,
        autosuggest = false,
        country,
        cuisine,
        region,
        flavor,
        includeProducts = false,
    }: SearchOptions
): Promise<IngredientSearchResponse> {
    await dbConnect()

    if (!query.trim()) {
        return { results: [], page: 1, totalPages: 0, total: 0 };
    }

    const skip = (page - 1) * limit;
    const cleanQuery = query.trim();

    const prefixRegex = new RegExp(`^${cleanQuery}`, "i");
    const containsRegex = new RegExp(cleanQuery, "i");

    const baseFilter: any = {
        $or: [
            { name: autosuggest ? prefixRegex : containsRegex },
            { aliases: autosuggest ? prefixRegex : containsRegex },
        ],
    };

    if (country) baseFilter.country = country;
    if (cuisine) baseFilter.cuisine = cuisine;
    if (region) baseFilter.region = region;
    if (flavor) baseFilter.flavor_profile = flavor;

    // --- 1️⃣ Fetch and sort ingredients via Aggregation ---
    const [results, total] = await Promise.all([
        Ingredient.aggregate([
            { $match: baseFilter },
            {
                $addFields: {
                    // Score 1: Is it an exact match? (e.g., "ginger" == "ginger")
                    isExactMatch: {
                        $cond: [
                            { $eq: [{ $toLower: "$name" }, cleanQuery.toLowerCase()] },
                            1,
                            0
                        ]
                    },
                    // Score 2: Does it start with the query? (e.g., "ginger root")
                    isStartsWith: {
                        $cond: [
                            { $regexMatch: { input: "$name", regex: prefixRegex } },
                            1,
                            0
                        ]
                    }
                }
            },
            // Sort by Exact Match (desc), then Starts With (desc), then alphabetically
            { $sort: { isExactMatch: -1, isStartsWith: -1, name: 1 } },
            // Paginate AFTER sorting
            { $skip: skip },
            { $limit: limit },
            // Clean up temporary sorting fields and exclude embedding
            { $project: { embedding: 0, isExactMatch: 0, isStartsWith: 0 } }
        ]),
        Ingredient.countDocuments(baseFilter),
    ]);

    // --- 2️⃣ Include products if requested ---
    if (includeProducts && results.length > 0) {
        const ingredientIds = results.map((ing) => ing._id);

        const products = await Product.find({ ingredient: { $in: ingredientIds } })
            .select("-embedding")
            .lean();

        const productsByIngredient: Record<string, typeof products> = {};
        for (const p of products) {
            const key = p.ingredient?.toString();
            if (!key) continue;
            if (!productsByIngredient[key]) productsByIngredient[key] = [];
            productsByIngredient[key].push(p);
        }

        // attach products safely
        for (const ing of results) {
            const key = ing._id?.toString();
            if (!key) {
                ing.products = [];
            } else {
                ing.products = productsByIngredient[key] || [];
            }
        }
    }

    return {
        results,
        page,
        totalPages: Math.ceil(total / limit),
        total,
    };
}

// -------------------------
// Fetch multiple ingredients by IDs
// -------------------------
export async function fetchIngredientsByIds(ids: string[]): Promise<IngredientListResponse> {
    try {
        const ingredients = await Ingredient.find(
            { _id: { $in: ids } },
            { embedding: 0 } // Exclude the 'embedding' field
        ).lean<IIngredientData[]>();

        return { ingredients, total: ingredients.length };
    } catch (err: any) {
        console.error("Error fetching products by IDs:", err);
        return { ingredients: [], total: 0 };
    }
}

// -------------------------
// Add Ingredient
// -------------------------
export async function addIngredient(data: any) { // Type adjusted to accept raw frontend payload
    await dbConnect(); // Added db connection

    try {
        const embeddingResponse = await openai.embeddings.create({
            model: "gemini-embedding-001",
            input: data.name.trim(),
        });
        const queryVector = embeddingResponse.data[0].embedding;

        const ingredientData = {
            name: data.name.trim(),
            aliases: Array.isArray(data.aliases) ? data.aliases : [],
            country: Array.isArray(data.country) ? data.country : [],
            cuisine: Array.isArray(data.cuisine) ? data.cuisine : [],
            region: Array.isArray(data.region) ? data.region : [],
            flavor_profile: Array.isArray(data.flavor_profile) ? data.flavor_profile : [],
            provenance: data.provenance?.trim() || "Unknown",
            comment: data.comment?.trim(),
            pronunciation: data.pronunciation?.trim(),
            photo: data.photo?.trim(), // Fixed to match the frontend payload
            last_modified: new Date(),
            embedding: queryVector,
        };

        return await Ingredient.create(ingredientData);
    } catch (err: any) {
        console.error("Error in addIngredient service:", err);
        throw new Error(err.message || "Failed to add ingredient");
    }
}
