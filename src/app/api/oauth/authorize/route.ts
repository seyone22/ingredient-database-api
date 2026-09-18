import { NextRequest, NextResponse } from "next/server";
import { createAuthorizationCode } from "@/lib/oauth/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id") || "gemini-spark";
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state") || "";
  const scopeStr =
    searchParams.get("scope") || "read:ingredients write:ingredients read:products";
  const codeChallenge = searchParams.get("code_challenge") || undefined;
  const codeChallengeMethod =
    searchParams.get("code_challenge_method") || undefined;
  const autoApprove = searchParams.get("auto_approve") === "true";

  if (!redirectUri) {
    return new NextResponse("Missing required parameter: redirect_uri", {
      status: 400,
    });
  }

  const scopes = scopeStr.split(/[\s,]+/).filter(Boolean);

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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FoodRepo • Connect Gemini Spark</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <style>
    :root {
      --bg: #f0f1f5;
      --card: #ffffff;
      --border: #e2e8f0;
      --border-focus: #c7d2fe;
      --text-main: #1e293b;
      --text-muted: #64748b;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      --primary-subtle: rgba(99, 102, 241, 0.08);
      --success: #10b981;
      --success-subtle: rgba(16, 185, 129, 0.1);
      --badge-bg: #eef2ff;
      --badge-text: #4338ca;
      --scope-bg: #f8fafc;
      --shadow-card: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0b0f19;
        --card: #151b28;
        --border: #232d3f;
        --border-focus: #4338ca;
        --text-main: #f8fafc;
        --text-muted: #94a3b8;
        --primary: #818cf8;
        --primary-hover: #6366f1;
        --primary-gradient: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
        --primary-subtle: rgba(129, 140, 248, 0.12);
        --success: #34d399;
        --success-subtle: rgba(52, 211, 153, 0.15);
        --badge-bg: rgba(99, 102, 241, 0.2);
        --badge-text: #c7d2fe;
        --scope-bg: rgba(15, 23, 42, 0.6);
        --shadow-card: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem 1rem;
      transition: background-color 0.2s ease;
    }

    .brand-header {
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .brand-logo {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: var(--text-main);
      display: inline-flex;
      align-items: center;
      gap: 0.1rem;
      text-decoration: none;
    }

    .brand-logo .primary-text {
      color: var(--primary);
    }

    .auth-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1.25rem;
      padding: 2.25rem;
      max-width: 480px;
      width: 100%;
      box-shadow: var(--shadow-card);
      transition: all 0.2s ease;
    }

    /* Integration Avatar Bridge */
    .connection-bridge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .avatar {
      width: 52px;
      height: 52px;
      border-radius: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border);
      background: var(--card);
    }

    .avatar-foodrepo {
      background: var(--primary-gradient);
      color: #ffffff;
    }

    .avatar-gemini {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid #334155;
    }

    .bridge-link {
      display: flex;
      align-items: center;
      color: var(--text-muted);
      position: relative;
    }

    .bridge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--primary);
      box-shadow: 0 0 8px var(--primary);
      animation: pulse 2s infinite ease-in-out;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.4; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.3); }
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--badge-bg);
      color: var(--badge-text);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }

    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0 0 0.5rem 0;
      line-height: 1.3;
    }

    p.description {
      color: var(--text-muted);
      font-size: 0.9rem;
      line-height: 1.5;
      margin: 0 0 1.5rem 0;
    }

    /* Scopes Container */
    .scopes-container {
      background: var(--scope-bg);
      border: 1px solid var(--border);
      border-radius: 0.875rem;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .scope-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .scope-icon {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: var(--success-subtle);
      color: var(--success);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .scope-details {
      flex: 1;
    }

    .scope-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-main);
      margin: 0 0 0.2rem 0;
    }

    .scope-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.4;
      margin: 0;
    }

    /* Meta bar */
    .meta-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 0.85rem;
      background: var(--primary-subtle);
      border-radius: 0.625rem;
      margin-bottom: 1.5rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .meta-box strong {
      color: var(--primary);
    }

    /* Form Buttons */
    .actions {
      display: flex;
      gap: 0.75rem;
    }

    button {
      flex: 1;
      padding: 0.85rem 1.25rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-approve {
      background: var(--primary);
      color: #ffffff;
      border: 1px solid transparent;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
    }

    .btn-approve:hover {
      background: var(--primary-hover);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
      transform: translateY(-1px);
    }

    .btn-deny {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border);
    }

    .btn-deny:hover {
      background: var(--scope-bg);
      color: var(--text-main);
    }

    /* Footer */
    .auth-footer {
      margin-top: 1.5rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      text-align: center;
    }

    .auth-footer a {
      color: var(--primary);
      text-decoration: none;
    }

    .auth-footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>

  <div class="brand-header">
    <div class="brand-logo">
      <span class="primary-text">Food</span>Repo
    </div>
  </div>

  <div class="auth-card">

    <div class="connection-bridge">
      <div class="avatar avatar-foodrepo" title="FoodRepo Culinary Knowledge Base">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>
        </svg>
      </div>

      <div class="bridge-link">
        <div class="bridge-dot"></div>
      </div>

      <div class="avatar avatar-gemini" title="Google Gemini Spark">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#38BDF8"/>
        </svg>
      </div>
    </div>

    <div style="text-align: center;">
      <span class="badge">Model Context Protocol</span>
      <h1>Connect to FoodRepo</h1>
      <p class="description">
        <strong>Gemini Spark</strong> is requesting permission to interface with your FoodRepo culinary intelligence knowledge base.
      </p>
    </div>

    <div class="scopes-container">
      <div class="scope-item">
        <div class="scope-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="scope-details">
          <div class="scope-title">Search & Browse Ingredients</div>
          <p class="scope-desc">Access 20,800+ canonical ingredients, organoleptic flavor profiles, dietary flags, and regional sub-cuisines.</p>
        </div>
      </div>

      <div class="scope-item">
        <div class="scope-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="scope-details">
          <div class="scope-title">Live Retail Supermarket Pricing</div>
          <p class="scope-desc">Query live price quotes, pack sizes, and availability across Keells, Cargills, and Glomark.</p>
        </div>
      </div>

      <div class="scope-item">
        <div class="scope-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="scope-details">
          <div class="scope-title">Contribute & Enrich Intelligence</div>
          <p class="scope-desc">Submit newly discovered ingredients and update metadata with automated audit logging.</p>
        </div>
      </div>
    </div>

    <div class="meta-box">
      <span>OAuth Client: <strong>${clientId}</strong></span>
      <span>Audit: <strong>Logged</strong></span>
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
        <button type="submit" class="btn-approve">
          Authorize Access
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </form>
  </div>

  <div class="auth-footer">
    © ${new Date().getFullYear()} <span style="font-weight: 600;"><span style="color: var(--primary);">Food</span>Repo</span> by Seyone Gunasingham
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
  const scopeStr =
    (formData.get("scope") as string) ||
    "read:ingredients write:ingredients read:products";
  const codeChallenge = (formData.get("code_challenge") as string) || undefined;
  const codeChallengeMethod =
    (formData.get("code_challenge_method") as string) || undefined;

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
