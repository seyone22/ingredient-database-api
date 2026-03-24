import { NextRequest, NextResponse } from "next/server";
import { enhanceIngredientsById } from "@/services/aiService";
import { withAuditLog } from "@/utils/logger";

export const POST = async (req: NextRequest) => {
    try {
        const body = await req.json();
        const ids: string[] = Array.isArray(body.id) ? body.id : [body.id];

        if (!ids.length || !ids[0]) {
            return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
        }

        const enriched = await withAuditLog(
            {
                type: 'AI_ENRICHMENT',
                tag: 'GPT-4o-MINI',
                initiatedBy: 'user',
                metadata: {
                    ingredientIds: ids,
                    count: ids.length,
                    step: 'starting'
                }
            },
            async (log) => {
                // Update log as we move into the heavy lifting
                log.metadata.step = 'calling_ai_service';

                const result = await enhanceIngredientsById(ids);

                // If the AI service returns specific usage stats, capture them!
                if (result.usage) {
                    log.metadata.tokens = result.usage;
                }

                log.metadata.step = 'completed';
                log.message = `Successfully enriched ${ids.length} ingredient(s).`;

                return result;
            }
        );

        return NextResponse.json({ message: "Enhancement completed", enriched });
    } catch (err: any) {
        // Note: withAuditLog handles the database side of this failure.
        // We just handle the HTTP response here.
        console.error("Enhancement Route Error:", err);
        return NextResponse.json(
            {
                error: err.message || "Server error",
                // Don't send stack to client for security, but it's in our DB via AuditLog
            },
            { status: 500 }
        );
    }
};