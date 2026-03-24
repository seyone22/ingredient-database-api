import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import { fetchProductsByIds } from "@/services/productService";
import { Product } from "@/models/Product";

// Search products by name (Useful for Comboboxes/Autocomplete)
export async function GET(req: NextRequest) {
    await dbConnect();

    try {
        const urlParams = new URL(req.url).searchParams;
        const query = urlParams.get("query");
        const limit = parseInt(urlParams.get("limit") || "10");

        if (!query || query.length < 2) {
            return NextResponse.json({ products: [] });
        }

        // Case-insensitive regex search
        const products = await Product.find({
            name: { $regex: query, $options: "i" }
        })
            .limit(limit)
            .populate("source")
            .lean();

        return NextResponse.json({ products });
    } catch (err: any) {
        console.error("Error searching products:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// Fetch specific products by array of IDs (Your original logic)
export async function POST(req: Request) {
    await dbConnect();

    try {
        const body = await req.json();
        const ids: string[] = body.ids;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: "'ids' must be a non-empty array in the request body" },
                { status: 400 }
            );
        }

        const { products, total } = await fetchProductsByIds(ids);

        if (products.length === 0) {
            return NextResponse.json({ error: "No products found" }, { status: 404 });
        }

        return NextResponse.json({ products, total });
    } catch (err: any) {
        console.error("Error fetching products:", err);
        return NextResponse.json(
            { error: "Server error", details: err.message },
            { status: 500 }
        );
    }
}