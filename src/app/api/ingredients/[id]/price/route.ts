import { NextRequest, NextResponse } from "next/server";
import { getIngredientPrices } from "@/services/ingredientService";

export async function GET(
    request: NextRequest,
    { params }: { params: any }
) {
    try {
        // Await params if you are on Next.js 15+
        const ingredientId = (await params).id;

        const data = await getIngredientPrices(ingredientId);

        if (!data) {
            return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
        }

        return NextResponse.json(data);

    } catch (err: any) {
        console.error("Fetch Ingredient Prices Error:", err);
        return NextResponse.json(
            { error: "Failed to fetch ingredient prices", details: err.message },
            { status: 500 }
        );
    }
}