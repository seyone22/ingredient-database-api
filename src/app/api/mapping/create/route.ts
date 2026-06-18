import { NextRequest, NextResponse } from "next/server";
import { createManualMapping } from "@/services/mappingService";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { productId, ingredientId } = body;

        if (!productId || !ingredientId) {
            return NextResponse.json(
                { error: "productId and ingredientId are required" },
                { status: 400 }
            );
        }

        // Delegate to the service
        const result = await createManualMapping(productId, ingredientId);

        return NextResponse.json(
            { message: "Mapping created", mapping: result },
            { status: 201 }
        );

    } catch (err: any) {
        console.error("Mapping Route Error:", err);

        // Return 400 for logic/validation errors, or 500 for system crashes
        const status = (err.message === "Product not found" || err.message === "Mapping already exists for this product")
            ? 400
            : 500;

        return NextResponse.json(
            { error: err.message || "Server error" },
            { status }
        );
    }
}