import { NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "http://localhost:4000/api/v1";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${NESTJS_API_BASE}/.well-known/oauth-authorization-server`, {
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Content-Type": "application/json",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
