import {Ingredient} from "@/models/Ingredient";
import {Product} from "@/models/Product";
import {Mapping} from "@/models/Mapping";

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

export async function getIngredientStats(): Promise<any> {
    const totalIngredients = await Ingredient.countDocuments();

    const ingredients = await Ingredient.find({}, {
        country: 1,
        cuisine: 1,
        region: 1,
        flavor_profile: 1,
        _id: 0,
    }).lean();

    const totalProducts = await Product.countDocuments();

    const products = await Product.find({}, {

    }).lean();

    const byCountry: Record<string, number> = {};
    const byCuisine: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    const byFlavor: Record<string, number> = {};

    const totalMappedProducts = 0;

    ingredients.forEach((ing) => {
        const {country = [], cuisine = [], region = [], flavor_profile = []} = ing;

        country.forEach((c: string) => {
            byCountry[c] = (byCountry[c] || 0) + 1;
        });
        cuisine.forEach((c: string) => {
            byCuisine[c] = (byCuisine[c] || 0) + 1;
        });
        region.forEach((r: string) => {
            byRegion[r] = (byRegion[r] || 0) + 1;
        });
        flavor_profile.forEach((f: string) => {
            byFlavor[f] = (byFlavor[f] || 0) + 1;
        });
    });

    return {
        totalIngredients,
        totalProducts,
        totalMappedProducts,
        countries: {
            total: Object.keys(byCountry).length,
            byCountry
        },
        cuisines: {
            total: Object.keys(byCuisine).length,
            byCuisine
        },
        regions: {
            total: Object.keys(byRegion).length,
            byRegion
        },
        flavorProfiles: {
            total: Object.keys(byFlavor).length,
            byFlavor
        }
    };
}

/**
 * Gathers high-level stats for FoodRepo admin dashboard.
 */

export async function getDatabaseStats(): Promise<DatabaseStats> {
    const [
        totalIngredients,
        totalProducts,
        totalMappedProducts,
        byCountryAgg,
        byCuisineAgg,
        byRegionAgg,
        byFlavorAgg,
        topIngredientsAgg,
        sourceAgg,
        ingredientGrowthAgg,
        productGrowthAgg,
        mappingGrowthAgg,
        missingCountry,
        missingCuisine,
        missingRegion,
        missingFlavor
    ] = await Promise.all([
        Ingredient.countDocuments(),
        Product.countDocuments(),
        Mapping.countDocuments(),

        Ingredient.aggregate([
            { $unwind: "$country" },
            { $group: { _id: "$country", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        Ingredient.aggregate([
            { $unwind: "$cuisine" },
            { $group: { _id: "$cuisine", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        Ingredient.aggregate([
            { $unwind: "$region" },
            { $group: { _id: "$region", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        Ingredient.aggregate([
            { $unwind: "$flavor_profile" },
            { $group: { _id: "$flavor_profile", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        Ingredient.aggregate([
            { $unwind: "$name" },
            { $group: { _id: "$name", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]),
        Product.aggregate([
            // 1. Join with the Source collection
            {
                $lookup: {
                    from: "price_sources",           // collection name in MongoDB (pluralized usually)
                    localField: "source",      // field in Product
                    foreignField: "_id",       // field in Source
                    as: "sourceData"
                }
            },

            // 2. Unwind the joined array (since lookup returns an array)
            { $unwind: "$sourceData" },

            // 3. Group by source name instead of ObjectId
            {
                $group: {
                    _id: "$sourceData.name",   // group by the actual name
                    count: { $sum: 1 }
                }
            },

            // 4. Sort descending
            { $sort: { count: -1 } },
        ]),
        Ingredient.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Product.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Mapping.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Ingredient.countDocuments({ $or: [{ country: { $size: 0 } }, { country: { $exists: false } }] }),
        Ingredient.countDocuments({ $or: [{ cuisine: { $size: 0 } }, { cuisine: { $exists: false } }] }),
        Ingredient.countDocuments({ $or: [{ region: { $size: 0 } }, { region: { $exists: false } }] }),
        Ingredient.countDocuments({ $or: [{ flavor_profile: { $size: 0 } }, { flavor_profile: { $exists: false } }] }),
    ]);

    const mappingCoverage = totalProducts > 0 ? (totalMappedProducts / totalProducts) * 100 : 0;

    return {
        totalIngredients,
        totalProducts,
        totalMappedProducts,
        mappingCoverage,

        countries: {
            total: byCountryAgg.length,
            byCountry: Object.fromEntries(byCountryAgg.map(c => [c._id, c.count])),
        },
        cuisines: {
            total: byCuisineAgg.length,
            byCuisine: Object.fromEntries(byCuisineAgg.map(c => [c._id, c.count])),
        },
        regions: {
            total: byRegionAgg.length,
            byRegion: Object.fromEntries(byRegionAgg.map(r => [r._id, r.count])),
        },
        flavorProfiles: {
            total: byFlavorAgg.length,
            byFlavor: Object.fromEntries(byFlavorAgg.map(f => [f._id, f.count])),
        },

        topIngredients: topIngredientsAgg.map(i => ({ name: i._id, count: i.count })),
        productsBySource: Object.fromEntries(sourceAgg.map(s => [s._id, s.count])),
        growth: {
            ingredients: ingredientGrowthAgg.map(g => ({ date: g._id, count: g.count })),
            products: productGrowthAgg.map(g => ({ date: g._id, count: g.count })),
            mappings: mappingGrowthAgg.map(g => ({ date: g._id, count: g.count })),
        },
        dataCompleteness: {
            missingCountry,
            missingCuisine,
            missingRegion,
            missingFlavor,
        },
    };
}