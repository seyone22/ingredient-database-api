import { Ingredient, IIngredientData } from "@/models/Ingredient";
import OpenAI from "openai";
import { QueryEmbedding } from "@/models/QueryEmbedding";

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
}

// -------------------------
// Gemini client
// -------------------------
const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

// -------------------------
// Vector Search
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
        };

        return await Ingredient.create(ingredientData);
    } catch (err: any) {
        console.error("Error in addIngredient service:", err);
        throw new Error(err.message || "Failed to add ingredient");
    }
}
