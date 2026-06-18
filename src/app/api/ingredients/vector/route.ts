import { NextRequest, NextResponse } from "next/server";
import { searchIngredientsVector } from "@/services/ingredientService";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() || "";

    // Ensure safe pagination parsing
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const autosuggest = searchParams.get("autosuggest") === "true";

    // Optional structured filters
    const country = searchParams.get("country");
    const cuisine = searchParams.get("cuisine");
    const region = searchParams.get("region");
    const flavor = searchParams.get("flavor");
    const includeProducts = searchParams.get("includeProducts") === "true";

    if (!query) {
        return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    try {
        const data = await searchIngredientsVector(query, {
            page: isNaN(page) ? 1 : page,
            limit: isNaN(limit) ? 20 : limit,
            autosuggest,
            country,
            cuisine,
            region,
            flavor,
            includeProducts
        });

        if (!data.results || data.results.length === 0) {
            return NextResponse.json({ error: "No ingredients found" }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error("Ingredient Search Error:", err);
        return NextResponse.json(
            { error: "Server error", details: err.message || err },
            { status: 500 }
        );
    }
}