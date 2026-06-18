import { NextRequest, NextResponse } from "next/server";
import { processAiEnrichment } from "@/services/aiService";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Ensure we always have an array of IDs
        const ids: string[] = Array.isArray(body.id) ? body.id : [body.id];

        if (!ids.length || !ids[0]) {
            return NextResponse.json(
                { error: "No IDs provided" },
                { status: 400 }
            );
        }

        // Delegate execution and logging to the Service Layer
        const enriched = await processAiEnrichment(ids);

        return NextResponse.json({ message: "Enhancement completed", enriched });

    } catch (err: any) {
        console.error("Enhancement Route Error:", err);
        return NextResponse.json(
            { error: err.message || "Server error" },
            { status: 500 }
        );
    }
}