import { NextRequest, NextResponse } from "next/server";
import { triggerGithubScraper } from "@/services/ingestService";

export async function POST(req: NextRequest) {
    try {
        const result = await triggerGithubScraper();
        return NextResponse.json(result);
    } catch (err: any) {
        console.error("Ingest Trigger Error:", err);

        // Map the specific concurrency error to a 409 Conflict status
        if (err.message === "Ingest already in progress") {
            return NextResponse.json({ error: err.message }, { status: 409 });
        }

        return NextResponse.json(
            { error: err.message || "Failed to trigger ingest" },
            { status: 500 }
        );
    }
}