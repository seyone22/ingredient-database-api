"use client";

import { useState } from "react";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import { RedocStandalone } from "redoc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Code,
  Terminal,
  Play,
  Copy,
  Check,
  BookOpen,
  FileCode,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface EndpointInfo {
  id: string;
  method: "GET" | "POST";
  path: string;
  title: string;
  description: string;
  params: { name: string; type: string; required: boolean; desc: string }[];
  curl: string;
  tsSnippet: string;
  dartSnippet: string;
  pythonSnippet: string;
}

const ENDPOINTS: EndpointInfo[] = [
  {
    id: "search-ingredients",
    method: "GET",
    path: "/api/ingredients",
    title: "Search & Faceted Filter Ingredients",
    description: "Query 20,800+ canonical ingredients with multi-dimensional filtering across country, state sub-regions, cuisines, flavor profiles, and dietary compliance flags.",
    params: [
      { name: "query", type: "string", required: false, desc: "Search term matching ingredient name or aliases (e.g., 'star anise', 'turmeric')" },
      { name: "country", type: "string", required: false, desc: "Filter by country of origin (e.g., 'India', 'Italy')" },
      { name: "region", type: "string", required: false, desc: "Filter by sub-region state hierarchy (e.g., 'Tamil Nadu', 'Punjab', 'Kerala')" },
      { name: "cuisine", type: "string", required: false, desc: "Filter by culinary tradition (e.g., 'Chettinad', 'Mughlai', 'Bengali')" },
      { name: "flavorProfile", type: "string", required: false, desc: "Filter by flavor note (e.g., 'Spicy', 'Umami', 'Aromatic')" },
      { name: "dietaryFlags", type: "string", required: false, desc: "Filter by dietary compliance (e.g., 'Vegan', 'Gluten-Free')" },
      { name: "page", type: "number", required: false, desc: "Page number (default: 1)" },
      { name: "limit", type: "number", required: false, desc: "Items per page (default: 20)" },
    ],
    curl: `curl -X GET "http://localhost:3000/api/ingredients?query=turmeric&region=South%20Asia&limit=10"`,
    tsSnippet: `const response = await fetch('/api/ingredients?query=turmeric&limit=10');
const data = await response.json();
console.log(data.results);`,
    dartSnippet: `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('https://your-api-domain.com/api/ingredients?query=turmeric');
final response = await http.get(url);
final data = jsonDecode(response.body);
print(data['results']);`,
    pythonSnippet: `import requests

response = requests.get('http://localhost:3000/api/ingredients', params={'query': 'turmeric', 'limit': 10})
data = response.json()
print(data['results'])`,
  },
  {
    id: "quality-metrics",
    method: "GET",
    path: "/api/admin/quality",
    title: "Data Quality & Anomaly Detector Metrics",
    description: "Retrieve real-time database health score, potential duplicate candidate pairs, orphan ingredient lists, and un-enriched metadata stats.",
    params: [],
    curl: `curl -X GET "http://localhost:3000/api/admin/quality"`,
    tsSnippet: `const res = await fetch('/api/admin/quality');
const quality = await res.json();
console.log('Health Score:', quality.healthScore);`,
    dartSnippet: `final url = Uri.parse('https://your-api-domain.com/api/admin/quality');
final response = await http.get(url);
final quality = jsonDecode(response.body);
print('Health Score: \${quality['healthScore']}');`,
    pythonSnippet: `import requests

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
    curl: `curl -X GET "http://localhost:3000/api/admin/analytics"`,
    tsSnippet: `const res = await fetch('/api/admin/analytics');
const analytics = await res.json();
console.log(analytics.southAsianSubregions);`,
    dartSnippet: `final url = Uri.parse('https://your-api-domain.com/api/admin/analytics');
final response = await http.get(url);
final analytics = jsonDecode(response.body);
print(analytics['southAsianSubregions']);`,
    pythonSnippet: `import requests

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
      { name: "ingredientId", type: "string (UUID)", required: true, desc: "Target ingredient UUID" },
    ],
    curl: `curl -X POST "http://localhost:3000/api/ingredients/enhance/image" \\
  -H "Content-Type: application/json" \\
  -d '{"ingredientId": "d3b07384-d113-40e4-a74d-5c628e08d660"}'`,
    tsSnippet: `const res = await fetch('/api/ingredients/enhance/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ingredientId: 'UUID_HERE' })
});
const updated = await res.json();`,
    dartSnippet: `final url = Uri.parse('https://your-api-domain.com/api/ingredients/enhance/image');
final response = await http.post(
  url,
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'ingredientId': 'UUID_HERE'}),
);`,
    pythonSnippet: `import requests

res = requests.post('http://localhost:3000/api/ingredients/enhance/image', json={'ingredientId': 'UUID_HERE'})
print(res.json())`,
  },
];

export default function DocumentationPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo>(ENDPOINTS[0]);
  const [codeLang, setCodeLang] = useState<"curl" | "ts" | "dart" | "python">("curl");
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"interactive" | "redoc">("interactive");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTryItOut = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(selectedEndpoint.path);
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResult(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setTestLoading(false);
    }
  };

  const getActiveSnippet = () => {
    switch (codeLang) {
      case "curl": return selectedEndpoint.curl;
      case "ts": return selectedEndpoint.tsSnippet;
      case "dart": return selectedEndpoint.dartSnippet;
      case "python": return selectedEndpoint.pythonSnippet;
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
              <BookOpen className="w-8 h-8 text-primary" /> FoodRepo Developer Documentation & API Explorer
            </h1>
            <p className="text-muted-foreground text-sm">
              Explore interactive endpoints, copy-paste production SDK snippets, and test live queries against 20,800+ culinary ingredients.
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
                    onClick={() => {
                      setSelectedEndpoint(ep);
                      setTestResult(null);
                    }}
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
                  
                  {/* Query Parameters Table */}
                  {selectedEndpoint.params.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Parameters ({selectedEndpoint.params.length})
                      </h4>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                            <tr>
                              <th className="p-2.5">Name</th>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {selectedEndpoint.params.map((p) => (
                              <tr key={p.name}>
                                <td className="p-2.5 font-mono font-semibold text-primary">{p.name}</td>
                                <td className="p-2.5 text-muted-foreground">{p.type}</td>
                                <td className="p-2.5 text-muted-foreground">{p.desc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
                          <span className="font-semibold text-emerald-500">200 OK — Live API Response</span>
                          <span>Response JSON</span>
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
