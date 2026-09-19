import { NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "http://localhost:4000/api/v1";

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${NESTJS_API_BASE}/admin/scraper/run`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: { "X-Powered-By": "foodrepo-api (NestJS)" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to trigger ingest" },
      { status: 500 },
    );
  }
}
