import { NextRequest, NextResponse } from "next/server";
import { consumeAuthorizationCode } from "@/lib/oauth/store";
import crypto from "crypto";

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
  let grantType = "";
  let code = "";
  let clientId = "";
  let clientSecret = "";
  let redirectUri = "";

  // 1. Check HTTP Basic Auth header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("basic ")) {
    try {
      const creds = Buffer.from(authHeader.substring(6), "base64").toString("utf-8");
      const [u, p] = creds.split(":");
      clientId = u;
      clientSecret = p;
    } catch {}
  }

  // 2. Parse Body (supports form-urlencoded or json)
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData();
    grantType = (formData.get("grant_type") as string) || "";
    code = (formData.get("code") as string) || "";
    if (!clientId) clientId = (formData.get("client_id") as string) || "";
    if (!clientSecret) clientSecret = (formData.get("client_secret") as string) || "";
    redirectUri = (formData.get("redirect_uri") as string) || "";
  } else {
    try {
      const json = await req.json();
      grantType = json.grant_type || "";
      code = json.code || "";
      if (!clientId) clientId = json.client_id || "";
      if (!clientSecret) clientSecret = json.client_secret || "";
      redirectUri = json.redirect_uri || "";
    } catch {}
  }

  // Verify Client Secret if configured on the server
  const serverClientSecret = process.env.MCP_CLIENT_SECRET;
  if (serverClientSecret && clientSecret) {
    const enteredBuf = Buffer.from(clientSecret);
    const expectedBuf = Buffer.from(serverClientSecret);
    const matchesSecret =
      enteredBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(enteredBuf, expectedBuf);

    // Also allow matching MCP_API_KEY
    const apiKeyBuf = Buffer.from(process.env.MCP_API_KEY || "");
    const matchesApiKey =
      enteredBuf.length === apiKeyBuf.length &&
      crypto.timingSafeEqual(enteredBuf, apiKeyBuf);

    if (!matchesSecret && !matchesApiKey) {
      return NextResponse.json(
        { error: "invalid_client", error_description: "Invalid client_secret" },
        { status: 401, headers: CORS_HEADERS },
      );
    }
  }

  const token =
    process.env.MCP_API_KEY ||
    "mcp_live_6d3aa896ae8b901c56f32232d6444166f377fcc4b2e44564";

  // -------------------------------------------------------------------------
  // Handle Grant: authorization_code
  // -------------------------------------------------------------------------
  if (grantType === "authorization_code") {
    if (!code) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing code parameter" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const entry = consumeAuthorizationCode(code, clientId || undefined);
    if (!entry) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Authorization code invalid or expired" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(
      {
        access_token: token,
        token_type: "Bearer",
        expires_in: 315360000,
        refresh_token: `ref_${crypto.randomBytes(24).toString("hex")}`,
        scope: entry.scopes.join(" "),
      },
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      },
    );
  }

  // -------------------------------------------------------------------------
  // Handle Grant: client_credentials or refresh_token
  // -------------------------------------------------------------------------
  if (grantType === "client_credentials" || grantType === "refresh_token") {
    return NextResponse.json(
      {
        access_token: token,
        token_type: "Bearer",
        expires_in: 315360000,
        scope: "read:ingredients write:ingredients read:products read:recipes admin:maintenance",
      },
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      },
    );
  }

  return NextResponse.json(
    { error: "unsupported_grant_type", error_description: `Unsupported grant_type: '${grantType}'` },
    { status: 400, headers: CORS_HEADERS },
  );
}
