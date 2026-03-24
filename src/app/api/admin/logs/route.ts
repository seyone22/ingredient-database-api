import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import { AuditLog } from "@/models/AuditLog";

export async function GET(req: NextRequest) {
    await dbConnect();

    try {
        const urlParams = new URL(req.url).searchParams;

        // 1. Extract Filters
        const type = urlParams.get("type"); // e.g., 'SCRAPE_RUN'
        const tag = urlParams.get("tag");   // e.g., 'CRON_SCRAPE'
        const status = urlParams.get("status");
        const limit = parseInt(urlParams.get("limit") || "50");
        const page = parseInt(urlParams.get("page") || "1");

        // 2. Build Query Object
        const query: any = {};
        if (type) query.type = type;
        if (tag) query.tag = tag;
        if (status) query.status = status;

        // 3. Execute Query
        // We sort by startTime descending so the most recent events are at the top
        const logs = await AuditLog.find(query)
            .sort({ startTime: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await AuditLog.countDocuments(query);

        return NextResponse.json({
            logs,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (err: any) {
        console.error("Audit Log Fetch Error:", err);
        return NextResponse.json(
            { error: "Failed to fetch logs", details: err.message },
            { status: 500 }
        );
    }
}