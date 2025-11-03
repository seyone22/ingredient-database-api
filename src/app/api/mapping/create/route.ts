import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import { Mapping } from "@/models/Mapping";
import { Product } from "@/models/Product";

export const POST = async (req: Request) => {
    await dbConnect();

    try {
        const body = await req.json();
        const { productId, ingredientId } = body;

        if (!productId || !ingredientId) {
            return NextResponse.json(
                { error: "productId and ingredientId are required" },
                { status: 400 }
            );
        }

        const product = await Product.findById(productId);
        if (!product) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        const existing = await Mapping.findOne({ product: productId });
        if (existing) {
            return NextResponse.json(
                { error: "Mapping already exists for this product" },
                { status: 400 }
            );
        }

        const mapping = await Mapping.create({
            product: productId,
            matchedIngredients: [ingredientId],
            method: "manual",
            confidence: 1,
            createdAt: new Date(),
        });

        return NextResponse.json(
            { message: "Mapping created", mapping },
            { status: 201 }
        );
    } catch (err: any) {
        console.error("Error creating mapping:", err);
        return NextResponse.json(
            { error: "Server error", details: err.message },
            { status: 500 }
        );
    }
};
