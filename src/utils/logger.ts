import { AuditLog, IAuditLog } from "@/models/AuditLog";

interface LogOptions {
    type: IAuditLog['type'];
    tag: string;
    initiatedBy?: string;
    metadata?: Record<string, any>;
}

export async function withAuditLog<T>(
    options: LogOptions,
    operation: (log: IAuditLog) => Promise<T>
): Promise<T> {
    const log = await AuditLog.create({
        ...options,
        status: 'pending',
        startTime: new Date()
    });

    try {
        const result = await operation(log);

        await AuditLog.findByIdAndUpdate(log._id, {
            status: 'completed',
            endTime: new Date(),
            metadata: log.metadata
        });

        return result;
    } catch (error: any) {
        // Log the failure with full context
        await AuditLog.findByIdAndUpdate(log._id, {
            status: 'failed',
            endTime: new Date(),
            error: error.message || "Unknown Error",
            stack: error.stack, // 👈 Capture the 'where' and 'how'
            metadata: {
                ...log.metadata,
                lastAttemptedStep: log.metadata?.currentStep || "unknown"
            }
        });

        // Re-throw so the API/Script knows it failed
        throw error;
    }
}