import { NextResponse } from "next/server";
import { db } from "@/utils/db";
import { ingredients } from "@/utils/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const totalRes = await db.execute(sql`SELECT count(*)::int as total FROM ${ingredients};`);
    const total = (totalRes[0] as any).total || 1;

    // Macro-Regions distribution
    const macroRegionsRes = await db.execute(sql`
      SELECT r_name as label, count(*)::int as count
      FROM (
        SELECT unnest(region) as r_name
        FROM ${ingredients}
      ) sub
      WHERE r_name IN ('North America', 'Global', 'Western Europe', 'Southern Europe', 'East Asia', 'South Asia', 'Mediterranean', 'Central America', 'Southeast Asia', 'Middle East', 'Latin America', 'Caribbean')
      GROUP BY r_name
      ORDER BY count DESC;
    `);

    // South Asian State / Sub-Region breakdown
    const southAsianSubregionsRes = await db.execute(sql`
      SELECT r_name as label, count(*)::int as count
      FROM (
        SELECT unnest(region) as r_name
        FROM ${ingredients}
        WHERE 'South Asia' = ANY(region) OR 'India' = ANY(country)
      ) sub
      WHERE r_name NOT IN ('South Asia', 'India', 'South Asian')
      GROUP BY r_name
      ORDER BY count DESC
      LIMIT 15;
    `);

    // Top Cuisines
    const cuisinesRes = await db.execute(sql`
      SELECT c_name as label, count(*)::int as count
      FROM (
        SELECT unnest(cuisine) as c_name
        FROM ${ingredients}
      ) sub
      GROUP BY c_name
      ORDER BY count DESC
      LIMIT 15;
    `);

    // Flavor Profiles
    const flavorsRes = await db.execute(sql`
      SELECT f_name as label, count(*)::int as count
      FROM (
        SELECT unnest(flavor_profile) as f_name
        FROM ${ingredients}
      ) sub
      GROUP BY f_name
      ORDER BY count DESC
      LIMIT 15;
    `);

    // Dietary Flags
    const dietaryRes = await db.execute(sql`
      SELECT d_name as label, count(*)::int as count
      FROM (
        SELECT unnest(dietary_flags) as d_name
        FROM ${ingredients}
      ) sub
      GROUP BY d_name
      ORDER BY count DESC;
    `);

    return NextResponse.json({
      success: true,
      totalIngredients: total,
      macroRegions: macroRegionsRes,
      southAsianSubregions: southAsianSubregionsRes,
      topCuisines: cuisinesRes,
      flavorProfiles: flavorsRes,
      dietaryFlags: dietaryRes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
