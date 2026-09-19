import { type NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "https://foodapi.seyone.dev/api/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Delegate execution to the dedicated NestJS backend
    const backendRes = await fetch(
      `${NESTJS_API_BASE}/recipes/parse-and-price`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const contentType = backendRes.headers.get("content-type") || "";

    if (!contentType.includes("json")) {
      let errorMsg = `Pricing backend service error (HTTP ${backendRes.status})`;
      if (backendRes.status === 524 || backendRes.status === 504) {
        errorMsg =
          "The recipe pricing service timed out while analyzing ingredients and live supermarket stock. Please try again or paste the ingredient lines directly.";
      } else if (backendRes.status === 502 || backendRes.status === 503) {
        errorMsg =
          "The FoodRepo pricing backend is temporarily restarting or unavailable. Please try again in a few moments.";
      }

      return NextResponse.json(
        {
          type: "https://food.seyone.dev/errors/gateway-error",
          title: "Pricing Service Unavailable",
          status: backendRes.status || 502,
          detail: errorMsg,
        },
        {
          status: backendRes.status || 502,
          headers: { "Content-Type": "application/problem+json" },
        },
      );
    }

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
