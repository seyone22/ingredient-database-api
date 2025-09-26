import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import { getDatabaseStats } from "@/services/metaService";

export const GET = async () => {
    await dbConnect();

    try {
        const stats = await getDatabaseStats();
        return NextResponse.json(stats);
    } catch (err: any) {
        return NextResponse.json({ error: "Failed to fetch stats", details: err.message || err }, { status: 500 });
    }
};
