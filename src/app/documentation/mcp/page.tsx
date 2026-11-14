"use client";

import {
  BookOpen,
  Check,
  Code,
  Copy,
  KeyRound,
  Plug,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Footer from "@/components/footer/Footer";
import NavBar from "@/components/navbar/NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface McpToolDoc {
  name: string;
  title: string;
  readOnly: boolean;
  scope: string;
  description: string;
  params: {
    name: string;
    type: string;
    required?: boolean;
    description: string;
  }[];
  exampleArgs: string;
}

const MCP_TOOLS: McpToolDoc[] = [
  {
    name: "search_ingredients",
    title: "Search Ingredients",
    readOnly: true,
    scope: "read:ingredients",
    description:
      "Search canonical culinary ingredients across names, multilingual aliases, country of origin, regional sub-cuisines, and organoleptic flavor profiles.",
    params: [
      {
        name: "query",
        type: "string",
        description:
          "Keyword for ingredient name or alias (e.g. 'cinnamon', 'goraka')",
      },
      {
        name: "cuisine",
        type: "string",
        description:
          "Culinary tradition filter (e.g. 'Sri Lankan', 'Indian', 'Italian')",
      },
      {
        name: "country",
        type: "string",
        description: "Country of origin filter (e.g. 'Sri Lanka', 'India')",
      },
      {
        name: "region",
        type: "string",
        description:
          "Regional hierarchy filter (e.g. 'South Asia', 'Mediterranean')",
      },
      {
        name: "flavor",
        type: "string",
        description:
          "Organoleptic flavor attribute (e.g. 'Sour', 'Aromatic', 'Umami')",
      },
      {
        name: "page",
        type: "integer",
        description: "1-indexed pagination page (default: 1)",
      },
      {
        name: "limit",
        type: "integer",
        description: "Records per page, max 50 (default: 15)",
      },
      {
        name: "includeProducts",
        type: "boolean",
        description:
          "Attach mapped retail products and barcodes (default: false)",
      },
    ],
    exampleArgs: JSON.stringify(
      { query: "goraka", cuisine: "Sri Lankan", limit: 5 },
      null,
      2,
    ),
  },
  {
    name: "get_ingredient_details",
    title: "Get Ingredient Details",
    readOnly: true,
    scope: "read:ingredients",
    description:
      "Retrieve the full canonical specification for an ingredient by UUID, including USDA nutritional facts, flavor pairings, botanical varieties, and culinary derivatives.",
    params: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "Unique UUID of the canonical ingredient",
      },
      {
        name: "includeProducts",
        type: "boolean",
        description:
          "Attach mapped supermarket retail products (default: true)",
      },
    ],
    exampleArgs: JSON.stringify(
      { id: "00000000-0000-0000-0000-000000000000", includeProducts: true },
      null,
      2,
    ),
  },
  {
    name: "get_ingredient_prices",
    title: "Get Ingredient Prices",
    readOnly: true,
    scope: "read:products",
    description:
      "Fetch live retail pricing, stock status, pack sizes, and store availability across Sri Lankan supermarket chains (Keells, Cargills Online, Glomark).",
    params: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "Unique UUID of the canonical ingredient",
      },
    ],
    exampleArgs: JSON.stringify(
      { id: "00000000-0000-0000-0000-000000000000" },
      null,
      2,
    ),
  },
  {
    name: "match_ingredient",
    title: "Match Ingredient Semantics",
    readOnly: true,
    scope: "read:ingredients",
    description:
      "Performs semantic embedding vector matching to resolve raw recipe text or supermarket product descriptions to the closest canonical ingredient.",
    params: [
      {
        name: "query",
        type: "string",
        required: true,
        description:
          "Raw food name or product phrase (e.g. 'Ceylon Cinnamon sticks 50g')",
      },
    ],
    exampleArgs: JSON.stringify(
      { query: "Ceylon Cinnamon sticks 50g" },
      null,
      2,
    ),
  },
];

const MCP_CONFIG_SNIPPET = `{
  "mcpServers": {
    "foodrepo": {
      "serverUrl": "https://food.seyone.dev/api/mcp"
    }
  }
}`;

const CURL_DISCOVERY_SNIPPET = `# 1. Check server status & transport
curl -s https://food.seyone.dev/api/mcp

# 2. List available MCP tools (requires Bearer token or OAuth 2.1)
curl -s -X POST https://food.seyone.dev/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <YOUR_TOKEN>" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`;

export default function McpDocumentationPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
      <NavBar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                Model Context Protocol (MCP)
              </span>
              <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-full font-mono">
                Streamable HTTP
              </span>
              <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-full font-mono">
                OAuth 2.1 + Bearer
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Plug className="w-8 h-8 text-primary" /> FoodRepo MCP Server
              &amp; Plugin Documentation
            </h1>
            <p className="text-muted-foreground text-sm max-w-3xl">
              Connect AI agents (Antigravity, Claude, Cursor, and custom MCP
              clients) to 20,000+ canonical ingredients, botanical taxonomy,
              USDA nutrition profiles, semantic recipe matching, and live Sri
              Lankan supermarket pricing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/documentation"
              className="px-3.5 py-2 rounded-lg text-xs font-medium border border-border/80 bg-background hover:bg-muted/80 text-foreground inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" /> REST API
              Playground
            </Link>
          </div>
        </div>

        {/* Endpoint & Auth Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" /> Remote MCP
                Endpoint
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="font-mono text-foreground bg-muted/60 px-2.5 py-1.5 rounded-md border border-border break-all">
                https://food.seyone.dev/api/mcp
              </div>
              <p>
                Supports <code className="font-mono text-foreground">GET</code>{" "}
                (discovery/status) and{" "}
                <code className="font-mono text-foreground">POST</code>{" "}
                (JSON-RPC 2.0 Streamable HTTP) with full CORS support.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" /> Authentication
                &amp; OAuth 2.1
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                Supports static Bearer API keys and OAuth 2.1 authorization with{" "}
                <code className="font-mono text-foreground">
                  /.well-known/oauth-protected-resource
                </code>{" "}
                discovery.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="font-mono px-2 py-0.5 rounded bg-muted border border-border text-foreground">
                  read:ingredients
                </span>
                <span className="font-mono px-2 py-0.5 rounded bg-muted border border-border text-foreground">
                  read:products
                </span>
                <span className="font-mono px-2 py-0.5 rounded bg-muted border border-border text-foreground">
                  read:recipes
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Strictly
                Read-Only MCP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                All 4 exposed MCP tools are strictly read-only (
                <code className="font-mono text-foreground">
                  readOnlyHint: true
                </code>
                ,{" "}
                <code className="font-mono text-foreground">
                  destructiveHint: false
                </code>
                ). Database mutations are disabled over MCP.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Client Configuration & Discovery */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" /> Antigravity / MCP
                Client Config
              </CardTitle>
              <button
                type="button"
                onClick={() => copyText("config", MCP_CONFIG_SNIPPET)}
                className="px-2.5 py-1 rounded-md text-xs font-medium border border-border hover:bg-muted inline-flex items-center gap-1.5"
              >
                {copiedId === "config" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedId === "config" ? "Copied" : "Copy"}
              </button>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Add this to{" "}
                <code className="font-mono text-foreground">
                  mcp_config.json
                </code>{" "}
                in your Antigravity plugin or MCP client configuration:
              </p>
              <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-border">
                {MCP_CONFIG_SNIPPET}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" /> Quick Verification
                (cURL)
              </CardTitle>
              <button
                type="button"
                onClick={() => copyText("curl", CURL_DISCOVERY_SNIPPET)}
                className="px-2.5 py-1 rounded-md text-xs font-medium border border-border hover:bg-muted inline-flex items-center gap-1.5"
              >
                {copiedId === "curl" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedId === "curl" ? "Copied" : "Copy"}
              </button>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Verify server health or inspect the JSON-RPC{" "}
                <code className="font-mono text-foreground">tools/list</code>{" "}
                manifest directly:
              </p>
              <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-border">
                {CURL_DISCOVERY_SNIPPET}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Recommended Agent Workflow */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Recommended Agent
              Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
              <div className="font-semibold text-foreground">
                1. Resolve or Browse
              </div>
              <p>
                Use{" "}
                <code className="font-mono text-foreground">
                  match_ingredient
                </code>{" "}
                for messy recipe lines (e.g. &ldquo;Ceylon Cinnamon sticks
                50g&rdquo;) or{" "}
                <code className="font-mono text-foreground">
                  search_ingredients
                </code>{" "}
                for faceted filtering by cuisine, country, region, or flavor.
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
              <div className="font-semibold text-foreground">
                2. Inspect Nutrition &amp; Taxonomy
              </div>
              <p>
                Pass the resolved UUID to{" "}
                <code className="font-mono text-foreground">
                  get_ingredient_details
                </code>{" "}
                to retrieve USDA nutrition facts, flavor pairings, botanical
                varieties, and culinary derivatives.
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
              <div className="font-semibold text-foreground">
                3. Benchmark Retail Prices
              </div>
              <p>
                Call{" "}
                <code className="font-mono text-foreground">
                  get_ingredient_prices
                </code>{" "}
                with the ingredient UUID to compare live pack sizes, stock, and
                prices across Keells, Cargills Online, and Glomark.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tool Reference */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" /> Exposed MCP Tools (
              {MCP_TOOLS.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {MCP_TOOLS.map((tool) => (
              <Card key={tool.name}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-sm font-bold font-mono text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                        {tool.name}
                      </code>
                      <span className="text-sm font-semibold text-foreground">
                        {tool.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                          tool.readOnly
                            ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400"
                            : "text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400"
                        }`}
                      >
                        {tool.readOnly ? "Read-only" : "Write"}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                        {tool.scope}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    {tool.description}
                  </p>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-0">
                  <div className="lg:col-span-2 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="py-1.5 pr-3 font-medium">Parameter</th>
                          <th className="py-1.5 pr-3 font-medium">Type</th>
                          <th className="py-1.5 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tool.params.map((p) => (
                          <tr
                            key={p.name}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="py-1.5 pr-3 font-mono text-foreground whitespace-nowrap">
                              {p.name}
                              {p.required && (
                                <span className="text-destructive ml-1">*</span>
                              )}
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-muted-foreground whitespace-nowrap">
                              {p.type}
                            </td>
                            <td className="py-1.5 text-muted-foreground">
                              {p.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Example Arguments
                    </div>
                    <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-lg text-xs font-mono overflow-x-auto border border-border">
                      {tool.exampleArgs}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
