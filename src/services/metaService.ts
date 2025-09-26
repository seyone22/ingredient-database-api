import { Ingredient } from "@/models/Ingredient";

export interface DatabaseStats {
    totalIngredients: number;
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
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
    const totalIngredients = await Ingredient.countDocuments();

    const ingredients = await Ingredient.find({}, {
        country: 1,
        cuisine: 1,
        region: 1,
        flavor_profile: 1,
        _id: 0,
    }).lean();

    const byCountry: Record<string, number> = {};
    const byCuisine: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    const byFlavor: Record<string, number> = {};

    ingredients.forEach((ing) => {
        (ing.country || []).forEach(c => byCountry[c] = (byCountry[c] || 0) + 1);
        (ing.cuisine || []).forEach(c => byCuisine[c] = (byCuisine[c] || 0) + 1);
        (ing.region || []).forEach(r => byRegion[r] = (byRegion[r] || 0) + 1);
        (ing.flavor_profile || []).forEach(f => byFlavor[f] = (byFlavor[f] || 0) + 1);
    });

    return {
        totalIngredients,
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
