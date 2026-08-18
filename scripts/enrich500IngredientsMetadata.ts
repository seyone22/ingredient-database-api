import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/utils/db";
import { ingredients } from "../src/utils/schema";
import { sql } from "drizzle-orm";
import { getDatabaseStats } from "../src/services/metaService";

const CONFIG = {
  GEMINI_MODEL: "gemini-flash-latest",
  BATCH_SIZE: 50,
  TARGET_COUNT: 500,
  CONCURRENCY: 3,
  MAX_BUDGET_USD: 2.00,
};

let totalInputTokens = 0;
let totalOutputTokens = 0;
let cumulativeCostUSD = 0;

function trackCostAndEnforceBudget(promptTokens: number, candidateTokens: number) {
  totalInputTokens += promptTokens;
  totalOutputTokens += candidateTokens;

  const inputCost = (totalInputTokens / 1_000_000) * 0.075;
  const outputCost = (totalOutputTokens / 1_000_000) * 0.30;
  cumulativeCostUSD = inputCost + outputCost;

  if (cumulativeCostUSD >= CONFIG.MAX_BUDGET_USD) {
    console.error(`\n🚨 BUDGET CIRCUIT BREAKER TRIGGERED! Cost reached $${cumulativeCostUSD.toFixed(4)} USD (Limit: $${CONFIG.MAX_BUDGET_USD.toFixed(2)} USD). Stopping execution.`);
    process.exit(1);
  }
}

function toSqlArray(arr: string[] | undefined) {
  if (!arr || arr.length === 0) return sql`ARRAY[]::text[]`;
  return sql`ARRAY[${sql.join(arr.map((x) => sql`${String(x)}`), sql`, `)}]::text[]`;
}

async function runEnrichment() {
  console.log("==========================================================================================");
  console.log(`🌐 HIGH-SPEED ENRICHMENT: 500 RANDOM INGREDIENTS METADATA POPULATION`);
  console.log("==========================================================================================");

  const apiKey = process.env.GEMINI_API_KEY!;

  // Fetch 500 random ingredients missing metadata
  const targetIngredients = await db.execute(sql`
    SELECT id, name, aliases
    FROM ${ingredients}
    WHERE coalesce(cardinality(country), 0) = 0
       OR coalesce(cardinality(cuisine), 0) = 0
       OR coalesce(cardinality(region), 0) = 0
       OR coalesce(cardinality(flavor_profile), 0) = 0
    ORDER BY RANDOM()
    LIMIT ${CONFIG.TARGET_COUNT};
  `);

  console.log(`📦 Pulled ${targetIngredients.length} random ingredients missing metadata from DB.\n`);

  if (targetIngredients.length === 0) {
    console.log("🎉 All ingredients already have metadata!");
    return;
  }

  // Partition into batches of BATCH_SIZE (50)
  const batches: any[][] = [];
  for (let i = 0; i < targetIngredients.length; i += CONFIG.BATCH_SIZE) {
    batches.push(targetIngredients.slice(i, i + CONFIG.BATCH_SIZE));
  }

  let totalEnrichedCount = 0;
  let completedBatches = 0;

  async function processBatch(batch: any[], batchIdx: number) {
    const payload = batch.map((item) => ({
      id: item.id,
      name: item.name,
      aliases: item.aliases || [],
    }));

    const prompt = `
You are an expert culinary ethnographer & food scientist.
For each ingredient, assign accurate attributes based on culinary tradition, origin, and sensory profile:
1. "country": Primary countries of origin or culinary prevalence (e.g. ["Sri Lanka", "India"], ["Italy"], ["France"], ["Global"])
2. "cuisine": Cuisines where it is prominently used (e.g. ["Sri Lankan", "South Asian"], ["Italian", "Mediterranean"], ["Baking", "Dessert"])
3. "region": Geographical regions (e.g. ["South Asia"], ["Mediterranean"], ["Western Europe"], ["Global"])
4. "flavorProfile": Primary taste and sensory descriptors in lowercase (e.g. ["spicy", "aromatic", "savory"], ["sweet", "creamy", "rich"], ["tart", "citrusy"], ["earthy", "nutty"])

Return a strict JSON array where each object has: "id", "country", "cuisine", "region", "flavorProfile".

Ingredients Batch:
${JSON.stringify(payload, null, 2)}
`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );

      const responseData = await res.json();

      if (responseData.usageMetadata) {
        trackCostAndEnforceBudget(
          responseData.usageMetadata.promptTokenCount || 0,
          responseData.usageMetadata.candidatesTokenCount || 0
        );
      }

      const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        const enrichedItems = JSON.parse(text);

        // Parallel DB Updates for the batch
        await Promise.all(
          enrichedItems.map((item: any) =>
            db.execute(sql`
              UPDATE ${ingredients}
              SET country = ${toSqlArray(item.country)},
                  cuisine = ${toSqlArray(item.cuisine)},
                  region = ${toSqlArray(item.region)},
                  flavor_profile = ${toSqlArray(item.flavorProfile)},
                  provenance = 'AI_ENRICHED_GEMINI',
                  updated_at = NOW()
              WHERE id = ${item.id}::uuid;
            `)
          )
        );

        totalEnrichedCount += enrichedItems.length;
        completedBatches++;
        console.log(` ✅ Batch [${completedBatches}/${batches.length}] (${enrichedItems.length} items) enriched! Cumulative Cost: $${cumulativeCostUSD.toFixed(4)} USD`);
      }
    } catch (err: any) {
      console.error(` ❌ Batch #${batchIdx + 1} error:`, err.message || err);
    }
  }

  // Worker Pool Execution with Concurrency Limit
  let currentIdx = 0;
  async function worker() {
    while (currentIdx < batches.length) {
      const idx = currentIdx++;
      await processBatch(batches[idx], idx);
    }
  }

  const workers = Array.from({ length: CONFIG.CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log(`\n🎉 Successfully populated metadata for ${totalEnrichedCount} ingredients! Total API Cost: $${cumulativeCostUSD.toFixed(4)} USD`);

  // Fetch updated stats
  const stats = await getDatabaseStats();
  console.log("\n==========================================================================================");
  console.log("📊 UPDATED DATA COMPLETENESS METRICS IN ADMIN DASHBOARD:");
  console.log("==========================================================================================");
  console.log(` • Missing Country : ${stats.dataCompleteness.missingCountry.toLocaleString()} ingredients`);
  console.log(` • Missing Cuisine : ${stats.dataCompleteness.missingCuisine.toLocaleString()} ingredients`);
  console.log(` • Missing Region  : ${stats.dataCompleteness.missingRegion.toLocaleString()} ingredients`);
  console.log(` • Missing Flavor  : ${stats.dataCompleteness.missingFlavor.toLocaleString()} ingredients`);
  console.log("==========================================================================================\n");
}

runEnrichment().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
