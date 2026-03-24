import dbConnect from "@/utils/dbConnect";
import {NextResponse} from "next/server";
import {fetchIngredientsByIds} from "@/services/ingredientService";

export const POST = async (req: Request) => {
    await dbConnect();

    try {
        const body = await req.json();
        const ids: string[] = body.ids;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                {error: "'ids' must be a non-empty array in the request body"},
                {status: 400}
            );
        }

        const {ingredients, total} = await fetchIngredientsByIds(ids);

        if (ingredients.length === 0) {
            return NextResponse.json({error: "No Ingredients found"}, {status: 404});
        }

        return NextResponse.json({ingredients, total});
    } catch (err: any) {
        console.error("Error fetching Ingredients:", err);
        return NextResponse.json(
            {error: "Server error", details: err.message},
            {status: 500}
        );
    }
};