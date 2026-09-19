import { NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "https://foodapi.seyone.dev/api/v1";

export async function GET(req: NextRequest, { params }: { params: any }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 },
      );
    }

    const backendRes = await fetch(`${NESTJS_API_BASE}/products/${id}/history`, {
      headers: {
        Accept: "application/json",
      },
    });

    const data = await backendRes.json();

    return NextResponse.json(data, {
      status: backendRes.status,
      headers: {
        "X-Powered-By": "foodrepo-api (NestJS)",
      },
    });
  } catch (err: any) {
    console.error("Error fetching price history:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message || String(err) },
      { status: 500 },
    );
  }
}
