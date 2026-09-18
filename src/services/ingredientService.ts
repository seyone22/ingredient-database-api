import { GoogleGenAI } from "@google/genai";
import { db } from "@/utils/db"; // <-- adjust to your actual Drizzle db instance
import {
  ingredients,
  mappings,
  priceHistories,
  priceSources,
  products,
  queryEmbeddings,
  usdaFoods,
} from "@/utils/schema"; // <-- adjust path
import { and, asc, cosineDistance, desc, eq, inArray, sql } from "drizzle-orm";
import { toPgId } from "@/utils/uuid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type IngredientRow = typeof ingredients.$inferSelect;
type ProductRow = typeof products.$inferSelect;
export type IIngredientData = Omit<IngredientRow, "embedding"> & {
  products?: ProductRow[];
};

export interface IngredientSearchResponse {
  results: IIngredientData[];
  page: number;
  totalPages: number;
  total: number;
}

interface SearchOptions {
  page?: number;
  limit?: number;
  country?: string | null;
  autosuggest?: boolean;
  cuisine?: string | null;
  region?: string | null;
  flavor?: string | null;
  includeProducts?: boolean;
}

export interface IngredientListResponse {
  ingredients: IIngredientData[];
  total: number;
}

// ---------------------------------------------------------------------------
// Gemini client (replaces the OpenAI-compatible embeddings wrapper)
// ---------------------------------------------------------------------------
const EMBEDDING_DIMENSIONS = 1536; // must match ingredients.embedding AND queryEmbeddings.embedding
const EMBEDDING_MODEL = "gemini-embedding-001";

const ai = new GoogleGenAI({}); // reads GEMINI_API_KEY from env, same var name you already use

async function embedText(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  return response.embeddings![0].values as number[];
}

// ---------------------------------------------------------------------------
// Shared column selection — always exclude the embedding vector from results
// ---------------------------------------------------------------------------
const ingredientColumns = {
  id: ingredients.id,
  name: ingredients.name,
  aliases: ingredients.aliases,
  country: ingredients.country,
  cuisine: ingredients.cuisine,
  region: ingredients.region,
  flavorProfile: ingredients.flavorProfile,
  dietaryFlags: ingredients.dietaryFlags,
  provenance: ingredients.provenance,
  comment: ingredients.comment,
  pronunciation: ingredients.pronunciation,
  image: ingredients.image,
  partOf: ingredients.partOf,
  derivatives: ingredients.derivatives,
  varieties: ingredients.varieties,
  usedIn: ingredients.usedIn,
  substitutes: ingredients.substitutes,
  pairsWith: ingredients.pairsWith,
  fdcId: ingredients.fdcId,
  lastModified: ingredients.lastModified,
  createdAt: ingredients.createdAt,
  updatedAt: ingredients.updatedAt,
};

// ---------------------------------------------------------------------------
// Attach related products via the `mappings` table
// ---------------------------------------------------------------------------
// Helper: recursively find all descendant ingredient IDs via varieties and part_of
// ---------------------------------------------------------------------------
export async function getDescendantIngredientIds(rootId: string): Promise<string[]> {
  const visited = new Set<string>();
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const current = await db.query.ingredients.findFirst({
      where: eq(ingredients.id, currentId),
      columns: { id: true, name: true, varieties: true },
    });

    if (!current) continue;

    // 1. Traverse varieties by name
    if (current.varieties && current.varieties.length > 0) {
      const varietyNames = current.varieties
        .filter(Boolean)
        .map((v) => v.trim().toLowerCase());
      if (varietyNames.length > 0) {
        const childRows = await db
          .select({ id: ingredients.id })
          .from(ingredients)
          .where(inArray(sql`LOWER(${ingredients.name})`, varietyNames));

        for (const child of childRows) {
          if (!visited.has(child.id)) {
            queue.push(child.id);
          }
        }
      }
    }

    // 2. Traverse ingredients where part_of contains current ingredient's name
    const currentNameLower = current.name.trim().toLowerCase();
    const partOfChildren = await db
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(
        sql`EXISTS (SELECT 1 FROM unnest(${ingredients.partOf}) p WHERE LOWER(p) = ${currentNameLower})`,
      );

    for (const child of partOfChildren) {
      if (!visited.has(child.id)) {
        queue.push(child.id);
      }
    }
  }

  return Array.from(visited);
}

// ---------------------------------------------------------------------------
// Attach related products via the `mappings` table
// (Supports hierarchy: root ingredient inherits products mapped to its varieties)
// ---------------------------------------------------------------------------
async function attachProducts<T extends { id: string }>(
  rows: T[],
): Promise<(T & { products: ProductRow[] })[]> {
  if (rows.length === 0) {
    return [];
  }

  // Build a map of root ingredient ID -> all its descendant IDs (including self)
  const descendantsMap = new Map<string, string[]>();
  const allNeededIngredientIds = new Set<string>();

  for (const r of rows) {
    const descIds = await getDescendantIngredientIds(r.id);
    descendantsMap.set(r.id, descIds);
    descIds.forEach((id) => allNeededIngredientIds.add(id));
  }

  const queryIds = Array.from(allNeededIngredientIds);
  if (queryIds.length === 0) {
    return rows.map((r) => ({ ...r, products: [] }));
  }

  const rels = await db
    .select({
      matchedIngredients: mappings.matchedIngredients,
      product: products,
    })
    .from(mappings)
    .innerJoin(products, eq(products.id, mappings.productId))
    .where(
      sql`${mappings.matchedIngredients} && ARRAY[${sql.join(
        queryIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}]`,
    );

  // Group products by directly matched ingredient ID
  const directMap = new Map<string, ProductRow[]>();
  for (const rel of rels) {
    for (const ingId of rel.matchedIngredients ?? []) {
      if (!allNeededIngredientIds.has(ingId)) continue;
      const list = directMap.get(ingId) ?? [];
      list.push(rel.product);
      directMap.set(ingId, list);
    }
  }

  // For each row, collect products from all its descendants (deduplicating by product ID)
  return rows.map((r) => {
    const descIds = descendantsMap.get(r.id) ?? [r.id];
    const seenProductIds = new Set<string>();
    const rowProducts: ProductRow[] = [];

    for (const dId of descIds) {
      const prodList = directMap.get(dId) ?? [];
      for (const p of prodList) {
        if (!seenProductIds.has(p.id)) {
          seenProductIds.add(p.id);
          rowProducts.push(p);
        }
      }
    }

    return {
      ...r,
      products: rowProducts,
    };
  });
}

// ---------------------------------------------------------------------------
// Vector search (replaces $vectorSearch aggregation)
// ---------------------------------------------------------------------------
export async function searchIngredientsVector(
  query: string,
  {
    page = 1,
    limit = 20,
    country,
    cuisine,
    region,
    flavor,
    includeProducts = false,
  }: SearchOptions,
): Promise<IngredientSearchResponse> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return { results: [], page: 1, totalPages: 0, total: 0 };

  const offset = (page - 1) * limit;

  // 1. Check embedding cache
  const cached = await db
    .select({ embedding: queryEmbeddings.embedding })
    .from(queryEmbeddings)
    .where(eq(queryEmbeddings.query, cleanQuery))
    .limit(1);

  let queryVector: number[];
  if (cached.length > 0) {
    queryVector = cached[0].embedding as number[];
  } else {
    queryVector = await embedText(cleanQuery);
    await db
      .insert(queryEmbeddings)
      .values({ query: cleanQuery, embedding: queryVector });
  }

  // 2. Structured filters (array "contains" checks)
  const filters = [];
  if (country)
    filters.push(sql`${ingredients.country} @> ARRAY[
    ${country}
    ]
    ::
    text
    [
    ]`);
  if (cuisine)
    filters.push(sql`${ingredients.cuisine} @> ARRAY[
    ${cuisine}
    ]
    ::
    text
    [
    ]`);
  if (region)
    filters.push(sql`${ingredients.region} @> ARRAY[
    ${region}
    ]
    ::
    text
    [
    ]`);
  if (flavor)
    filters.push(sql`${ingredients.flavorProfile} @> ARRAY[
    ${flavor}
    ]
    ::
    text
    [
    ]`);
  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  // 3. Order by cosine similarity
  const similarity = sql<number>`1 - (
    ${cosineDistance(ingredients.embedding, queryVector)}
    )`;

  const [results, totalResult] = await Promise.all([
    db
      .select({ ...ingredientColumns, similarity })
      .from(ingredients)
      .where(whereClause)
      .orderBy(desc(similarity))
      .limit(limit)
      .offset(offset),
    db
      .select({
        value: sql<number>`count
                (*)`,
      })
      .from(ingredients)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.value ?? 0);
  const finalResults = includeProducts
    ? await attachProducts(results)
    : results;

  return {
    results: finalResults,
    page,
    totalPages: Math.ceil(total / limit) || 0,
    total,
  };
}

// ---------------------------------------------------------------------------
// Text search (regex -> ILIKE, with exact/prefix-match scoring)
// ---------------------------------------------------------------------------
export async function searchIngredients(
  query: string,
  {
    page = 1,
    limit = 20,
    autosuggest = false,
    country,
    cuisine,
    region,
    flavor,
    includeProducts = false,
  }: SearchOptions,
): Promise<IngredientSearchResponse> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return { results: [], page: 1, totalPages: 0, total: 0 };

  const offset = (page - 1) * limit;
  const pattern = autosuggest ? `${cleanQuery}%` : `%${cleanQuery}%`;

  const nameOrAliasMatch = sql`( ${ingredients.name} ILIKE ${pattern}
                                     OR EXISTS (
                                     SELECT 1 FROM unnest(${ingredients.aliases}) AS alias
                                     WHERE alias ILIKE ${pattern}
                                     ))`;

  const filters = [nameOrAliasMatch];
  if (country)
    filters.push(sql`${ingredients.country} @> ARRAY[
    ${country}
    ]
    ::
    text
    [
    ]`);
  if (cuisine)
    filters.push(sql`${ingredients.cuisine} @> ARRAY[
    ${cuisine}
    ]
    ::
    text
    [
    ]`);
  if (region)
    filters.push(sql`${ingredients.region} @> ARRAY[
    ${region}
    ]
    ::
    text
    [
    ]`);
  if (flavor)
    filters.push(sql`${ingredients.flavorProfile} @> ARRAY[
    ${flavor}
    ]
    ::
    text
    [
    ]`);
  const whereClause = and(...filters);

  const isExactMatch = sql<number>`CASE WHEN lower(
    ${ingredients.name}
    )
    =
    lower
    (
    ${cleanQuery}
    )
    THEN
    1
    ELSE
    0
    END`;
  const isStartsWith = sql<number>`CASE WHEN
    ${ingredients.name}
    ILIKE
    ${cleanQuery + "%"}
    THEN
    1
    ELSE
    0
    END`;

  const [results, totalResult] = await Promise.all([
    db
      .select(ingredientColumns)
      .from(ingredients)
      .where(whereClause)
      .orderBy(desc(isExactMatch), desc(isStartsWith), asc(ingredients.name))
      .limit(limit)
      .offset(offset),
    db
      .select({
        value: sql<number>`count
                (*)`,
      })
      .from(ingredients)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.value ?? 0);
  const finalResults =
    includeProducts && results.length > 0
      ? await attachProducts(results)
      : results;

  return {
    results: finalResults,
    page,
    totalPages: Math.ceil(total / limit) || 0,
    total,
  };
}

// ---------------------------------------------------------------------------
// Fetch multiple ingredients by id
// ---------------------------------------------------------------------------
export async function fetchIngredientsByIds(
  ids: string[],
): Promise<IngredientListResponse> {
  try {
    if (ids.length === 0) return { ingredients: [], total: 0 };

    const rows = await db
      .select(ingredientColumns)
      .from(ingredients)
      .where(inArray(ingredients.id, ids));

    return { ingredients: rows, total: rows.length };
  } catch (err: any) {
    console.error("Error fetching ingredients by IDs:", err);
    return { ingredients: [], total: 0 };
  }
}

// ---------------------------------------------------------------------------
// Add ingredient
// ---------------------------------------------------------------------------
export async function addIngredient(data: any) {
  try {
    const name = data.name?.trim();
    if (!name) throw new Error("Ingredient name is required");

    const embedding = await embedText(name);

    const [created] = await db
      .insert(ingredients)
      .values({
        name,
        aliases: Array.isArray(data.aliases) ? data.aliases : [],
        country: Array.isArray(data.country) ? data.country : [],
        cuisine: Array.isArray(data.cuisine) ? data.cuisine : [],
        region: Array.isArray(data.region) ? data.region : [],
        flavorProfile: Array.isArray(data.flavor_profile)
          ? data.flavor_profile
          : [],
        dietaryFlags: Array.isArray(data.dietary_flags)
          ? data.dietary_flags
          : [],
        provenance: data.provenance?.trim() || "MISSING",
        comment: data.comment?.trim(),
        pronunciation: data.pronunciation?.trim(),
        image: data.photo?.trim()
          ? { url: data.photo.trim(), missing: false }
          : { missing: true },
        embedding,
      })
      .returning();

    return created;
  } catch (err: any) {
    console.error("Error in addIngredient service:", err);
    throw new Error(err.message || "Failed to add ingredient");
  }
}

// -------------------------
// Fetch Ingredient Prices (Mapped Products & History)
// -------------------------
export async function getIngredientPrices(ingredientId: string) {
  const pgId = toPgId(ingredientId);

  // 1️⃣ Find the core ingredient
  const ing = await db.query.ingredients.findFirst({
    where: eq(ingredients.id, pgId),
    columns: { id: true, name: true, partOf: true },
  });

  if (!ing) return null;

  // 2️⃣ Helper function to fetch mapped products and their latest prices for an array of ingredient IDs
  const fetchProductsForIngredients = async (targetPgIds: string[]) => {
    if (!targetPgIds || targetPgIds.length === 0) return [];

    const mapped = await db
      .select({
        product: products,
        source: priceSources,
      })
      .from(mappings)
      .innerJoin(products, eq(products.id, mappings.productId))
      .leftJoin(priceSources, eq(priceSources.id, products.sourceId))
      .where(
        sql`${mappings.matchedIngredients} && ARRAY[${sql.join(
          targetPgIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}]`,
      );

    if (mapped.length === 0) return [];

    // Deduplicate mapped products by product.id
    const uniqueMappedMap = new Map<string, { product: ProductRow; source: any }>();
    for (const item of mapped) {
      if (!uniqueMappedMap.has(item.product.id)) {
        uniqueMappedMap.set(item.product.id, item);
      }
    }
    const uniqueMapped = Array.from(uniqueMappedMap.values());
    const productIds = uniqueMapped.map((m) => m.product.id);

    // Fetch the LATEST price for each product using Postgres DISTINCT ON
    const latestPrices = await db
      .selectDistinctOn([priceHistories.productId], {
        productId: priceHistories.productId,
        latestPrice: priceHistories.price,
        currency: priceHistories.currency,
        lastUpdated: priceHistories.timestamp,
      })
      .from(priceHistories)
      .where(inArray(priceHistories.productId, productIds))
      .orderBy(priceHistories.productId, desc(priceHistories.timestamp));

    const priceMap = new Map(latestPrices.map((p) => [p.productId, p]));

    return uniqueMapped.map(({ product, source }) => {
      const latestData = priceMap.get(product.id);
      return {
        ...product,
        source,
        price: latestData ? latestData.latestPrice : product.price,
        currency: latestData ? latestData.currency : product.currency || "LKR",
        lastPriceUpdate: latestData ? latestData.lastUpdated : null,
      };
    });
  };

  // Fetch products for all descendant ingredients (including self)
  const descendantIds = await getDescendantIngredientIds(pgId);
  let productsWithLatestPrices = await fetchProductsForIngredients(descendantIds);
  let resolvedFrom: { ingredient: string; relation: string } | undefined = undefined;

  // If descendant ingredients had products, note inheritance if it came from varieties
  if (productsWithLatestPrices.length > 0 && descendantIds.length > 1) {
    resolvedFrom = {
      ingredient: ing.name,
      relation: "varieties",
    };
  }

  // 3️⃣ If still no products are mapped, traverse part_of parent ingredients (fallback upward)
  // NOTE: Exclude broad meta-categories (e.g. 'fruit', 'vegetable', 'meat', 'dairy', 'spice')
  // so an unmapped specific ingredient doesn't get flooded with unrelated products from the whole category!
  const BROAD_META_CATEGORIES = new Set([
    "fruit",
    "fruits",
    "vegetable",
    "vegetables",
    "meat",
    "meats",
    "dairy",
    "spice",
    "spices",
    "grain",
    "grains",
    "seafood",
    "fish",
    "herb",
    "herbs",
    "oil",
    "sweetener",
    "beverage",
    "sauce",
  ]);

  if (productsWithLatestPrices.length === 0 && ing.partOf && ing.partOf.length > 0) {
    for (const parentName of ing.partOf) {
      const cleanParentName = parentName.trim().toLowerCase();
      if (BROAD_META_CATEGORIES.has(cleanParentName)) {
        continue;
      }

      const parentIng = await db.query.ingredients.findFirst({
        where: sql`LOWER(${ingredients.name}) = ${cleanParentName}`,
        columns: { id: true, name: true },
      });

      if (parentIng) {
        const parentDescendants = await getDescendantIngredientIds(parentIng.id);
        const parentProducts = await fetchProductsForIngredients(parentDescendants);
        if (parentProducts.length > 0) {
          productsWithLatestPrices = parentProducts;
          resolvedFrom = {
            ingredient: parentIng.name,
            relation: "part_of",
          };
          break;
        }
      }
    }
  }

  if (productsWithLatestPrices.length === 0) {
    return {
      ingredient: ing.name,
      prices: [],
      message: "No verified products mapped yet",
    };
  }

  return {
    ingredient: ing.name,
    prices: productsWithLatestPrices,
    ...(resolvedFrom && { resolvedFrom }),
  };
}

export async function getIngredientById(
  id: string,
  includeProducts: boolean = false,
) {
  const pgId = toPgId(id);

  const rows = await db
    .select(ingredientColumns)
    .from(ingredients)
    .where(eq(ingredients.id, pgId))
    .limit(1);

  if (rows.length === 0) return null;

  let ingredientData = rows[0] as any;

  if (includeProducts) {
    const withProducts = await attachProducts([ingredientData]);
    ingredientData = withProducts[0];
  }

  if (ingredientData.fdcId) {
    const nutRow = await db
      .select()
      .from(usdaFoods)
      .where(eq(usdaFoods.fdcId, ingredientData.fdcId))
      .limit(1);
    if (nutRow.length > 0) {
      ingredientData.nutrition = nutRow[0];
    }
  }

  return ingredientData;
}

export async function updateIngredient(id: string, data: any) {
  const pgId = toPgId(id);

  const [updated] = await db
    .update(ingredients)
    .set({
      ...data,
      updatedAt: new Date(), // Force an updated timestamp
    })
    .where(eq(ingredients.id, pgId))
    .returning();

  return updated || null;
}

export async function deleteIngredient(id: string) {
  const pgId = toPgId(id);

  const [deleted] = await db
    .delete(ingredients)
    .where(eq(ingredients.id, pgId))
    .returning();

  return deleted || null;
}

// -------------------------
// Top-1 Vector Matcher
// -------------------------
export async function getBestIngredientMatch(query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { match: null, confidence: 0 };
  }

  // 1️⃣ Retrieve or compute embedding
  const cached = await db
    .select({ embedding: queryEmbeddings.embedding })
    .from(queryEmbeddings)
    .where(eq(queryEmbeddings.query, cleanQuery))
    .limit(1);

  let queryVector: number[];

  if (cached.length > 0) {
    queryVector = cached[0].embedding as number[];
  } else {
    // Fallback to calling Gemini using our internal helper
    queryVector = await embedText(cleanQuery);

    // Cache it for next time
    await db.insert(queryEmbeddings).values({
      query: cleanQuery,
      embedding: queryVector,
    });
  }

  // 2️⃣ Vector search pipeline (top 1)
  // pgvector's cosine distance is 0 for exact matches and 2 for completely opposite.
  // 1 - cosineDistance gives us a standard similarity score (1 = exact, 0 = orthogonal).
  const similarity = sql<number>`1 - (${cosineDistance(ingredients.embedding, queryVector)})`;

  const results = await db
    .select({
      name: ingredients.name,
      score: similarity,
    })
    .from(ingredients)
    .orderBy(desc(similarity))
    .limit(1);

  if (results.length === 0) {
    return { match: null, confidence: 0 };
  }

  const best = results[0];

  // Clamp the confidence between 0 and 1 just in case of floating point math quirks
  const confidence = Math.min(Math.max(Number(best.score), 0), 1);

  return {
    match: best.name,
    confidence,
  };
}
