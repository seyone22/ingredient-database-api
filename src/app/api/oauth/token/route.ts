import { NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "http://localhost:4000/api/v1";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let body: any;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      const params: Record<string, string> = {};
      formData.forEach((value, key) => {
        params[key] = String(value);
      });
      body = JSON.stringify(params);
    } else {
      body = await req.text();
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const auth = req.headers.get("authorization");
    if (auth) headers["authorization"] = auth;

    const res = await fetch(`${NESTJS_API_BASE}/oauth/token`, {
      method: "POST",
      headers,
      body,
    });

    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", error_description: err.message || "Token gateway failure" },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
