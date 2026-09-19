import { type NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "http://localhost:4000/api/v1";

export async function GET(request: NextRequest, { params }: { params: any }) {
  try {
    const ingredientId = (await params).id;

    if (!ingredientId) {
      return NextResponse.json(
        { error: "Invalid ingredient ID" },
        { status: 400 },
      );
    }

    const backendRes = await fetch(
      `${NESTJS_API_BASE}/ingredients/${ingredientId}/price`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    const data = await backendRes.json();

    return NextResponse.json(data, {
      status: backendRes.status,
      headers: {
        "X-Powered-By": "foodrepo-api (NestJS)",
      },
    });
  } catch (err: any) {
    console.error("Fetch Ingredient Prices Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch ingredient prices", details: err.message },
      { status: 500 },
    );
  }
}
