import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const parsedIngredientSchema = z.object({
  ingredient: z.string(),
  quantity: z.number().nullable().optional().default(null),
  unit: z.string().nullable().optional().default(null),
  notes: z.string().nullable().optional().default(null),
});

export const parseIngredientsResponseSchema = z.array(parsedIngredientSchema);

const CONFIG = {
  GEMINI_MODEL: "gemini-2.5-flash",
};

/**
 * Parse raw ingredient strings into structured quantities, units, and names using Google Gemini.
 */
export async function parseIngredients(ingredientList: string[]) {
  if (!ingredientList.length) return [];

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const prompt = `
Extract structured data from this ingredient list. Return a JSON Array of objects.
Fields: "ingredient" (string), "quantity" (number, null if missing), "unit" (string, null if missing), "notes" (string, null if missing).

Ingredients:
${ingredientList.join("\n")}
`;

  try {
    const response = await ai.models.generateContent({
      model: CONFIG.GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: zodToJsonSchema(
          parseIngredientsResponseSchema as any,
        ),
      },
    });

    if (response.text !== undefined) {
      return JSON.parse(response.text);
    } else {
      throw new Error("No response text returned from Gemini");
    }
  } catch (err: any) {
    console.error("Failed to parse ingredients using Gemini:", err.message || err);
    throw err;
  }
}

/**
 * Convert raw text from a camera/document scan into a valid schema.org/Recipe JSON.
 */
export async function parseCameraRecipe(
  rawText: string,
): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const prompt = `
You are a recipe parsing assistant. Convert the raw text below into a valid JSON-LD Recipe object (https://schema.org/Recipe).
Strict Requirements:
- Use ISO 8601 durations for times (e.g., "PT30M").
- Do not include explanations or markdown.
- Output raw JSON only.

Raw Text:
${rawText}
`;

  try {
    const response = await ai.models.generateContent({
      model: CONFIG.GEMINI_MODEL,
      contents: prompt,
    });

    if (response.text !== undefined) {
      const cleanedText = response.text
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/```$/, "")
        .trim();
      return cleanedText;
    } else {
      throw new Error("No response text returned from Gemini");
    }
  } catch (err: any) {
    console.error("Failed to parse camera recipe using Gemini:", err.message || err);
    return null;
  }
}
