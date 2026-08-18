import { auditLogs, ingredients } from "@/utils/schema";
import { db } from "@/utils/db";
import { eq } from "drizzle-orm";
import { toPgId } from "@/utils/uuid";

export interface ImageFetchResult {
  url: string;
  author: string;
  source: string;
}

export async function fetchIngredientImage(
  name: string,
): Promise<ImageFetchResult | null> {
  const safeName = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";

  // ==========================================
  // TIER 1: WIKIDATA STRICT (The Scalpel)
  // ==========================================
  try {
    const strictQuery = `
      SELECT DISTINCT ?image WHERE {
        VALUES ?label { "${safeName}"@en }
        ?ingredient rdfs:label ?label.
        ?ingredient wdt:P31/wdt:P279* ?type.
        FILTER (?type IN (wd:Q2095, wd:Q756, wd:Q10943, wd:Q11002, wd:Q1364, wd:Q11004, wd:Q393822)) 
        ?ingredient wdt:P18 ?image.
      } LIMIT 1
    `.trim();

    const res = await fetch(WIKIDATA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/sparql+json",
        "User-Agent": "FoodRepoBot/1.0 (https://foodrepo.org)",
      },
      body: new URLSearchParams({ query: strictQuery, format: "json" }),
    });

    if (res.ok) {
      const data = await res.json();
      const url = data.results?.bindings?.[0]?.image?.value;
      if (url) {
        return { url, author: "Wikimedia Commons", source: "wikidata_strict" };
      }
    }
  } catch (err) {
    console.warn(`Tier 1 Wikidata Strict failed for ${name}`);
  }

  // ==========================================
  // TIER 2: WIKIPEDIA ARTICLE LEAD IMAGE (MediaWiki REST)
  // ==========================================
  try {
    const pageTitle = encodeURIComponent(name.replace(/ /g, "_"));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "FoodRepoBot/1.0 (https://foodrepo.org)" },
    });

    if (res.ok) {
      const data = await res.json();
      const imgUrl = data.originalimage?.source || data.thumbnail?.source;
      if (imgUrl) {
        return {
          url: imgUrl,
          author: `Wikipedia (${data.title})`,
          source: "wikipedia_lead",
        };
      }
    }
  } catch (err) {
    console.warn(`Tier 2 Wikipedia Lead failed for ${name}`);
  }

  // ==========================================
  // TIER 3: WIKIMEDIA COMMONS DIRECT SEARCH (MediaWiki API)
  // ==========================================
  try {
    const query = encodeURIComponent(`${name} food ingredient`);
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url|user&format=json`;
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "FoodRepoBot/1.0" },
    });

    if (res.ok) {
      const data = await res.json();
      const pages = data.query?.pages;
      if (pages) {
        const pageKey = Object.keys(pages)[0];
        const info = pages[pageKey]?.imageinfo?.[0];
        if (info?.url) {
          return {
            url: info.url,
            author: info.user || "Wikimedia Commons",
            source: "wikimedia_commons",
          };
        }
      }
    }
  } catch (err) {
    console.warn(`Tier 3 Wikimedia Commons failed for ${name}`);
  }

  // ==========================================
  // TIER 4: OPEN FOOD FACTS REST API
  // ==========================================
  try {
    const query = encodeURIComponent(name);
    const apiUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=1`;
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "FoodRepoBot/1.0 - Open Food Facts" },
    });

    if (res.ok) {
      const data = await res.json();
      const product = data.products?.[0];
      const imgUrl = product?.image_front_url || product?.image_url;
      if (imgUrl) {
        return {
          url: imgUrl,
          author: `Open Food Facts (${product.product_name || name})`,
          source: "openfoodfacts",
        };
      }
    }
  } catch (err) {
    console.warn(`Tier 4 Open Food Facts failed for ${name}`);
  }

  // ==========================================
  // TIER 5: UNSPLASH API (If Key Available)
  // ==========================================
  if (process.env.UNSPLASH_ACCESS_KEY) {
    try {
      const query = encodeURIComponent(`${name} food`);
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=1&client_id=${process.env.UNSPLASH_ACCESS_KEY}`,
      );
      if (res.ok) {
        const data = await res.json();
        const photo = data.results?.[0];
        if (photo?.urls?.regular) {
          return {
            url: photo.urls.regular,
            author: `${photo.user?.name} on Unsplash`,
            source: "unsplash",
          };
        }
      }
    } catch (err) {
      console.warn(`Tier 5 Unsplash failed for ${name}`);
    }
  }

  // ==========================================
  // TIER 6: PEXELS API (If Key Available)
  // ==========================================
  if (process.env.PEXELS_API_KEY) {
    try {
      const pexelsQuery = encodeURIComponent(`${name} food ingredient`);
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${pexelsQuery}&per_page=1&orientation=landscape`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY,
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        const photo = data.photos?.[0];
        if (photo?.src?.large) {
          return {
            url: photo.src.large,
            author: `<a href="${photo.photographer_url}" target="_blank">${photo.photographer} on Pexels</a>`,
            source: "pexels",
          };
        }
      }
    } catch (err) {
      console.warn(`Tier 6 Pexels failed for ${name}`);
    }
  }

  return null;
}

export async function processIngredientImage(id: string) {
  const pgId = toPgId(id);

  const ingredient = await db.query.ingredients.findFirst({
    where: eq(ingredients.id, pgId),
    columns: { id: true, name: true },
  });

  if (!ingredient) {
    throw new Error("Ingredient not found");
  }

  const [log] = await db
    .insert(auditLogs)
    .values({
      type: "SYSTEM_FETCH",
      tag: "IMAGE_WATERFALL_6_TIER",
      initiatedBy: "admin",
      status: "pending",
      metadata: {
        ingredientId: pgId,
        ingredientName: ingredient.name,
      },
    })
    .returning({ id: auditLogs.id });

  try {
    const imageResult = await fetchIngredientImage(ingredient.name);

    if (!imageResult) {
      await db
        .update(auditLogs)
        .set({
          status: "completed",
          message: `Waterfall exhausted across all 6 tiers. No image found for "${ingredient.name}".`,
          metadata: {
            ingredientId: pgId,
            ingredientName: ingredient.name,
            status: "no_results",
          },
          endTime: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(auditLogs.id, log.id));

      return null;
    }

    const [updated] = await db
      .update(ingredients)
      .set({
        image: {
          url: imageResult.url,
          author: imageResult.author,
          source: imageResult.source,
          missing: false,
        },
        updatedAt: new Date(),
      })
      .where(eq(ingredients.id, pgId))
      .returning();

    await db
      .update(auditLogs)
      .set({
        status: "completed",
        message: `Successfully mapped image via ${imageResult.source}`,
        metadata: {
          ingredientId: pgId,
          ingredientName: ingredient.name,
          sourceUsed: imageResult.source,
          imageUrl: imageResult.url,
        },
        endTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(auditLogs.id, log.id));

    return updated;
  } catch (err: any) {
    await db
      .update(auditLogs)
      .set({
        status: "failed",
        error: err.message,
        endTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(auditLogs.id, log.id));

    throw err;
  }
}
