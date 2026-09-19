import { NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "http://localhost:4000/api/v1";

export async function GET() {
  try {
    const res = await fetch(`${NESTJS_API_BASE}/admin/stats`, {
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: { "X-Powered-By": "foodrepo-api (NestJS)" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
