import { NextRequest, NextResponse } from "next/server";
import { Ingredient } from "@/models/Ingredient";
import { QueryEmbedding } from "@/models/QueryEmbedding";
import OpenAI from "openai";
import dbConnect from "@/utils/dbConnect";

// -------------------------
// Gemini (OpenAI-compatible) client
// -------------------------
const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// -------------------------
// POST /api/ingredients/match
// Body: { query: string }
// -------------------------
export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { query } = await req.json();

        if (!query || !query.trim()) {
            return NextResponse.json({ error: "Missing 'query' field." }, { status: 400 });
        }

        const cleanQuery = query.trim();

        // 1️⃣ Retrieve or compute embedding
        let cached = await QueryEmbedding.findOne({ query: cleanQuery });
        let queryVector: number[];

        if (cached) {
            queryVector = cached.embedding;
        } else {
            const embeddingResponse = await openai.embeddings.create({
                model: "gemini-embedding-001",
                input: cleanQuery,
            });

            queryVector = embeddingResponse.data[0].embedding;
            await QueryEmbedding.create({ query: cleanQuery, embedding: queryVector });
        }

        // 2️⃣ Vector search pipeline (top 1)
        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index", // <-- replace with your Atlas vector index name
                    path: "embedding",
                    queryVector,
                    numCandidates: 50,
                    limit: 1,
                },
            },
            {
                $project: {
                    id: "$_id",
                    name: 1,
                    score: { $meta: "vectorSearchScore" },
                },
            },
            { $limit: 1 },
        ];

        const results = await Ingredient.aggregate(pipeline);
        if (!results.length) {
            return NextResponse.json({ match: null, confidence: 0 });
        }

        const best = results[0];

        // MongoDB’s vectorSearchScore is *similarity*, not distance.
        // Convert to a confidence percentage (0–1) for clarity.
        const confidence = Math.min(Math.max(best.score, 0), 1);

        return NextResponse.json({
            match: best.name,
            confidence,
        });
    } catch (err: any) {
        console.error("Error in /api/ingredients/match:", err);
        return NextResponse.json(
            { error: err.message || "Failed to match ingredient" },
            { status: 500 }
        );
    }
}
