import {NextRequest, NextResponse} from "next/server";
import dbConnect from "@/utils/dbConnect";
import Ingredient from "@/models/Ingredient";
import PriceSource from "@/models/PriceSource";
import {KeellsFetcher} from "@/services/keelsFetcher";
import {Product} from "@/models/Product";

// Map source name to fetcher class
const fetcherRegistry: Record<string, any> = {
    "Keells": KeellsFetcher,
    // Add other fetchers here
};

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    await dbConnect();

    const ingredientId = (await context.params).id;
    const urlParams = new URL(req.url).searchParams;
    const country = urlParams.get("country") || "LK";

    // 1️⃣ Find ingredient
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) {
        return NextResponse.json({error: "Ingredient not found"}, {status: 404});
    }

    // 2️⃣ Find cached products for this ingredient and country
    const oneDayAgo = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const cachedProducts = await Product.find({
        ingredient: ingredient._id,
        last_fetched: {$gt: oneDayAgo}
    }).populate("source");

    if (cachedProducts.length > 0) {
        return NextResponse.json({ingredient: ingredient.name, prices: cachedProducts});
    }

    // 3️⃣ Lazy fetch using registered fetchers
    const sources = await PriceSource.find({country});
    let fetchedProducts: any[] = [];

    for (const source of sources) {
        const FetcherClass = fetcherRegistry[source.name];
        if (!FetcherClass) continue; // no fetcher for this source

        const fetcher = new FetcherClass();
        const products = await fetcher.getProducts(ingredient._id.toString(), ingredient.name);
        fetchedProducts.push(...products);
    }

    if (fetchedProducts.length === 0) {
        return NextResponse.json({ingredient: ingredient.name, prices: [], message: "No products mapped or found"});
    }

    return NextResponse.json({ingredient: ingredient.name, prices: fetchedProducts});
};
