import { type NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "http://localhost:4000/api/v1";

// Search products by name or SKU
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const backendRes = await fetch(
      `${NESTJS_API_BASE}/products?${searchParams.toString()}`,
      { headers: { Accept: "application/json" } },
    );
    const data = await backendRes.json();
    return NextResponse.json(data, {
      status: backendRes.status,
      headers: { "X-Powered-By": "foodrepo-api (NestJS)" },
    });
  } catch (err: any) {
    console.error("Error searching products:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Fetch specific products by array of IDs
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendRes = await fetch(`${NESTJS_API_BASE}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, {
      status: backendRes.status,
      headers: { "X-Powered-By": "foodrepo-api (NestJS)" },
    });
  } catch (err: any) {
    console.error("Error fetching products:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 },
    );
  }
}
