import { NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "https://foodapi.seyone.dev/api/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const backendRes = await fetch(`${NESTJS_API_BASE}/ingredients/enhance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    return NextResponse.json(data, {
      status: backendRes.status,
      headers: {
        "X-Powered-By": "foodrepo-api (NestJS)",
      },
    });
  } catch (err: any) {
    console.error("Enhancement Route Error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}
