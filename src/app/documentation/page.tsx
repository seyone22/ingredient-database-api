"use client";

import { useState } from "react";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import { RedocStandalone } from "redoc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Terminal,
  Play,
  Copy,
  Check,
  BookOpen,
  FileCode,
  Sliders,
} from "lucide-react";

interface EndpointInfo {
  id: string;
  method: "GET" | "POST";
  path: string;
  title: string;
  description: string;
  params: { name: string; type: string; required: boolean; defaultVal: string; desc: string }[];
  curlFn: (params: Record<string, string>) => string;
  tsFn: (params: Record<string, string>) => string;
  dartFn: (params: Record<string, string>) => string;
  pythonFn: (params: Record<string, string>) => string;
}

const ENDPOINTS: EndpointInfo[] = [
  {
    id: "search-ingredients",
    method: "GET",
    path: "/api/ingredients",
    title: "Search & Faceted Filter Ingredients",
    description: "Query 20,800+ canonical ingredients with multi-dimensional filtering across country, state sub-regions, cuisines, flavor profiles, and dietary compliance flags.",
    params: [
      { name: "query", type: "string", required: true, defaultVal: "turmeric", desc: "Search term matching ingredient name or aliases" },
      { name: "region", type: "string", required: false, defaultVal: "South Asia", desc: "Filter by sub-region state hierarchy (e.g., 'Tamil Nadu', 'Punjab')" },
      { name: "cuisine", type: "string", required: false, defaultVal: "", desc: "Filter by culinary tradition (e.g., 'Chettinad', 'Mughlai')" },
      { name: "limit", type: "number", required: false, defaultVal: "10", desc: "Items per page (default: 20)" },
    ],
    curlFn: (p) => {
      const q = new URLSearchParams(p).toString();
      return `curl -X GET "http://localhost:3000/api/ingredients?${q}"`;
    },
    tsFn: (p) => {
      const q = new URLSearchParams(p).toString();
      return `const response = await fetch('/api/ingredients?${q}');
const data = await response.json();
console.log(data.results);`;
    },
    dartFn: (p) => {
      const q = new URLSearchParams(p).toString();
      return `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('https://your-api-domain.com/api/ingredients?${q}');
final response = await http.get(url);
final data = jsonDecode(response.body);
print(data['results']);`;
    },
    pythonFn: (p) => {
      const q = new URLSearchParams(p).toString();
      return `import requests

response = requests.get('http://localhost:3000/api/ingredients?${q}')
data = response.json()
print(data['results'])`;
    },
  },
  {
    id: "quality-metrics",
    method: "GET",
    path: "/api/admin/quality",
    title: "Data Quality & Anomaly Detector Metrics",
    description: "Retrieve real-time database health score, potential duplicate candidate pairs, orphan ingredient lists, and un-enriched metadata stats.",
    params: [],
    curlFn: () => `curl -X GET "http://localhost:3000/api/admin/quality"`,
    tsFn: () => `const res = await fetch('/api/admin/quality');
const quality = await res.json();
console.log('Health Score:', quality.healthScore);`,
    dartFn: () => `final url = Uri.parse('https://your-api-domain.com/api/admin/quality');
final response = await http.get(url);
final quality = jsonDecode(response.body);
print('Health Score: \${quality['healthScore']}');`,
    pythonFn: () => `import requests

res = requests.get('http://localhost:3000/api/admin/quality')
print('Health Score:', res.json()['healthScore'])`,
  },
  {
    id: "analytics",
    method: "GET",
    path: "/api/admin/analytics",
    title: "Culinary & Regional Intelligence Analytics",
    description: "Fetch market distribution across Macro-Regions, South Asian State Hierarchies (Punjab, Kerala, Tamil Nadu, etc.), Cuisines, and Flavor Profiles.",
    params: [],
    curlFn: () => `curl -X GET "http://localhost:3000/api/admin/analytics"`,
    tsFn: () => `const res = await fetch('/api/admin/analytics');
const analytics = await res.json();
console.log(analytics.southAsianSubregions);`,
    dartFn: () => `final url = Uri.parse('https://your-api-domain.com/api/admin/analytics');
final response = await http.get(url);
final analytics = jsonDecode(response.body);
print(analytics['southAsianSubregions']);`,
    pythonFn: () => `import requests

res = requests.get('http://localhost:3000/api/admin/analytics')
print(res.json()['southAsianSubregions'])`,
  },
  {
    id: "enhance-image",
    method: "POST",
    path: "/api/ingredients/enhance/image",
    title: "Trigger 6-Tier Image Ingestion Waterfall",
    description: "Enrich missing ingredient image using culinary-scored 6-tier open-source waterfall (Wikidata SPARQL, Wikipedia Lead, Wikimedia Search, Open Food Facts, Unsplash, Pexels).",
    params: [
      { name: "ingredientId", type: "string (UUID)", required: true, defaultVal: "d3b07384-d113-40e4-a74d-5c628e08d660", desc: "Target ingredient UUID" },
    ],
    curlFn: (p) => `curl -X POST "http://localhost:3000/api/ingredients/enhance/image" \\
  -H "Content-Type: application/json" \\
  -d '{"ingredientId": "${p.ingredientId || "UUID"}"}'`,
    tsFn: (p) => `const res = await fetch('/api/ingredients/enhance/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ingredientId: '${p.ingredientId || "UUID"}' })
});
const updated = await res.json();`,
    dartFn: (p) => `final url = Uri.parse('https://your-api-domain.com/api/ingredients/enhance/image');
final response = await http.post(
  url,
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'ingredientId': '${p.ingredientId || "UUID"}'}),
);`,
    pythonFn: (p) => `import requests

res = requests.post('http://localhost:3000/api/ingredients/enhance/image', json={'ingredientId': '${p.ingredientId || "UUID"}'})
print(res.json())`,
  },
];

export default function DocumentationPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo>(ENDPOINTS[0]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({ query: "turmeric", region: "South Asia", limit: "10" });
  const [codeLang, setCodeLang] = useState<"curl" | "ts" | "dart" | "python">("curl");
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"interactive" | "redoc">("interactive");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<number | null>(null);

  const handleSelectEndpoint = (ep: EndpointInfo) => {
    setSelectedEndpoint(ep);
    setTestResult(null);
    setTestStatus(null);
    const initial: Record<string, string> = {};
    ep.params.forEach((p) => {
      if (p.defaultVal) initial[p.name] = p.defaultVal;
    });
    setParamValues(initial);
  };

  const handleParamChange = (name: string, val: string) => {
    setParamValues((prev) => ({ ...prev, [name]: val }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTryItOut = async () => {
    setTestLoading(true);
    setTestResult(null);
    setTestStatus(null);
    try {
      let url = selectedEndpoint.path;
      let options: RequestInit = { method: selectedEndpoint.method };

      if (selectedEndpoint.method === "GET") {
        const activeParams: Record<string, string> = {};
        Object.entries(paramValues).forEach(([k, v]) => {
          if (v.trim()) activeParams[k] = v.trim();
        });
        const q = new URLSearchParams(activeParams).toString();
        if (q) url += `?${q}`;
      } else if (selectedEndpoint.method === "POST") {
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paramValues),
        };
      }

      const res = await fetch(url, options);
      setTestStatus(res.status);
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestStatus(500);
      setTestResult(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setTestLoading(false);
    }
  };

  const getActiveSnippet = () => {
    const activeParams: Record<string, string> = {};
    Object.entries(paramValues).forEach(([k, v]) => {
      if (v.trim()) activeParams[k] = v.trim();
    });

    switch (codeLang) {
      case "curl": return selectedEndpoint.curlFn(activeParams);
      case "ts": return selectedEndpoint.tsFn(activeParams);
      case "dart": return selectedEndpoint.dartFn(activeParams);
      case "python": return selectedEndpoint.pythonFn(activeParams);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
      <NavBar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                API Version 2.0.0
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-primary" /> FoodRepo Developer Documentation & Interactive API Playground
            </h1>
            <p className="text-muted-foreground text-sm">
              Explore interactive parameters, copy production SDK snippets, and test live queries against 20,800+ culinary ingredients.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("interactive")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "interactive"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "border border-input bg-background hover:bg-accent text-muted-foreground"
              }`}
            >
              <Terminal className="w-4 h-4 inline mr-1.5" /> Interactive Explorer
            </button>
            <button
              onClick={() => setViewMode("redoc")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "redoc"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "border border-input bg-background hover:bg-accent text-muted-foreground"
              }`}
            >
              <FileCode className="w-4 h-4 inline mr-1.5" /> OpenAPI Redoc
            </button>
          </div>
        </div>

        {viewMode === "redoc" ? (
          <Card className="border-border/60 bg-card overflow-hidden">
            <CardContent className="p-0 min-h-[700px]">
              <RedocStandalone
                specUrl="/docs/api/openapi.yaml"
                options={{
                  scrollYOffset: 0,
                  hideDownloadButton: false,
                  hideHostname: false,
                  theme: {
                    colors: {
                      primary: { main: "#38bdf8" },
                      responses: { success: { color: "#22c55e" } },
                    },
                  },
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sidebar Endpoint Navigation (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                API Endpoints ({ENDPOINTS.length})
              </h3>
              <div className="space-y-1.5">
                {ENDPOINTS.map((ep) => (
                  <button
                    key={ep.id}
                    onClick={() => handleSelectEndpoint(ep)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      selectedEndpoint.id === ep.id
                        ? "bg-primary/10 border-primary/40 text-foreground shadow-sm"
                        : "bg-card/50 border-border/60 hover:bg-accent hover:border-border text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ep.method === "GET" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                      }`}>
                        {ep.method}
                      </span>
                      <code className="text-xs font-mono font-semibold text-foreground">{ep.path}</code>
                    </div>
                    <div className="text-sm font-semibold text-foreground line-clamp-1">{ep.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Endpoint Inspector & Code Playground (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Endpoint Overview Card */}
              <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                      selectedEndpoint.method === "GET" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                    }`}>
                      {selectedEndpoint.method}
                    </span>
                    <code className="text-base font-mono font-bold text-foreground">{selectedEndpoint.path}</code>
                  </div>
                  <CardTitle className="text-xl font-bold text-foreground">
                    {selectedEndpoint.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedEndpoint.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Interactive Parameter Inputs */}
                  {selectedEndpoint.params.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Sliders className="w-4 h-4 text-primary" /> Interactive Query Parameters
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/20">
                        {selectedEndpoint.params.map((p) => (
                          <div key={p.name} className="space-y-1">
                            <label className="text-xs font-mono font-semibold text-foreground flex items-center justify-between">
                              <span>{p.name} {p.required && <span className="text-rose-500">*</span>}</span>
                              <span className="text-[10px] text-muted-foreground">{p.type}</span>
                            </label>
                            <input
                              type="text"
                              value={paramValues[p.name] ?? ""}
                              onChange={(e) => handleParamChange(p.name, e.target.value)}
                              placeholder={p.defaultVal || p.desc}
                              className="w-full px-3 py-1.5 rounded-md border border-input bg-background text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Code Snippets & Language Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-1 bg-muted p-1 rounded-lg">
                        {(["curl", "ts", "dart", "python"] as const).map((lang) => (
                          <button
                            key={lang}
                            onClick={() => setCodeLang(lang)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold uppercase transition-colors ${
                              codeLang === lang ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {lang === "ts" ? "TypeScript" : lang === "dart" ? "Flutter (Dart)" : lang}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => handleCopy(getActiveSnippet())}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border border-border bg-background hover:bg-accent text-muted-foreground"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied!" : "Copy Code"}
                      </button>
                    </div>

                    <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-border/40">
                      <code>{getActiveSnippet()}</code>
                    </pre>
                  </div>

                  {/* Try It Out Playground */}
                  <div className="pt-4 border-t border-border">
                    <button
                      onClick={handleTryItOut}
                      disabled={testLoading}
                      className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Play className="w-4 h-4 fill-current" /> {testLoading ? "Executing Query..." : `Test ${selectedEndpoint.method} ${selectedEndpoint.path}`}
                    </button>

                    {testResult && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className={`font-semibold ${testStatus === 200 ? "text-emerald-500" : "text-rose-500"}`}>
                            {testStatus} {testStatus === 200 ? "OK" : "Response"} — Live API Result
                          </span>
                          <span>JSON Payload</span>
                        </div>
                        <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs max-h-80 overflow-y-auto border border-border/40">
                          <code>{testResult}</code>
                        </pre>
                      </div>
                    )}
                  </div>

                </CardContent>
              </Card>

            </div>

          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
