import { type NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "https://foodapi.seyone.dev/api/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Delegate execution to the dedicated NestJS backend
    const backendRes = await fetch(`${NESTJS_API_BASE}/recipes/pricing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    return NextResponse.json(data, {
      status: backendRes.status,
      headers: {
        "Content-Type": "application/ld+json; charset=utf-8",
        "X-Powered-By": "foodrepo-api (NestJS)",
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to communicate with FoodRepo NestJS API";
    return NextResponse.json(
      {
        type: "https://food.seyone.dev/errors/gateway-error",
        title: "Gateway Error",
        status: 502,
        detail: message,
      },
      {
        status: 502,
        headers: { "Content-Type": "application/problem+json" },
      },
    );
  }
}
