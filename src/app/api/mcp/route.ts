import { NextRequest, NextResponse } from "next/server";
import { verifyMcpAuth } from "@/lib/mcp/auth";
import { mcpTools, mcpResources } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Mcp-Method, Mcp-Name, Mcp-Session-Id",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function getPublicOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return host && !host.includes("localhost")
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL || "https://food.seyone.dev";
}

export async function GET(req: NextRequest) {
  const origin = getPublicOrigin(req);
  // Support simple status checks or protocol info
  return NextResponse.json(
    {
      status: "online",
      server: "foodrepo-mcp-server",
      transport: "Streamable HTTP (POST /api/mcp)",
      spec: "Model Context Protocol",
      documentation: `${origin}/documentation`,
    },
    { headers: CORS_HEADERS },
  );
}

export async function POST(req: NextRequest) {
  // 1. Authenticate Request
  const auth = await verifyMcpAuth(req);

  if (!auth.authenticated) {
    const origin = getPublicOrigin(req);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Unauthorized: Valid Bearer token required.",
        },
        id: null,
      },
      {
        status: 401,
        headers: {
          ...CORS_HEADERS,
          "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
        },
      },
    );
  }

  // 2. Parse JSON-RPC Payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32700, message: "Invalid JSON-RPC payload" },
        id: null,
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { method, params, id = null } = body || {};

  // 3. Dispatch Methods
  switch (method) {
    // -----------------------------------------------------------------------
    // MCP Lifecycle: Handshake
    // -----------------------------------------------------------------------
    case "initialize":
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "foodrepo-mcp-server",
              version: "2.0.0",
            },
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
            },
            instructions:
              "FoodRepo MCP Server provides comprehensive culinary intelligence, faceted search, live supermarket pricing, and canonical ingredient curation for Gemini Spark.",
          },
        },
        { headers: CORS_HEADERS },
      );

    case "notifications/initialized":
      return new NextResponse(null, {
        status: 204,
        headers: CORS_HEADERS,
      });

    // -----------------------------------------------------------------------
    // MCP Tools: Discovery
    // -----------------------------------------------------------------------
    case "tools/list": {
      const tools = Object.values(mcpTools).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      }));

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: { tools },
        },
        { headers: CORS_HEADERS },
      );
    }

    // -----------------------------------------------------------------------
    // MCP Tools: Execution
    // -----------------------------------------------------------------------
    case "tools/call": {
      const { name, arguments: toolArgs } = params || {};
      const targetTool = mcpTools[name];

      if (!targetTool) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Requested tool '${name}' was not found`,
            },
          },
          { headers: CORS_HEADERS },
        );
      }

      try {
        const data = await targetTool.handler(toolArgs || {}, auth);
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
                },
              ],
              isError: false,
            },
          },
          { headers: CORS_HEADERS },
        );
      } catch (err: any) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Error executing tool '${name}': ${err?.message || err}`,
                },
              ],
              isError: true,
            },
          },
          { headers: CORS_HEADERS },
        );
      }
    }

    // -----------------------------------------------------------------------
    // MCP Resources: List & Read
    // -----------------------------------------------------------------------
    case "resources/list":
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: { resources: mcpResources },
        },
        { headers: CORS_HEADERS },
      );

    case "resources/read": {
      const { uri } = params || {};
      if (uri === "foodrepo://taxonomies/cuisines") {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify([
                    "Sri Lankan",
                    "South Indian",
                    "North Indian",
                    "Chettinad",
                    "Mughlai",
                    "Kerala",
                    "Italian",
                    "Chinese",
                    "Sichuan",
                    "Thai",
                    "Japanese",
                    "Mexican",
                    "Mediterranean",
                  ]),
                },
              ],
            },
          },
          { headers: CORS_HEADERS },
        );
      }

      if (uri === "foodrepo://taxonomies/dietary-flags") {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify([
                    "Vegan",
                    "Vegetarian",
                    "Gluten-Free",
                    "Halal",
                    "Kosher",
                    "Dairy-Free",
                    "Nut-Free",
                  ]),
                },
              ],
            },
          },
          { headers: CORS_HEADERS },
        );
      }

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: `Resource '${uri}' not found` },
        },
        { headers: CORS_HEADERS },
      );
    }

    // -----------------------------------------------------------------------
    // MCP Health & Utility
    // -----------------------------------------------------------------------
    case "ping":
      return NextResponse.json(
        { jsonrpc: "2.0", id, result: {} },
        { headers: CORS_HEADERS },
      );

    default:
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method '${method}' is not implemented by this server`,
          },
        },
        { headers: CORS_HEADERS },
      );
  }
}
