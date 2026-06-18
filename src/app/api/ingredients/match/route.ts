import { NextRequest, NextResponse } from "next/server";
import { getBestIngredientMatch } from "@/services/ingredientService";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query } = body;

        if (!query || typeof query !== "string" || !query.trim()) {
            return NextResponse.json(
                { error: "Missing or invalid 'query' field." },
                { status: 400 }
            );
        }

        // Delegate to the service layer
        const result = await getBestIngredientMatch(query);

        return NextResponse.json(result);

    } catch (err: any) {
        console.error("Error in /api/ingredients/match:", err);
        return NextResponse.json(
            { error: err.message || "Failed to match ingredient" },
            { status: 500 }
        );
    }
}