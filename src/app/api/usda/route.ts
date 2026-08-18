import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { usdaFoods } from "@/utils/schema";
import { ilike, sql, desc } from "drizzle-orm";

/**
 * GET /api/usda
 * Search USDA reference foods by description/name.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() || "";
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Boost exact starts-with matches to the top
    const isStartsWith = sql<number>`CASE WHEN ${usdaFoods.description} ILIKE ${query + "%"} THEN 1 ELSE 0 END`;

    const results = await db
      .select({
        fdcId: usdaFoods.fdcId,
        description: usdaFoods.description,
        foodCategory: usdaFoods.foodCategory,
        caloriesKcal: usdaFoods.caloriesKcal,
        proteinG: usdaFoods.proteinG,
        fatG: usdaFoods.fatG,
        carbsG: usdaFoods.carbsG,
        fiberG: usdaFoods.fiberG,
        sodiumMg: usdaFoods.sodiumMg,
        sugarG: usdaFoods.sugarG,
      })
      .from(usdaFoods)
      .where(ilike(usdaFoods.description, `%${query}%`))
      .orderBy(desc(isStartsWith), usdaFoods.description)
      .limit(limit);

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("USDA Search Error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message || err },
      { status: 500 },
    );
  }
}
