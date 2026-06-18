import { db } from "@/utils/db";
import { auditLogs } from "@/utils/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface GetAuditLogsParams {
    type?: string;
    tag?: string;
    status?: any; // You can type this to your auditStatusEnum if you prefer strictness
    page?: number;
    limit?: number;
}

export async function getAuditLogs(params: GetAuditLogsParams) {
    const { type, tag, status, page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    // 1. Build Filters dynamically
    const filters = [];
    if (type) filters.push(eq(auditLogs.type, type));
    if (tag) filters.push(eq(auditLogs.tag, tag));
    if (status) filters.push(eq(auditLogs.status, status));

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // 2. Execute queries concurrently for better performance
    const [logs, totalResult] = await Promise.all([
        db.select()
            .from(auditLogs)
            .where(whereClause)
            .orderBy(desc(auditLogs.startTime))
            .limit(limit)
            .offset(offset),
        db.select({ count: sql<number>`count(*)` })
            .from(auditLogs)
            .where(whereClause)
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
        logs,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit) || 0
        }
    };
}