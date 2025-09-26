// app/api/ingredients/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import { Ingredient } from "@/models/Ingredient";

export const GET = async (req: Request) => {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();

    if (!query) {
        return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    try {
        // Case-insensitive partial match
        const ingredient = await Ingredient.findOne({ name: { $regex: query, $options: "i" } });
        if (!ingredient) {
            return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
        }
        return NextResponse.json(ingredient);
    } catch (err: any) {
        return NextResponse.json({ error: "Server error", details: err.message || err }, { status: 500 });
    }
};
