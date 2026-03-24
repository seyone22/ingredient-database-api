import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Ingredient from "@/models/Ingredient";
import { Mapping } from "@/models/Mapping";
import { PriceHistory } from "@/models/PriceHistory"; // <-- Import the new model

// We import these so Mongoose registers the schemas for the .populate() chain
import "@/models/Product";
import "@/models/PriceSource";

export async function GET(
    request: NextRequest,
    { params }: { params: any }
): Promise<NextResponse> {
    await dbConnect();

    // Await params if you are on Next.js 15+
    const ingredientId = (await params).id;

    // 1️⃣ Find the core ingredient
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) {
        return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    }

    // 2️⃣ Query the Mapping collection for this ingredient
    const mappings = await Mapping.find({
        matchedIngredients: ingredient._id
    }).populate({
        path: "product",
        populate: {
            path: "source",
        }
    });

    if (mappings.length === 0) {
        return NextResponse.json({
            ingredient: ingredient.name,
            prices: [],
            message: "No verified products mapped yet"
        });
    }

    // 3️⃣ Extract the products
    const mappedProducts = mappings
        .map((mapping: any) => mapping.product)
        .filter(Boolean);

    // Get an array of just the product ObjectIds
    const productIds = mappedProducts.map((p: any) => p._id);

    // 4️⃣ Fetch the LATEST price for each product using Aggregation
    const latestPrices = await PriceHistory.aggregate([
        // Match only history records for our mapped products
        { $match: { product: { $in: productIds } } },
        // Sort by timestamp descending (newest first)
        { $sort: { timestamp: -1 } },
        // Group by product ID, grabbing the first (newest) price and currency it sees
        {
            $group: {
                _id: "$product",
                latestPrice: { $first: "$price" },
                currency: { $first: "$currency" },
                lastUpdated: { $first: "$timestamp" }
            }
        }
    ]);

    // Create a lookup dictionary for fast O(1) matching
    const priceMap = latestPrices.reduce((acc: any, curr: any) => {
        acc[curr._id.toString()] = curr;
        return acc;
    }, {});

    // 5️⃣ Merge the latest price data into the product objects
    const productsWithLatestPrices = mappedProducts.map((product: any) => {
        // Convert Mongoose doc to standard object to safely overwrite fields
        const prodObj = product.toObject ? product.toObject() : product;
        const latestData = priceMap[prodObj._id.toString()];

        return {
            ...prodObj,
            // Override the 0 with the historical price. Fallback to 0 if no history exists.
            price: latestData ? latestData.latestPrice : (prodObj.price || 0),
            currency: latestData ? latestData.currency : (prodObj.currency || "LKR"),
            last_price_update: latestData ? latestData.lastUpdated : null
        };
    });

    return NextResponse.json({
        ingredient: ingredient.name,
        prices: productsWithLatestPrices
    });
}