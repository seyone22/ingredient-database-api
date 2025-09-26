import { Ingredient, IIngredientData } from "@/models/Ingredient";

export interface IngredientSearchResponse {
    results: IIngredientData[];
    page: number;
    totalPages: number;
    total: number;
}

export async function searchIngredients(
    query: string,
    page: number = 1,
    limit: number = 20
): Promise<IngredientSearchResponse> {
    if (!query.trim()) {
        return { results: [], page: 1, totalPages: 0, total: 0 };
    }

    const skip = (page - 1) * limit;

    // Case-insensitive search on name or aliases
    const filter = {
        $or: [
            { name: { $regex: query, $options: "i" } },
            { aliases: { $regex: query, $options: "i" } }
        ]
    };

    const [results, total] = await Promise.all([
        Ingredient.find(filter).skip(skip).limit(limit),
        Ingredient.countDocuments(filter)
    ]);

    return {
        results,
        page,
        totalPages: Math.ceil(total / limit),
        total
    };
}


export async function contributeIngredient(ingredient: IIngredientData) {
    try {
        const res = await fetch("/api/ingredients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ingredient),
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to add ingredient");
        }

        return await res.json();
    } catch (err) {
        console.error("Error contributing ingredient:", err);
        throw err;
    }
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
            photo: data.photo?.trim(),
            last_modified: new Date(),
        };

        const created = await Ingredient.create(ingredientData);
        return created;
    } catch (err: any) {
        console.error("Error in addIngredient service:", err);
        throw new Error(err.message || "Failed to add ingredient");
    }
}