"use server";

import { db } from "@/utils/db";
import { stockHistories } from "@/utils/schema";
import { eq, desc } from "drizzle-orm";
import { toPgId } from "@/utils/uuid";

/**
 * Fetches the last 30 days of sales history for a specific product.
 */
export async function getProductSalesHistory(productId: string): Promise<number[]> {
    try {
        // Ensure the ID is formatted as a Postgres UUID
        const pgProductId = toPgId(productId);

        // 1. Fetch recent history, sorted by newest first
        const historyData = await db
            .select({
                averageDailySales: stockHistories.averageDailySales,
            })
            .from(stockHistories)
            .where(eq(stockHistories.productId, pgProductId))
            .orderBy(desc(stockHistories.timestamp))
            .limit(30);

        if (!historyData || historyData.length === 0) {
            return [];
        }

        // 2. Reverse the array so it reads chronologically (left to right = oldest to newest)
        const chronological = historyData.reverse();

        // 3. Extract the numbers. Fallback to 0 if averageDailySales wasn't recorded.
        // Drizzle returns null for empty nullable columns, so we use ?? 0
        return chronological.map((record) => record.averageDailySales ?? 0);

    } catch (error) {
        console.error(`[Cook Project] Error fetching history for ${productId}:`, error);
        return [];
    }
}