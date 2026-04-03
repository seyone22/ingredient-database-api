"use server";

import dbConnect from "@/utils/dbConnect";
// Adjust the import path below to where your StockHistory model is exported
import { StockHistory } from "@/models/StockHistory";
import { PriceSource } from "@/models/PriceSource";

/**
 * Fetches the last 30 days of sales history for a specific product.
 */
export async function getProductSalesHistory(productId: string): Promise<number[]> {
    try {
        await dbConnect();

        // 1. Fetch recent history, sorted by newest first
        const historyData = await StockHistory.find({ product: productId })
            .sort({ timestamp: -1 })
            .limit(30)
            .select("averageDailySales timestamp")
            .lean();

        if (!historyData || historyData.length === 0) {
            return [];
        }

        // 2. Reverse the array so it reads chronologically (left to right = oldest to newest)
        const chronological = historyData.reverse();

        // 3. Extract the numbers. Fallback to 0 if averageDailySales wasn't recorded.
        return chronological.map((record: any) => record.averageDailySales || 0);

    } catch (error) {
        console.error(`[Cook Project] Error fetching history for ${productId}:`, error);
        return [];
    }
}