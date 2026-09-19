import { type NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "http://localhost:4000/api/v1";

// POST: Fetch specific product IDs
export async function POST(req: NextRequest) {
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

// GET: Fetch a random unmapped product
export async function GET(req: NextRequest) {
  try {
    const backendRes = await fetch(
      `${NESTJS_API_BASE}/products/unmapped/random`,
      { headers: { Accept: "application/json" } },
    );
    const data = await backendRes.json();
    return NextResponse.json(data, {
      status: backendRes.status,
      headers: { "X-Powered-By": "foodrepo-api (NestJS)" },
    });
  } catch (err: any) {
    console.error("Error fetching random product:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 },
    );
  }
}
