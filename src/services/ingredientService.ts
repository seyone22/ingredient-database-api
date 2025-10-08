import { Ingredient, IIngredientData } from "@/models/Ingredient";

export interface IngredientSearchResponse {
    results: IIngredientData[];
    page: number;
    totalPages: number;
    total: number;
}

interface SearchOptions {
    page?: number;
    limit?: number;
    autosuggest?: boolean;
    country?: string | null;
    cuisine?: string | null;
    region?: string | null;
    flavor?: string | null;
}

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

    // Prefix-first regex (better for autosuggest)
    const prefixRegex = new RegExp(`^${query}`, "i");
    // Fallback substring regex
    const containsRegex = new RegExp(query, "i");

    let baseFilter: any = {
        $or: [
            { name: autosuggest ? prefixRegex : containsRegex },
            { aliases: autosuggest ? prefixRegex : containsRegex }
        ]
    };

    // Apply structured filters if provided
    if (country) baseFilter.country = country;
    if (cuisine) baseFilter.cuisine = cuisine;
    if (region) baseFilter.region = region;
    if (flavor) baseFilter.flavor_profile = flavor;

    const [results, total] = await Promise.all([
        Ingredient.find(baseFilter).skip(skip).limit(limit),
        Ingredient.countDocuments(baseFilter)
    ]);

    return {
        results,
        page,
        totalPages: Math.ceil(total / limit),
        total
    };
}

export async function addIngredient(data: IIngredientData) {
    try {
        const ingredientData = {
            name: data.name.trim(),
            aliases: Array.isArray(data.aliases) ? data.aliases.map(a => a.trim()) : [],
            country: Array.isArray(data.country) ? data.country.map(c => c.trim()) : [],
            cuisine: Array.isArray(data.cuisine) ? data.cuisine.map(c => c.trim()) : [],
            region: Array.isArray(data.region) ? data.region.map(r => r.trim()) : [],
            flavor_profile: Array.isArray(data.flavor_profile) ? data.flavor_profile.map(f => f.trim()) : [],
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
