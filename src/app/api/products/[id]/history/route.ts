import { NextRequest, NextResponse } from "next/server";
import { getProductPriceHistory } from "@/services/productService";

export async function GET(
    req: NextRequest,
    { params }: { params: any }
) {
    try {
        // Await params for Next.js 15+ compatibility
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
        }

        const chartData = await getProductPriceHistory(id);

        return NextResponse.json({ history: chartData });

    } catch (err: any) {
        console.error("Error fetching price history:", err);
        return NextResponse.json(
            { error: "Server error", details: err.message || String(err) },
            { status: 500 }
        );
    }
}