import { db } from "@/utils/db";
import { ingredients, products, mappings, priceSources } from "@/utils/schema";
import { sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

export interface DatabaseStats {
    totalIngredients: number;
    totalProducts: number;
    totalMappedProducts: number;

    mappingCoverage: number; // derived % mapped / total

    countries: {
        total: number;
        byCountry: Record<string, number>;
    };
    cuisines: {
        total: number;
        byCuisine: Record<string, number>;
    };
    regions: {
        total: number;
        byRegion: Record<string, number>;
    };
    flavorProfiles: {
        total: number;
        byFlavor: Record<string, number>;
    };

    topIngredients: { name: string; count: number }[];

    productsBySource: Record<string, number>;
    growth: {
        ingredients: { date: string; count: number }[];
        products: { date: string; count: number }[];
        mappings: { date: string; count: number }[];
    };

    dataCompleteness: {
        missingCountry: number;
        missingCuisine: number;
        missingRegion: number;
        missingFlavor: number;
    };
}

// ---------------------------------------------------------------------------
// Driver-agnostic helper for raw `sql` queries.
// ---------------------------------------------------------------------------
async function execRows<T = any>(query: ReturnType<typeof sql>): Promise<T[]> {
    const result: any = await db.execute(query);
    return Array.isArray(result) ? result : result.rows ?? [];
}

// ---------------------------------------------------------------------------
// Count rows grouped by element of a text[] column (replaces $unwind + $group)
// ---------------------------------------------------------------------------
async function groupByArrayColumn(
    arrayColumn: PgColumn
): Promise<{ value: string; count: number }[]> {
    return execRows<{ value: string; count: number }>(
        sql`
            SELECT elem AS value, count(*)::int AS count
            FROM ${arrayColumn.table}, unnest(${arrayColumn}) AS elem
            GROUP BY elem
            ORDER BY count DESC
        `
    );
}

// ---------------------------------------------------------------------------
// Count rows where a text[] column is null or empty
// ---------------------------------------------------------------------------
async function countMissingArray(arrayColumn: PgColumn): Promise<number> {
    const rows = await execRows<{ count: number }>(
        sql`SELECT count(*)::int AS count FROM ${arrayColumn.table} WHERE coalesce(cardinality(${arrayColumn}), 0) = 0`
    );
    return rows[0]?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Cumulative monthly growth for a table (replaces $setWindowFields)
// ---------------------------------------------------------------------------
async function getCumulativeGrowth(
    table: PgTable,
    createdAtColumn: PgColumn
): Promise<{ date: string; count: number }[]> {
    return execRows<{ date: string; count: number }>(
        sql`
            WITH monthly AS (
                SELECT date_trunc('month', ${createdAtColumn}) AS month, count(*)::int AS monthly_count
                FROM ${table}
                GROUP BY 1
            )
            SELECT
                to_char(month, 'YYYY-MM') AS date,
                sum(monthly_count) OVER (ORDER BY month)::int AS count
            FROM monthly
            ORDER BY month
        `
    );
}

/**
 * Legacy stats function for basic ingredient overviews.
 */
export async function getIngredientStats(): Promise<any> {
    const [
        [{ count: totalIngredients }],
        [{ count: totalProducts }],
        byCountryRows,
        byCuisineRows,
        byRegionRows,
        byFlavorRows,
    ] = await Promise.all([
        execRows<{ count: number }>(sql`SELECT count(*)::int AS count FROM ${ingredients}`),
        execRows<{ count: number }>(sql`SELECT count(*)::int AS count FROM ${products}`),
        groupByArrayColumn(ingredients.country),
        groupByArrayColumn(ingredients.cuisine),
        groupByArrayColumn(ingredients.region),
        groupByArrayColumn(ingredients.flavorProfile),
    ]);

    return {
        totalIngredients,
        totalProducts,
        countries: {
            total: byCountryRows.length,
            byCountry: Object.fromEntries(byCountryRows.map((c) => [c.value, c.count])),
        },
        cuisines: {
            total: byCuisineRows.length,
            byCuisine: Object.fromEntries(byCuisineRows.map((c) => [c.value, c.count])),
        },
        regions: {
            total: byRegionRows.length,
            byRegion: Object.fromEntries(byRegionRows.map((r) => [r.value, r.count])),
        },
        flavorProfiles: {
            total: byFlavorRows.length,
            byFlavor: Object.fromEntries(byFlavorRows.map((f) => [f.value, f.count])),
        },
    };
}

/**
 * Gathers high-level stats for Cook Project admin dashboard.
 * Includes cumulative growth and product mapping density.
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
    const [
        [{ count: totalIngredients }],
        [{ count: totalProducts }],
        [{ count: totalMappedProducts }],
        byCountryRows,
        byCuisineRows,
        byRegionRows,
        byFlavorRows,
        topIngredientsRows,
        sourceRows,
        ingredientGrowth,
        productGrowth,
        mappingGrowth,
        missingCountry,
        missingCuisine,
        missingRegion,
        missingFlavor,
    ] = await Promise.all([
        execRows<{ count: number }>(sql`SELECT count(*)::int AS count FROM ${ingredients}`),
        execRows<{ count: number }>(sql`SELECT count(*)::int AS count FROM ${products}`),

        // Ensure distinct product counting just in case a product has multiple mappings
        execRows<{ count: number }>(sql`SELECT count(distinct ${mappings.productId})::int AS count FROM ${mappings}`),

        groupByArrayColumn(ingredients.country),
        groupByArrayColumn(ingredients.cuisine),
        groupByArrayColumn(ingredients.region),
        groupByArrayColumn(ingredients.flavorProfile),

        // Top 10 most-matched ingredients (Safely using Drizzle column injection)
        execRows<{ name: string; count: number }>(
            sql`
                SELECT i.${ingredients.name} AS name, counts.count AS count
                FROM (
                         SELECT elem AS ingredient_id, count(*)::int AS count
                         FROM ${mappings}, unnest(${mappings.matchedIngredients}) AS elem
                         GROUP BY elem
                         ORDER BY count DESC
                         LIMIT 10
                     ) AS counts
                         JOIN ${ingredients} AS i ON i.${ingredients.id} = counts.ingredient_id
                ORDER BY counts.count DESC
            `
        ),

        // Products grouped by source name (Safely using Drizzle column injection)
        execRows<{ name: string; count: number }>(
            sql`
                SELECT ps.${priceSources.name} AS name, count(*)::int AS count
                FROM ${products} AS p
                         JOIN ${priceSources} AS ps ON ps.${priceSources.id} = p.${products.sourceId}
                GROUP BY ps.${priceSources.name}
                ORDER BY count DESC
            `
        ),

        getCumulativeGrowth(ingredients, ingredients.createdAt),
        getCumulativeGrowth(products, products.createdAt),
        getCumulativeGrowth(mappings, mappings.createdAt),

        countMissingArray(ingredients.country),
        countMissingArray(ingredients.cuisine),
        countMissingArray(ingredients.region),
        countMissingArray(ingredients.flavorProfile),
    ]);

    const mappingCoverage = totalProducts > 0 ? (totalMappedProducts / totalProducts) * 100 : 0;

    return {
        totalIngredients,
        totalProducts,
        totalMappedProducts,
        mappingCoverage,

        countries: {
            total: byCountryRows.length,
            byCountry: Object.fromEntries(byCountryRows.map((c) => [c.value, c.count])),
        },
        cuisines: {
            total: byCuisineRows.length,
            byCuisine: Object.fromEntries(byCuisineRows.map((c) => [c.value, c.count])),
        },
        regions: {
            total: byRegionRows.length,
            byRegion: Object.fromEntries(byRegionRows.map((r) => [r.value, r.count])),
        },
        flavorProfiles: {
            total: byFlavorRows.length,
            byFlavor: Object.fromEntries(byFlavorRows.map((f) => [f.value, f.count])),
        },

        topIngredients: topIngredientsRows.map((i) => ({ name: i.name, count: i.count })),
        productsBySource: Object.fromEntries(sourceRows.map((s) => [s.name, s.count])),
        growth: {
            ingredients: ingredientGrowth,
            products: productGrowth,
            mappings: mappingGrowth,
        },
        dataCompleteness: {
            missingCountry,
            missingCuisine,
            missingRegion,
            missingFlavor,
        },
    };
}