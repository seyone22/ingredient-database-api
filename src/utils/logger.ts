import { db } from "@/utils/db";
import { auditLogs } from "@/utils/schema";
import { eq } from "drizzle-orm";

interface LogOptions {
    type: string;
    tag: string;
    initiatedBy?: string;
    metadata?: Record<string, any>;
}

export interface AuditContext {
    metadata: Record<string, any>;
    message?: string;
}

export async function withAuditLog<T>(
    options: LogOptions,
    operation: (ctx: AuditContext) => Promise<T>
): Promise<T> {
    const initialMetadata = options.metadata || {};

    // 1. Create pending log and return the generated ID
    const [log] = await db.insert(auditLogs).values({
        ...options,
        status: 'pending',
        startTime: new Date(),
        metadata: initialMetadata
    }).returning({ id: auditLogs.id });

    const ctx: AuditContext = {
        metadata: { ...initialMetadata }
    };

    try {
        const result = await operation(ctx);

        // 2. Update on success
        await db.update(auditLogs).set({
            status: 'completed',
            endTime: new Date(),
            message: ctx.message,
            metadata: ctx.metadata
        }).where(eq(auditLogs.id, log.id));

        return result;

    } catch (error: any) {
        // 3. Update on failure
        await db.update(auditLogs).set({
            status: 'failed',
            endTime: new Date(),
            error: error.message || "Unknown Error",
            // If your schema supports text/varchar for stack traces:
            // stack: error.stack,
            metadata: {
                ...ctx.metadata,
                lastAttemptedStep: ctx.metadata?.currentStep || "unknown"
            }
        }).where(eq(auditLogs.id, log.id));

        throw error;
    }
}