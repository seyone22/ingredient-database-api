import { type NextRequest, NextResponse } from "next/server";
import { parseIngredients } from "@/services/aiService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredients } = body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json(
        { error: "Missing or invalid 'ingredients' array." },
        { status: 400 },
      );
    }

    const parsed = await parseIngredients(ingredients);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to parse ingredients";
    console.error("Error in /api/ingredients/parse:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
