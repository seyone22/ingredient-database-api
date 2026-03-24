import mongoose, { Schema, model, Document } from "mongoose";

export interface IAuditLog extends Document {
    type: 'SCRAPE_RUN' | 'AI_ENRICHMENT' | 'MANUAL_MAPPING' | 'SYSTEM_FETCH';
    tag: string;           // e.g., 'CRON_SCRAPE', 'MANUAL_SCRAPE', 'OPENAI_V4'
    status: 'pending' | 'completed' | 'failed';
    initiatedBy: string;   // 'system', 'user_id', or 'cron'
    startTime: Date;
    endTime?: Date;
    message?: string;      // Summary of the run
    metadata: Record<string, any>; // Flexible storage for specific stats
    error?: string;
    stack?: string; // 👈 Added for deep debugging
}

const AuditLogSchema = new Schema<IAuditLog>({
    type: { type: String, required: true, index: true },
    tag: { type: String, required: true, index: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending', index: true },
    initiatedBy: { type: String, default: 'system' },
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    message: String,
    metadata: { type: Schema.Types.Mixed, default: {} },
    error: String,
    stack: String, // 👈 Store the stack trace
}, { timestamps: true });

// Index for the dashboard query: "Give me the latest scrape runs"
AuditLogSchema.index({ type: 1, startTime: -1 });

export const AuditLog = mongoose.models.AuditLog || model<IAuditLog>("AuditLog", AuditLogSchema);