import { NextRequest, NextResponse } from "next/server";
import { fetchProductsByIds, searchProducts } from "@/services/productService";

// Search products by name or SKU
export async function GET(req: NextRequest) {
    try {
        const urlParams = new URL(req.url).searchParams;
        const query = urlParams.get("query") || "";
        const page = parseInt(urlParams.get("page") || "1", 10);
        const limit = parseInt(urlParams.get("limit") || "25", 10);

        const { products, total } = await searchProducts(query, page, limit);

        return NextResponse.json({
            results: products,
            total,
            page,
            limit
        });
    } catch (err: any) {
        console.error("Error searching products:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// Fetch specific products by array of IDs
export async function POST(req: Request) {
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