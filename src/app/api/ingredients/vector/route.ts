import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import { searchIngredientsVector, addIngredient } from "@/services/ingredientService";

export const GET = async (req: Request) => {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const autosuggest = searchParams.get("autosuggest") === "true";

    // Optional structured filters
    const country = searchParams.get("country");
    const cuisine = searchParams.get("cuisine");
    const region = searchParams.get("region");
    const flavor = searchParams.get("flavor");

    if (!query) {
        return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    try {
        const data = await searchIngredientsVector(
            query,
            { page, limit, autosuggest, country, cuisine, region, flavor }
        );

        if (!data.results || data.results.length === 0) {
            return NextResponse.json({ error: "No ingredients found" }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json(
            { error: "Server error", details: err.message || err },
            { status: 500 }
        );
    }
};