import { NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "https://foodapi.seyone.dev/api/v1";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Mcp-Method, Mcp-Name, Mcp-Session-Id",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${NESTJS_API_BASE}/mcp`, {
      headers: {
        Accept: "application/json",
        ...(req.headers.get("authorization")
          ? { Authorization: req.headers.get("authorization")! }
          : {}),
      },
    });
    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to reach FoodRepo MCP server" },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const auth = req.headers.get("authorization");
    if (auth) headers["authorization"] = auth;

    const res = await fetch(`${NESTJS_API_BASE}/mcp`, {
      method: "POST",
      headers,
      body,
    });

    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: {
        ...CORS_HEADERS,
        ...(res.headers.get("www-authenticate")
          ? { "WWW-Authenticate": res.headers.get("www-authenticate")! }
          : {}),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: err.message || "Internal RPC gateway error" },
        id: null,
      },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
