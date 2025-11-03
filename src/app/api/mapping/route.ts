import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import { Product } from "@/models/Product";
import { Mapping } from "@/models/Mapping";
import { fetchProductsByIds } from "@/services/productService";

// POST: Fetch specific product IDs
export const POST = async (req: Request) => {
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
};

// GET: Fetch a random unmapped product
export const GET = async () => {
    await dbConnect();

    try {
        // Find one product that isn't mapped yet
        const mappedIds = await Mapping.distinct("product");
        const product = await Product.aggregate([
            { $match: { _id: { $nin: mappedIds } } },
            { $sample: { size: 1 } }
        ]);

        if (!product || product.length === 0) {
            return NextResponse.json({ error: "No unmapped products found" }, { status: 404 });
        }

        return NextResponse.json({ product: product[0] });
    } catch (err: any) {
        console.error("Error fetching random product:", err);
        return NextResponse.json(
            { error: "Server error", details: err.message },
            { status: 500 }
        );
    }
};
