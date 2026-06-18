import { NextRequest, NextResponse } from "next/server";
import { getIngredientById, updateIngredient, deleteIngredient } from "@/services/ingredientService";

export async function GET(
    request: NextRequest,
    { params }: { params: any }
): Promise<NextResponse> {
    try {
        // Await params for Next.js 15+ compatibility
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const includeProducts = searchParams.get("includeProducts") === "true";

        if (!id) {
            return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });
        }

        const data = await getIngredientById(id, includeProducts);

        if (!data) {
            return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
        }

        // To maintain backward compatibility with your frontend payload structure
        const { products, ...ingredient } = data;

        return NextResponse.json({
            ingredient,
            ...(includeProducts && { products: products || [] }),
        });

    } catch (err: any) {
        console.error("GET Ingredient Error:", err);
        return NextResponse.json(
            { error: "Server error", details: err.message || err },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: any }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });
        }

        const body = await req.json();
        const updated = await updateIngredient(id, body);

        if (!updated) {
            return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Updated", ingredient: updated });

    } catch (err: any) {
        console.error("PATCH Ingredient Error:", err);
        return NextResponse.json(
            { error: err.message || "Server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: any }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });
        }

        const deleted = await deleteIngredient(id);

        if (!deleted) {
            return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Deleted", ingredient: deleted });

    } catch (err: any) {
        console.error("DELETE Ingredient Error:", err);
        return NextResponse.json(
            { error: err.message || "Server error" },
            { status: 500 }
        );
    }
}