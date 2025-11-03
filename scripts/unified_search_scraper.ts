// scripts/refreshProductByTerm.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import { Product } from "@/models/Product";
import { normalizePrice, normalizeQuantityUnit } from "@/utils/normalizeQtyUtil";

import { CargillsFetcher } from "@/services/cargillsFetcher";
import { KeellsFetcher } from "@/services/keelsFetcher";
import { SparFetcher } from "@/services/sparFetcher";

interface Store {
    name: string;
    fetcher: any;
}

const STORES: Store[] = [
    { name: "Cargills", fetcher: CargillsFetcher },
    { name: "Keells", fetcher: KeellsFetcher },
    { name: "Spar", fetcher: SparFetcher },
];

async function refreshProductsByTerm(searchTerm: string) {
    console.log(`🔸 Refreshing products for term: "${searchTerm}"`);
    await dbConnect();

    for (const { name, fetcher: FetcherClass } of STORES) {
        const fetcher = new FetcherClass();

        console.log(`\n🔹 Searching in ${name}...`);
        try {
            const rawProducts = await fetcher.fetchFromSource({
                itemsPerPage: 1000,
                ingredientName: searchTerm,
            });

            if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
                console.log(`⚠️ No results from ${name}.`);
                continue;
            }

            console.log(`📦 ${name}: ${rawProducts.length} raw items found.`);

            // Normalize + map
            const mappedProducts = rawProducts.map(raw => {
                const { quantity, unit } = normalizeQuantityUnit(raw);
                const price = raw.Price ? normalizePrice(raw.Price) : raw.price;
                const normalized = fetcher.mapToProduct(raw, "000000000000000000000000");

                return {
                    ...normalized,
                    quantity,
                    unit,
                    price,
                    raw: JSON.stringify(raw),
                };
            });

            // Upsert
            const bulkOps = mappedProducts.map(product => ({
                updateOne: {
                    filter: { externalId: product.externalId, source: product.source },
                    update: {
                        $set: {
                            name: product.name,
                            price: product.price,
                            unit: product.unit,
                            quantity: product.quantity,
                            url: product.url,
                            last_fetched: new Date(),
                            currency: product.currency,
                            departmentCode: product.departmentCode,
                            raw: product.raw,
                        },
                        $setOnInsert: { ingredient: product.ingredient },
                    },
                    upsert: true,
                },
            }));

            const result = await Product.bulkWrite(bulkOps);
            console.log(
                `✅ ${name}: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`
            );
        } catch (err: any) {
            console.error(`❌ Error refreshing ${name}:`, err.message);
        }

        // short delay to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
    }

    await mongoose.disconnect();
    console.log("\n🔻 Done. MongoDB connection closed.");
}

// Run directly if executed as a script
if (require.main === module) {
    const term = process.argv[2];
    if (!term) {
        console.error("❌ Please provide a search term. Example:");
        console.error("   npx ts-node scripts/refreshProductByTerm.ts apple");
        process.exit(1);
    }

    refreshProductsByTerm(term).catch(err => {
        console.error("❌ Fatal error:", err);
        process.exit(1);
    });
}

export { refreshProductsByTerm };
