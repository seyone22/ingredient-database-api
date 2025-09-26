import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import { searchIngredients } from "@/services/ingredientService";

export const GET = async (req: Request) => {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!query) {
        return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    try {
        const data = await searchIngredients(query, page, limit);

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
