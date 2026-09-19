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
  operation: (ctx: AuditContext) => Promise<T>,
): Promise<T> {
  const ctx: AuditContext = {
    metadata: options.metadata ? { ...options.metadata } : {},
  };
  console.log(`[AUDIT:${options.type}:${options.tag}] Started by ${options.initiatedBy || "system"}`);
  try {
    const result = await operation(ctx);
    console.log(`[AUDIT:${options.type}:${options.tag}] Completed. ${ctx.message || ""}`);
    return result;
  } catch (error: any) {
    console.error(`[AUDIT:${options.type}:${options.tag}] Failed: ${error.message}`);
    throw error;
  }
}
