import { NextRequest, NextResponse } from "next/server";
import { enhanceIngredientsById } from "@/services/aiService";

export const POST = async (req: NextRequest) => {
    try {
        const body = await req.json();
        const ids: string[] = Array.isArray(body.id) ? body.id : [body.id];
        if (!ids.length) return NextResponse.json({ error: "No IDs provided" }, { status: 400 });

        const enriched = await enhanceIngredientsById(ids);
        return NextResponse.json({ message: "Enhancement completed", enriched });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
};
