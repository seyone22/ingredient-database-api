import {NextResponse} from "next/server";
import dbConnect from "@/utils/dbConnect";
import {getDatabaseStats} from "@/services/metaService";

/**
 * GET /api/meta
 * Returns high-level FoodRepo statistics:
 * - ingredientCount
 * - productCount
 * - mappedProducts
 * - tagDistribution
 * - sourceDistribution
 * - growth timeline
 */
export const GET = async () => {
    await dbConnect();

    try {
        const stats = await getDatabaseStats();
        return NextResponse.json(stats, {status: 200});
    } catch (err: any) {
        console.error("Error fetching meta stats:", err);
        return NextResponse.json(
            {error: "Failed to fetch stats", details: err.message || String(err)},
            {status: 500}
        );
    }
};
