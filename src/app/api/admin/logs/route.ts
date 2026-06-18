import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs } from "@/services/auditService";

export async function GET(req: NextRequest) {
    try {
        // NextRequest provides a handy .nextUrl property
        const urlParams = req.nextUrl.searchParams;

        // 1. Extract Filters
        const type = urlParams.get("type") || undefined;
        const tag = urlParams.get("tag") || undefined;
        const status = urlParams.get("status") || undefined;

        // Ensure valid numbers with fallbacks
        const limit = parseInt(urlParams.get("limit") || "50", 10);
        const page = parseInt(urlParams.get("page") || "1", 10);

        // 2. Call the Service
        const result = await getAuditLogs({
            type,
            tag,
            status,
            page: isNaN(page) ? 1 : page,
            limit: isNaN(limit) ? 50 : limit
        });

        // 3. Return JSON
        return NextResponse.json(result);

    } catch (err: any) {
        console.error("Audit Log Fetch Error:", err);
        return NextResponse.json(
            { error: "Failed to fetch logs", details: err.message },
            { status: 500 }
        );
    }
}