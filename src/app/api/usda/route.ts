import { NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "https://foodapi.seyone.dev/api/v1";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const res = await fetch(`${NESTJS_API_BASE}/usda?${searchParams.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    const contentType = res.headers.get("content-type") || "";
    let data: any;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = {
        error:
          res.status >= 500
            ? "USDA search service is restarting or temporarily unavailable. Please retry in a moment."
            : text || "USDA search failed",
      };
    }

    return NextResponse.json(data, {
      status: res.status,
      headers: { "X-Powered-By": "foodrepo-api (NestJS)" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to search USDA foods" },
      { status: 500 },
    );
  }
}
