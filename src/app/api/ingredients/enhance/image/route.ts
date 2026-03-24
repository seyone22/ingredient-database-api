import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import Ingredient from "@/models/Ingredient";
import { withAuditLog } from "@/utils/logger";
import { fetchIngredientImage } from "@/services/imageIngestService";

export async function POST(req: NextRequest) {
    await dbConnect();

    try {
        const body = await req.json();
        const { id } = body;

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const ingredient = await Ingredient.findById(id);
        if (!ingredient) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });

        const result = await withAuditLog({
            type: 'SYSTEM_FETCH',
            tag: 'IMAGE_WATERFALL',
            initiatedBy: 'admin',
            metadata: {
                ingredientId: id,
                ingredientName: ingredient.name
            }
        }, async (log) => {

            // Delegate to our new Waterfall Service
            const imageResult = await fetchIngredientImage(ingredient.name);

            if (!imageResult) {
                log.message = `Waterfall exhausted. No image found for "${ingredient.name}".`;
                log.metadata.status = 'no_results';
                return null;
            }

            log.metadata.sourceUsed = imageResult.source;
            log.metadata.imageUrl = imageResult.url;

            const updated = await Ingredient.findByIdAndUpdate(
                id,
                {
                    $set: {
                        "image.url": imageResult.url,
                        "image.author": imageResult.author,
                        "image.last_fetched": new Date()
                    }
                },
                { new: true }
            );

            log.message = `Successfully mapped image via ${imageResult.source}`;
            return updated;
        });

        if (!result) return NextResponse.json({ error: "No image found across all providers." }, { status: 404 });

        return NextResponse.json({ message: "Success", ingredient: result });

    } catch (err: any) {
        console.error("Image Fetch Pipeline Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}