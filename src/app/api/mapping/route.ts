import { NextRequest, NextResponse } from "next/server";
import { fetchProductsByIds, getRandomUnmappedProduct } from "@/services/productService";

// POST: Fetch specific product IDs
export async function POST(req: NextRequest) {
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

// GET: Fetch a random unmapped product
export async function GET(req: NextRequest) {
    try {
        // Delegate the complex relational logic to our service
        const { product } = await getRandomUnmappedProduct();

        if (!product) {
            return NextResponse.json(
                { error: "No unmapped products found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ product });
    } catch (err: any) {
        console.error("Error fetching random product:", err);
        return NextResponse.json(
            { error: "Server error", details: err.message },
            { status: 500 }
        );
    }
}