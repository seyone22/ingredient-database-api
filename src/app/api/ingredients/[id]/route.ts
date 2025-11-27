import {NextRequest, NextResponse} from "next/server";
import dbConnect from "@/utils/dbConnect";
import { Ingredient } from "@/models/Ingredient";
import { Product } from "@/models/Product"; // make sure this exists in /models
import { Types } from "mongoose";
import {req} from "agent-base";

export async function GET(
    request: NextRequest,
    { params }: { params: any }
): Promise<NextResponse> {
    await dbConnect();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeProducts = searchParams.get("includeProducts") === "true";

    if (!Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });
    }

    try {
        // Fetch ingredient without embedding
        const ingredient = await Ingredient.findById(id).select("-embedding").lean();

        if (!ingredient) {
            return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
        }

        let products: any[] = [];
        if (includeProducts) {
            products = await Product.find({ ingredient: id }).lean();
        }

        return NextResponse.json({
            ingredient,
            ...(includeProducts && { products }),
        });
    } catch (err: any) {
        return NextResponse.json(
            { error: "Server error", details: err.message || err },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest, { params }: { params: any }) {
    await dbConnect();
    const { id } = params;
    if (!Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const updated = await Ingredient.findByIdAndUpdate(id, body, { new: true }).lean();
        if (!updated) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
        return NextResponse.json({ message: "Updated", ingredient: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: any }) {
    await dbConnect();
    const { id } = params;
    if (!Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });
    }

    try {
        const deleted = await Ingredient.findByIdAndDelete(id).lean();
        if (!deleted) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
        return NextResponse.json({ message: "Deleted", ingredient: deleted });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}