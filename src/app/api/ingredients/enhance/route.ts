import { NextRequest, NextResponse } from "next/server";
import { enhanceIngredientsById } from "@/services/aiService";
import { withAuditLog } from "@/utils/logger";
import dbConnect from "@/utils/dbConnect"; // 1. Import your dbConnect

export const POST = async (req: NextRequest) => {
    try {
        // 2. Establish connection BEFORE doing any DB operations
        await dbConnect();

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
                log.metadata.step = 'calling_ai_service';

                const result = await enhanceIngredientsById(ids);

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
        console.error("Enhancement Route Error:", err);
        return NextResponse.json(
            { error: err.message || "Server error" },
            { status: 500 }
        );
    }
};