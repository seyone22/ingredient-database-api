import { db } from "@/utils/db";
import { auditLogs } from "@/utils/schema";
import { eq, and } from "drizzle-orm";

export async function triggerGithubScraper() {
    // 1. Concurrency Check: Ensure no other scrape is currently running
    const activeRun = await db
        .select({ id: auditLogs.id })
        .from(auditLogs)
        .where(
            and(
                eq(auditLogs.type, "SCRAPE_RUN"),
                eq(auditLogs.status, "pending")
            )
        )
        .limit(1);

    if (activeRun.length > 0) {
        throw new Error("Ingest already in progress");
    }

    // 2. Create the "Pending" Audit Log
    const [log] = await db.insert(auditLogs).values({
        type: "SCRAPE_RUN",
        tag: "MANUAL_SCRAPE",
        initiatedBy: "admin",
        metadata: { platform: "github_actions" },
        status: "pending",
    }).returning({ id: auditLogs.id });

    try {
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = "seyone22";
        const REPO_NAME = "ingredient-database-api";

        if (!GITHUB_TOKEN) {
            throw new Error("Missing GITHUB_TOKEN environment variable.");
        }

        // 3. Call GitHub API
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
                    event_type: "manual_ingest",
                }),
            }
        );

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`GitHub API Error: ${errData.message || response.statusText}`);
        }

        // 4. Success: Update Audit Log
        await db.update(auditLogs)
            .set({
                status: "completed",
                message: "GitHub Action triggered successfully.",
                endTime: new Date(),
                updatedAt: new Date()
            })
            .where(eq(auditLogs.id, log.id));

        return { message: "Scraper pipeline initiated via GitHub Actions." };

    } catch (error: any) {
        // 5. Failure: Update Audit Log with error details
        await db.update(auditLogs)
            .set({
                status: "failed",
                error: error.message,
                endTime: new Date(),
                updatedAt: new Date()
            })
            .where(eq(auditLogs.id, log.id));

        throw error;
    }
}