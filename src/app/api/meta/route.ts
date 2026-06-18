import { NextRequest, NextResponse } from "next/server";
import { getIngredientStats } from "@/services/metaService";

export async function GET(req: NextRequest) {
    try {
        const stats = await getIngredientStats();
        return NextResponse.json(stats, { status: 200 });
    } catch (err: any) {
        console.error("Error fetching ingredient stats:", err);
        return NextResponse.json(
            { error: "Failed to fetch stats", details: err.message || String(err) },
            { status: 500 }
        );
    }
}