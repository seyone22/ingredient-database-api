import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const origin =
    host && !host.includes("localhost")
      ? `${proto}://${host}`
      : process.env.NEXT_PUBLIC_APP_URL || "https://food.seyone.dev";

  return NextResponse.json(
    {
      resource: origin,
      authorization_servers: [
        process.env.AUTH_SERVER_URL || `${origin}/api/auth`,
      ],
      scopes_supported: [
        "read:ingredients",
        "write:ingredients",
        "read:products",
        "read:recipes",
        "admin:maintenance",
      ],
      bearer_methods_supported: ["header"],
      resource_documentation: `${origin}/documentation`,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Content-Type": "application/json",
      },
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
