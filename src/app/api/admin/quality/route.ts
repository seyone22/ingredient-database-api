import { NextResponse } from "next/server";
import { db } from "@/utils/db";
import { ingredients, mappings } from "@/utils/schema";
import { sql, eq } from "drizzle-orm";

export async function GET() {
  try {
    const totalRes = await db.execute(sql`SELECT count(*)::int as total FROM ${ingredients};`);
    const total = (totalRes[0] as any).total || 1;

    // 1. Un-enriched metrics
    const statsRes = await db.execute(sql`
      SELECT
        count(CASE WHEN image IS NULL OR (image->>'missing')::boolean = true OR image->>'url' IS NULL THEN 1 END) as missing_image,
        count(CASE WHEN fdc_id IS NULL THEN 1 END) as missing_fdc,
        count(CASE WHEN comment IS NULL OR comment = '' THEN 1 END) as missing_comment,
        count(CASE WHEN varieties IS NULL OR cardinality(varieties) = 0 THEN 1 END) as missing_varieties,
        count(CASE WHEN aliases IS NULL OR cardinality(aliases) = 0 THEN 1 END) as missing_aliases
      FROM ${ingredients};
    `);

    const stats = statsRes[0] as any;

    // 2. Orphan Ingredients (0 mapped retail products)
    const orphanRes = await db.execute(sql`
      SELECT i.id, i.name, i.cuisine, i.region
      FROM ${ingredients} i
      LEFT JOIN ${mappings} m ON i.id = m.matched_ingredient_id
      WHERE m.id IS NULL
      LIMIT 50;
    `);

    const orphanCountRes = await db.execute(sql`
      SELECT count(DISTINCT i.id)::int as cnt
      FROM ${ingredients} i
      LEFT JOIN ${mappings} m ON i.id = m.matched_ingredient_id
      WHERE m.id IS NULL;
    `);

    const orphanCount = (orphanCountRes[0] as any).cnt || 0;

    // 3. Potential Duplicates (Simple normalized similarity heuristic)
    const duplicatesRes = await db.execute(sql`
      SELECT a.id as id1, a.name as name1, b.id as id2, b.name as name2
      FROM ${ingredients} a
      JOIN ${ingredients} b ON a.id < b.id
        AND (
          lower(a.name) = lower(b.name)
          OR lower(a.name) = lower(b.name) || 's'
          OR lower(a.name) || 's' = lower(b.name)
          OR replace(lower(a.name), '-', ' ') = replace(lower(b.name), '-', ' ')
        )
      LIMIT 25;
    `);

    const potentialDuplicates = (duplicatesRes as any[]).map((d) => ({
      item1: { id: d.id1, name: d.name1 },
      item2: { id: d.id2, name: d.name2 },
      confidence: d.name1.toLowerCase() === d.name2.toLowerCase() ? "100%" : "92%",
    }));

    // Calculate Data Health Score
    const missingImageRatio = stats.missing_image / total;
    const missingFdcRatio = stats.missing_fdc / total;
    const missingCommentRatio = stats.missing_comment / total;

    // Core fields are 100% complete, so base score is 80%, penalized by missing images/FDC/comments
    const healthScore = Math.max(0, Math.min(100, Math.round(100 - (missingImageRatio * 15 + missingFdcRatio * 10 + missingCommentRatio * 5))));

    return NextResponse.json({
      success: true,
      totalIngredients: total,
      healthScore,
      metrics: {
        missingImageCount: Number(stats.missing_image),
        missingFdcCount: Number(stats.missing_fdc),
        missingCommentCount: Number(stats.missing_comment),
        missingVarietiesCount: Number(stats.missing_varieties),
        missingAliasesCount: Number(stats.missing_aliases),
        orphanCount,
        potentialDuplicatesCount: potentialDuplicates.length,
      },
      orphanIngredients: orphanRes,
      potentialDuplicates,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
