import { auditLogs, ingredients } from "@/utils/schema";
import { db } from "@/utils/db";
import { eq } from "drizzle-orm";
import { toPgId } from "@/utils/uuid";

export interface ImageCandidate {
  url: string;
  author: string;
  source: string;
  score: number;
  title: string;
}

const BAD_KEYWORDS = [
  "leaf",
  "leaves",
  "tree",
  "bush",
  "inflorescence",
  "foliage",
  "branch",
  "botanical",
  "herbarium",
  "shrub",
  "wild",
  "forest",
  "grove",
  "trunk",
  "bark",
  "flower",
  "bloom",
];

const GOOD_KEYWORDS = [
  "spice",
  "seed",
  "powder",
  "pod",
  "culinary",
  "isolated",
  "bowl",
  "plate",
  "kitchen",
  "food",
  "gewuerz",
  "dry",
  "ground",
  "cooking",
  "dish",
  "recipe",
  "ingredient",
];

function scoreCulinaryImage(url: string, title: string, source: string): number {
  let score = 50;
  const text = `${url} ${title}`.toLowerCase();

  // Heavy penalty for botanical plant parts (leaves, trees, bushes)
  for (const bad of BAD_KEYWORDS) {
    if (text.includes(bad)) score -= 35;
  }

  // Bonus for culinary / spice / studio / food terms
  for (const good of GOOD_KEYWORDS) {
    if (text.includes(good)) score += 20;
  }

  // Source weightings: High quality studio photography gets bonus
  if (source === "pexels" || source === "unsplash") score += 25;
  if (source === "wikimedia_commons") score += 15;
  if (source === "openfoodfacts") score += 10;
  if (source === "wikipedia_lead") score -= 10; // Wikipedia main infobox photos are frequently tree leaves/plants

  return score;
}

export async function fetchIngredientImage(
  name: string,
): Promise<{ url: string; author: string; source: string } | null> {
  const candidates: ImageCandidate[] = [];

  // ==========================================
  // SOURCE 1: PEXELS CULINARY STOCK (Highest Visual Consistency)
  // ==========================================
  if (process.env.PEXELS_API_KEY) {
    try {
      const pexelsQuery = encodeURIComponent(`${name} spice food culinary`);
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${pexelsQuery}&per_page=3&orientation=landscape`,
        {
          headers: { Authorization: process.env.PEXELS_API_KEY },
        },
      );

      if (res.ok) {
        const data = await res.json();
        for (const photo of data.photos || []) {
          if (photo?.src?.large) {
            const title = photo.alt || `${name} food photo`;
            const score = scoreCulinaryImage(photo.src.large, title, "pexels");
            candidates.push({
              url: photo.src.large,
              author: `<a href="${photo.photographer_url}" target="_blank">${photo.photographer} on Pexels</a>`,
              source: "pexels",
              score,
              title,
            });
          }
        }
      }
    } catch (err) {
      console.warn(`Pexels fetch failed for ${name}`);
    }
  }

  // ==========================================
  // SOURCE 2: UNSPLASH CULINARY STOCK
  // ==========================================
  if (process.env.UNSPLASH_ACCESS_KEY) {
    try {
      const query = encodeURIComponent(`${name} food ingredient`);
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=3&client_id=${process.env.UNSPLASH_ACCESS_KEY}`,
      );
      if (res.ok) {
        const data = await res.json();
        for (const photo of data.results || []) {
          if (photo?.urls?.regular) {
            const title = photo.alt_description || `${name} food`;
            const score = scoreCulinaryImage(photo.urls.regular, title, "unsplash");
            candidates.push({
              url: photo.urls.regular,
              author: `${photo.user?.name} on Unsplash`,
              source: "unsplash",
              score,
              title,
            });
          }
        }
      }
    } catch (err) {
      console.warn(`Unsplash fetch failed for ${name}`);
    }
  }

  // ==========================================
  // SOURCE 3: WIKIMEDIA COMMONS CULINARY SEARCH
  // ==========================================
  try {
    const query = encodeURIComponent(`${name} spice food culinary isolated`);
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrnamespace=6&gsrlimit=4&prop=imageinfo&iiprop=url|user&format=json`;
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "FoodRepoBot/1.0" },
    });

    if (res.ok) {
      const data = await res.json();
      const pages = data.query?.pages || {};
      for (const key of Object.keys(pages)) {
        const info = pages[key]?.imageinfo?.[0];
        const pageTitle = pages[key]?.title || "";
        if (info?.url) {
          const score = scoreCulinaryImage(info.url, pageTitle, "wikimedia_commons");
          candidates.push({
            url: info.url,
            author: info.user || "Wikimedia Commons",
            source: "wikimedia_commons",
            score,
            title: pageTitle,
          });
        }
      }
    }
  } catch (err) {
    console.warn(`Wikimedia Commons search failed for ${name}`);
  }

  // ==========================================
  // SOURCE 4: OPEN FOOD FACTS REST API
  // ==========================================
  try {
    const query = encodeURIComponent(name);
    const apiUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=2`;
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "FoodRepoBot/1.0 - Open Food Facts" },
    });

    if (res.ok) {
      const data = await res.json();
      for (const product of data.products || []) {
        const imgUrl = product?.image_front_url || product?.image_url;
        if (imgUrl) {
          const title = product.product_name || name;
          const score = scoreCulinaryImage(imgUrl, title, "openfoodfacts");
          candidates.push({
            url: imgUrl,
            author: `Open Food Facts (${title})`,
            source: "openfoodfacts",
            score,
            title,
          });
        }
      }
    }
  } catch (err) {
    console.warn(`Open Food Facts search failed for ${name}`);
  }

  // Filter out candidates with score < 20 (botanical leaf penalty filter)
  const validCandidates = candidates.filter((c) => c.score >= 20);

  if (validCandidates.length === 0) {
    return null;
  }

  // Pick the highest scoring candidate
  validCandidates.sort((a, b) => b.score - a.score);
  const best = validCandidates[0];

  return {
    url: best.url,
    author: best.author,
    source: best.source,
  };
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
      tag: "IMAGE_WATERFALL_CULINARY_SCORED",
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
          message: `Culinary scoring waterfall exhausted. No suitable food photo found for "${ingredient.name}".`,
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
        message: `Mapped high-score culinary image via ${imageResult.source}`,
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
