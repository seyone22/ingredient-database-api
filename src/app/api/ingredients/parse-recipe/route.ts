import { type NextRequest, NextResponse } from "next/server";
import { parseCameraRecipe } from "@/services/aiService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawText } = body;

    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid 'rawText' field." },
        { status: 400 },
      );
    }

    const recipeJson = await parseCameraRecipe(rawText);

    if (!recipeJson) {
      return NextResponse.json(
        { error: "Failed to parse recipe text." },
        { status: 500 },
      );
    }

    return new NextResponse(recipeJson, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to parse camera recipe";
    console.error("Error in /api/ingredients/parse-recipe:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
