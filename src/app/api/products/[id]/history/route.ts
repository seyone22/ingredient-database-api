import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import { PriceHistory } from "@/models/PriceHistory";

export async function GET(
    req: NextRequest,
    { params }: { params: any }
) {
    await dbConnect();
    const productId = (await params).id;

    try {
        // Fetch history, sorted oldest to newest (better for drawing charts)
        const history = await PriceHistory.find({ product: productId })
            .sort({ timestamp: 1 })
            .lean();

        // Format the data specifically for Recharts on the frontend
        const chartData = history.map(h => ({
            date: new Date(h.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            price: h.price,
            fullDate: h.timestamp // Keep raw date for tooltips if needed
        }));

        return NextResponse.json({ history: chartData });
    } catch (err: any) {
        console.error("Error fetching price history:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}