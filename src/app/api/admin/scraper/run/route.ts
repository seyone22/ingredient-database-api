import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import { withAuditLog } from "@/utils/logger";
import { AuditLog } from "@/models/AuditLog";

export async function POST(req: NextRequest) {
    await dbConnect();

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = "seyone22";
    const REPO_NAME = "ingredient-database-api";

    try {
        // 1. Concurrency Check
        const activeRun = await AuditLog.findOne({
            type: 'SCRAPE_RUN',
            status: 'pending'
        });

        if (activeRun) {
            return NextResponse.json({ error: "Ingest already in progress" }, { status: 409 });
        }

        // 2. Wrap the API call to GitHub in our Audit Log
        await withAuditLog({
            type: 'SCRAPE_RUN',
            tag: 'MANUAL_SCRAPE',
            initiatedBy: 'admin',
            metadata: { platform: 'github_actions' }
        }, async (log) => {

            const response = await fetch(
                `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${GITHUB_TOKEN}`,
                        Accept: "application/vnd.github+json",
                        "X-GitHub-Api-Version": "2022-11-28",
                    },
                    body: JSON.stringify({
                        event_type: "manual_ingest", // Matches the YAML type
                    }),
                }
            );

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`GitHub API Error: ${errData.message || response.statusText}`);
            }

            log.message = "GitHub Action triggered successfully.";
            return { success: true };
        });

        return NextResponse.json({ message: "Scraper pipeline initiated via GitHub Actions." });

    } catch (err: any) {
        console.error("Ingest Trigger Error:", err);
        return NextResponse.json({ error: err.message || "Failed to trigger ingest" }, { status: 500 });
    }
}