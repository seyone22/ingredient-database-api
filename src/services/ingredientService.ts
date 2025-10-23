import { Ingredient, IIngredientData } from "@/models/Ingredient";
import OpenAI from "openai";
import { QueryEmbedding } from "@/models/QueryEmbedding";
import {Product} from "@/models/Product";

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

// -------------------------
// Gemini client
// -------------------------
const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

// -------------------------
// Vector Search with Pagination & Products
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
        autosuggest = false,
    }: SearchOptions
): Promise<IngredientSearchResponse> {
    if (!query.trim()) {
        return { results: [], page: 1, totalPages: 0, total: 0 };
    }

    const skip = (page - 1) * limit;

    // -------------------------
    // 1️⃣ Get query embedding (cache if possible)
    // -------------------------
    let cached = await QueryEmbedding.findOne({ query: query.trim() });
    let queryVector: number[];

    if (cached) {
        queryVector = cached.embedding;
    } else {
        const embeddingResponse = await openai.embeddings.create({
            model: "gemini-embedding-001",
            input: query,
        });
        queryVector = embeddingResponse.data[0].embedding;

        await QueryEmbedding.create({ query: query.trim(), embedding: queryVector });
    }

    // -------------------------
    // 2️⃣ Structured filters
    // -------------------------
    const filters: any = {};
    if (country) filters.country = country;
    if (cuisine) filters.cuisine = cuisine;
    if (region) filters.region = region;
    if (flavor) filters.flavor_profile = flavor;

    // -------------------------
    // 3️⃣ Vector search pipeline
    // -------------------------
    const numCandidates = Math.max(page * limit * 2, 1000); // fetch enough candidates

    // Pipeline for paginated results
    const resultsPipeline: any[] = [
        {
            $vectorSearch: {
                index: "vector_index",
                path: "embedding",
                queryVector,
                numCandidates,
                limit: limit,
            },
        },
        { $match: filters },
        { $skip: skip },
        { $limit: limit },
        { $project: { embedding: 0 } }, // hide embeddings
    ];

    const results = await Ingredient.aggregate(resultsPipeline);

    // -------------------------
    // 4️⃣ Calculate total matching documents
    // -------------------------
    const totalPipeline: any[] = [
        {
            $vectorSearch: {
                index: "vector_index",
                path: "embedding",
                queryVector,
                numCandidates: 10000, // high enough to cover most matches
            },
        },
        { $match: filters },
        { $count: "total" },
    ];

    const totalResult = await Ingredient.aggregate(totalPipeline);
    const total = totalResult[0]?.total || results.length;

    // -------------------------
    // 5️⃣ Include related products if requested
    // -------------------------
    if (includeProducts && results.length > 0) {
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

        results.forEach((r: any) => {
            const products = productMap.get(r._id.toString());
            if (products) r.products = products;
        });
    }

    // -------------------------
    // 6️⃣ Return final response
    // -------------------------
    return {
        results,
        page,
        total,
        totalPages: Math.ceil(total / limit),
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
    }: SearchOptions
): Promise<IngredientSearchResponse> {
    if (!query.trim()) {
        return { results: [], page: 1, totalPages: 0, total: 0 };
    }

    const skip = (page - 1) * limit;

    const prefixRegex = new RegExp(`^${query}`, "i");
    const containsRegex = new RegExp(query, "i");

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

    // ✅ Exclude embedding explicitly
    const [results, total] = await Promise.all([
        Ingredient.find(baseFilter)
            .skip(skip)
            .limit(limit)
            .select("-embedding"), // exclude vector field
        Ingredient.countDocuments(baseFilter),
    ]);

    return {
        results,
        page,
        totalPages: Math.ceil(total / limit),
        total,
    };
}

// -------------------------
// Add Ingredient
// -------------------------
export async function addIngredient(data: IIngredientData) {
    try {
        const embeddingResponse = await openai.embeddings.create({
            model: "gemini-embedding-001",
            input: data.name.trim(),
        });
        const queryVector = embeddingResponse.data[0].embedding;

        const ingredientData = {
            name: data.name.trim(),
            aliases: Array.isArray(data.aliases) ? data.aliases.map((a) => a.trim()) : [],
            country: Array.isArray(data.country) ? data.country.map((c) => c.trim()) : [],
            cuisine: Array.isArray(data.cuisine) ? data.cuisine.map((c) => c.trim()) : [],
            region: Array.isArray(data.region) ? data.region.map((r) => r.trim()) : [],
            flavor_profile: Array.isArray(data.flavor_profile) ? data.flavor_profile.map((f) => f.trim()) : [],
            provenance: data.provenance?.trim() || "Unknown",
            comment: data.comment?.trim(),
            pronunciation: data.pronunciation?.trim(),
            photo: data.image?.url?.trim(),
            last_modified: new Date(),
            embedding: queryVector,
        };

        return await Ingredient.create(ingredientData);
    } catch (err: any) {
        console.error("Error in addIngredient service:", err);
        throw new Error(err.message || "Failed to add ingredient");
    }
}
