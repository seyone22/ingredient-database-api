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
