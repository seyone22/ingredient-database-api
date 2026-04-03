import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import { fetchProductsByIds } from "@/services/productService";
import { Product } from "@/models/Product";
import { PriceSource } from "@/models/PriceSource";

// Search products by name (Useful for Comboboxes/Autocomplete)
export async function GET(req: NextRequest) {
    await dbConnect();

    try {
        const _forceRegister = PriceSource.modelName;

        const urlParams = new URL(req.url).searchParams;
        const query = urlParams.get("query") || "";
        const page = parseInt(urlParams.get("page") || "1");
        const limit = parseInt(urlParams.get("limit") || "25");

        // Calculate how many documents to skip for pagination
        const skip = (page - 1) * limit;

        // Build the search filter
        const filter: any = {};
        if (query && query.length >= 2) {
            // Optional: Expand this to search by SKU as well
            filter.$or = [
                { name: { $regex: query, $options: "i" } },
                { sku: { $regex: query, $options: "i" } }
            ];
        }

        // 1. Fetch the paginated products
        const products = await Product.find(filter)
            .skip(skip)
            .limit(limit)
            .populate("source", "name") // Populate source to get the supermarket name
            .lean();

        // 2. Fetch the total count for the pagination UI
        const total = await Product.countDocuments(filter);

        // 3. Return the exact shape the UI expects
        return NextResponse.json({
            results: products,
            total: total,
            page: page,
            limit: limit
        });

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