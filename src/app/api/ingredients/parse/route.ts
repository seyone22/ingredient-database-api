import { NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "https://foodapi.seyone.dev/api/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${NESTJS_API_BASE}/ingredients/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to parse ingredients" },
      { status: 500 },
    );
  }
}
