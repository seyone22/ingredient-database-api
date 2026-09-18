import { NextRequest, NextResponse } from "next/server";
import { createAuthorizationCode } from "@/lib/oauth/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id") || "gemini-spark";
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state") || "";
  const scopeStr = searchParams.get("scope") || "read:ingredients write:ingredients read:products";
  const codeChallenge = searchParams.get("code_challenge") || undefined;
  const codeChallengeMethod = searchParams.get("code_challenge_method") || undefined;
  const autoApprove = searchParams.get("auto_approve") === "true";

  if (!redirectUri) {
    return new NextResponse("Missing required parameter: redirect_uri", {
      status: 400,
    });
  }

  const scopes = scopeStr.split(/[\s,]+/).filter(Boolean);

  // If auto-approve flag is present, redirect immediately
  if (autoApprove) {
    const code = createAuthorizationCode({
      clientId,
      redirectUri,
      scopes,
      codeChallenge,
      codeChallengeMethod,
    });

    const targetUrl = new URL(redirectUri);
    targetUrl.searchParams.set("code", code);
    if (state) targetUrl.searchParams.set("state", state);
    return NextResponse.redirect(targetUrl.toString());
  }

  // Render HTML Consent Form
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FoodRepo • Authorize Gemini Spark</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --text: #f8fafc;
      --muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0284c7;
      --border: #334155;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 2rem;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: rgba(56, 189, 248, 0.15);
      color: var(--primary);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
    }
    p {
      color: var(--muted);
      font-size: 0.875rem;
      line-height: 1.4;
      margin: 0 0 1.5rem 0;
    }
    .scope-list {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }
    .scope-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.825rem;
      color: #e2e8f0;
      margin-bottom: 0.5rem;
    }
    .scope-item:last-child {
      margin-bottom: 0;
    }
    .check {
      color: #4ade80;
      font-weight: bold;
    }
    .actions {
      display: flex;
      gap: 0.75rem;
    }
    button {
      flex: 1;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-approve {
      background: var(--primary);
      color: #0f172a;
      border: none;
    }
    .btn-approve:hover {
      background: var(--primary-hover);
    }
    .btn-deny {
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--border);
    }
    .btn-deny:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Model Context Protocol</span>
    <h1>Connect to FoodRepo</h1>
    <p><strong>Gemini Spark</strong> is requesting permission to access your FoodRepo culinary intelligence knowledge base.</p>

    <div class="scope-list">
      <div class="scope-item"><span class="check">✓</span> Search & view canonical ingredients</div>
      <div class="scope-item"><span class="check">✓</span> Retrieve live supermarket retail pricing</div>
      <div class="scope-item"><span class="check">✓</span> Contribute new culinary items & metadata</div>
    </div>

    <form method="POST">
      <input type="hidden" name="client_id" value="${clientId}">
      <input type="hidden" name="redirect_uri" value="${redirectUri}">
      <input type="hidden" name="state" value="${state}">
      <input type="hidden" name="scope" value="${scopeStr}">
      ${codeChallenge ? `<input type="hidden" name="code_challenge" value="${codeChallenge}">` : ""}
      ${codeChallengeMethod ? `<input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}">` : ""}
      <div class="actions">
        <button type="button" class="btn-deny" onclick="window.close()">Cancel</button>
        <button type="submit" class="btn-approve">Authorize Access</button>
      </div>
    </form>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const clientId = (formData.get("client_id") as string) || "gemini-spark";
  const redirectUri = formData.get("redirect_uri") as string;
  const state = (formData.get("state") as string) || "";
  const scopeStr = (formData.get("scope") as string) || "read:ingredients write:ingredients read:products";
  const codeChallenge = (formData.get("code_challenge") as string) || undefined;
  const codeChallengeMethod = (formData.get("code_challenge_method") as string) || undefined;

  if (!redirectUri) {
    return new NextResponse("Missing redirect_uri", { status: 400 });
  }

  const scopes = scopeStr.split(/[\s,]+/).filter(Boolean);

  const code = createAuthorizationCode({
    clientId,
    redirectUri,
    scopes,
    codeChallenge,
    codeChallengeMethod,
  });

  const targetUrl = new URL(redirectUri);
  targetUrl.searchParams.set("code", code);
  if (state) targetUrl.searchParams.set("state", state);

  return NextResponse.redirect(targetUrl.toString(), 302);
}
