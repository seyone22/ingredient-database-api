import {NextRequest, NextResponse} from "next/server";
import {processIngredientImage} from "@/services/imageIngestService";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {id} = body;

        if (!id) {
            return NextResponse.json({error: "ID required"}, {status: 400});
        }

        // Delegate to our new orchestration service
        const result = await processIngredientImage(id);

        if (!result) {
            return NextResponse.json(
                {error: "No image found across all providers."},
                {status: 404}
            );
        }

        return NextResponse.json({message: "Success", ingredient: result});

    } catch (err: any) {
        console.error("Image Fetch Pipeline Error:", err);

        if (err.message === "Ingredient not found") {
            return NextResponse.json({error: err.message}, {status: 404});
        }

        return NextResponse.json(
            {error: err.message || "Server Error"},
            {status: 500}
        );
    }
}