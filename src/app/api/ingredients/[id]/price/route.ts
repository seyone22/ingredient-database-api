import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Ingredient from "@/models/Ingredient";
import { Mapping } from "@/models/Mapping";
// We import these so Mongoose registers the schemas for the .populate() chain
import "@/models/Product";
import "@/models/PriceSource";

export async function GET(
    request: NextRequest,
    { params }: { params: any }
): Promise<NextResponse> {
    await dbConnect();

    // Await params if you are on Next.js 15+
    const ingredientId = (await params).id;

    // 1️⃣ Find the core ingredient
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) {
        return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    }

    // 2️⃣ Query the Mapping collection for this ingredient
    // We look for any mapping where this ingredient's ID is inside the matchedIngredients array.
    const mappings = await Mapping.find({
        matchedIngredients: ingredient._id
    }).populate({
        path: "product",
        populate: {
            path: "source", // Assuming 'source' is the ref on your Product schema
        }
    });

    if (mappings.length === 0) {
        return NextResponse.json({
            ingredient: ingredient.name,
            prices: [],
            message: "No verified products mapped yet"
        });
    }

    // 3️⃣ Extract and filter the products
    // We map over the junction documents to extract the actual product objects.
    // The filter(Boolean) protects us against orphaned mappings (where a product was deleted).
    const mappedProducts = mappings
        .map((mapping: any) => mapping.product)
        .filter(Boolean);

    return NextResponse.json({
        ingredient: ingredient.name,
        prices: mappedProducts
    });
}