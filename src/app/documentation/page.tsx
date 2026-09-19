"use client";

import { useState } from "react";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Terminal,
  Play,
  Copy,
  Check,
  BookOpen,
  Sliders,
  ExternalLink,
  Code,
  Sparkles,
  ShoppingBag,
  Activity,
  Layers,
  Search,
  Clock,
} from "lucide-react";

type CategoryType = "All" | "Recipes" | "Ingredients" | "Supermarkets" | "System";

interface ParamDef {
  name: string;
  type: string;
  required: boolean;
  defaultVal: string;
  desc: string;
  isPath?: boolean;
}

interface EndpointInfo {
  id: string;
  category: "Recipes" | "Ingredients" | "Supermarkets" | "System";
  method: "GET" | "POST";
  path: string;
  title: string;
  description: string;
  params?: ParamDef[];
  defaultBody?: string;
  curlFn: (targetBase: string, path: string, params: Record<string, string>, body?: string) => string;
  tsFn: (targetBase: string, path: string, params: Record<string, string>, body?: string) => string;
  dartFn: (targetBase: string, path: string, params: Record<string, string>, body?: string) => string;
  pythonFn: (targetBase: string, path: string, params: Record<string, string>, body?: string) => string;
}

const ENDPOINTS: EndpointInfo[] = [
  // 1. Recipe Pricing & Ingestion
  {
    id: "parse-and-price-recipe",
    category: "Recipes",
    method: "POST",
    path: "/api/recipes/parse-and-price",
    title: "Parse & Price Recipe (URL or Text)",
    description: "Extracts Schema.org JSON-LD (or uses Gemini AI fallback), parses ingredient lines into typed quantities, matches canonical database ingredients, and calculates dual supermarket checkout and pro-rata costs across Keells, Cargills, Glomark, and SPAR.",
    defaultBody: JSON.stringify(
      {
        rawText: "2 tbsp coconut oil\n1 medium red onion, sliced\n2 cloves garlic, minced\n500g chicken breast cubes\n1 tsp Ceylon cinnamon powder\n1/2 tsp turmeric powder\n1 cup coconut milk",
        options: {
          strategy: "cheapest",
        },
      },
      null,
      2,
    ),
    curlFn: (base, path, _, body) => `curl -X POST "${base}${path.replace("/api", "")}" \\
  -H "Content-Type: application/json" \\
  -d '${(body || "{}").replace(/\n/g, "")}'`,
    tsFn: (base, path, _, body) => `const response = await fetch('${base}${path.replace("/api", "")}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${body || "{}"}),
});
const data = await response.json();
console.log(data);`,
    dartFn: (base, path, _, body) => `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('${base}${path.replace("/api", "")}');
final response = await http.post(
  url,
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode(${body || "{}"}),
);
final data = jsonDecode(response.body);
print(data);`,
    pythonFn: (base, path, _, body) => `import requests

payload = ${body || "{}"}
response = requests.post('${base}${path.replace("/api", "")}', json=payload)
data = response.json()
print(data)`,
  },
  {
    id: "price-recipe-jsonld",
    category: "Recipes",
    method: "POST",
    path: "/api/recipes/pricing",
    title: "Price Schema.org JSON-LD Recipe",
    description: "Computes store-by-store retail basket pricing, item offers, and per-portion pro-rata recipe costs for an existing Schema.org Recipe data structure.",
    defaultBody: JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": "Quick Breakfast Omelette",
        "recipeYield": "2 servings",
        "recipeIngredient": [
          "4 large eggs",
          "1 medium tomato, diced",
          "1 green chilli, finely sliced",
          "50g Anchor salted butter",
          "1/4 tsp black pepper powder",
        ],
      },
      null,
      2,
    ),
    curlFn: (base, path, _, body) => `curl -X POST "${base}${path.replace("/api", "")}" \\
  -H "Content-Type: application/json" \\
  -d '${(body || "{}").replace(/\n/g, "")}'`,
    tsFn: (base, path, _, body) => `const response = await fetch('${base}${path.replace("/api", "")}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${body || "{}"}),
});
const data = await response.json();
console.log(data);`,
    dartFn: (base, path, _, body) => `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('${base}${path.replace("/api", "")}');
final response = await http.post(
  url,
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode(${body || "{}"}),
);
final data = jsonDecode(response.body);
print(data);`,
    pythonFn: (base, path, _, body) => `import requests

payload = ${body || "{}"}
response = requests.post('${base}${path.replace("/api", "")}', json=payload)
data = response.json()
print(data)`,
  },

  // 2. Ingredient Intelligence
  {
    id: "search-ingredients",
    category: "Ingredients",
    method: "GET",
    path: "/api/ingredients",
    title: "Search & Faceted Filter Ingredients",
    description: "Query 20,800+ canonical culinary ingredients with multi-dimensional filtering across country, state sub-regions, cuisines, flavor profiles, and dietary compliance flags.",
    params: [
      { name: "query", type: "string", required: false, defaultVal: "turmeric", desc: "Search term matching ingredient name, aliases, or botanical names" },
      { name: "region", type: "string", required: false, defaultVal: "South Asia", desc: "Filter by sub-region state hierarchy (e.g., 'Tamil Nadu', 'Punjab')" },
      { name: "cuisine", type: "string", required: false, defaultVal: "Sri Lankan", desc: "Filter by culinary tradition" },
      { name: "limit", type: "number", required: false, defaultVal: "10", desc: "Items per page (max 100)" },
    ],
    curlFn: (base, path, p) => {
      const q = new URLSearchParams(p).toString();
      return `curl -X GET "${base}${path.replace("/api", "")}?${q}"`;
    },
    tsFn: (base, path, p) => {
      const q = new URLSearchParams(p).toString();
      return `const response = await fetch('${base}${path.replace("/api", "")}?${q}');
const data = await response.json();
console.log(data.results);`;
    },
    dartFn: (base, path, p) => {
      const q = new URLSearchParams(p).toString();
      return `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('${base}${path.replace("/api", "")}?${q}');
final response = await http.get(url);
final data = jsonDecode(response.body);
print(data['results']);`;
    },
    pythonFn: (base, path, p) => {
      const q = new URLSearchParams(p).toString();
      return `import requests

response = requests.get('${base}${path.replace("/api", "")}?${q}')
data = response.json()
print(data['results'])`;
    },
  },
  {
    id: "vector-search-ingredients",
    category: "Ingredients",
    method: "GET",
    path: "/api/ingredients/vector",
    title: "Semantic Vector Similarity Search",
    description: "Find ingredients by culinary concepts, sensory descriptors, or substitution queries using 768-dimensional Gemini embeddings powered by PostgreSQL pgvector HNSW indexing.",
    params: [
      { name: "query", type: "string", required: true, defaultVal: "tangy citrus herb for tempering fish curry", desc: "Natural language sensory or culinary query" },
      { name: "limit", type: "number", required: false, defaultVal: "5", desc: "Number of nearest neighbors to return" },
    ],
    curlFn: (base, path, p) => {
      const q = new URLSearchParams(p).toString();
      return `curl -X GET "${base}${path.replace("/api", "")}?${q}"`;
    },
    tsFn: (base, path, p) => {
      const q = new URLSearchParams(p).toString();
      return `const response = await fetch('${base}${path.replace("/api", "")}?${q}');
const data = await response.json();
console.log(data);`;
    },
    dartFn: (base, path, p) => {
      const q = new URLSearchParams(p).toString();
      return `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('${base}${path.replace("/api", "")}?${q}');
final response = await http.get(url);
final data = jsonDecode(response.body);
print(data);`;
    },
    pythonFn: (base, path, p) => {
      const q = new URLSearchParams(p).toString();
      return `import requests

response = requests.get('${base}${path.replace("/api", "")}?${q}')
data = response.json()
print(data)`;
    },
  },
  {
    id: "match-single-ingredient",
    category: "Ingredients",
    method: "POST",
    path: "/api/ingredients/match",
    title: "Natural Language Ingredient Matcher",
    description: "Resolves an unparsed recipe line item string into normalized quantity, culinary unit, and a high-confidence link to a canonical ingredient UUID.",
    defaultBody: JSON.stringify(
      {
        query: "250g fresh Ceylon cinnamon quills",
      },
      null,
      2,
    ),
    curlFn: (base, path, _, body) => `curl -X POST "${base}${path.replace("/api", "")}" \\
  -H "Content-Type: application/json" \\
  -d '${(body || "{}").replace(/\n/g, "")}'`,
    tsFn: (base, path, _, body) => `const response = await fetch('${base}${path.replace("/api", "")}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${body || "{}"}),
});
const data = await response.json();
console.log(data);`,
    dartFn: (base, path, _, body) => `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('${base}${path.replace("/api", "")}');
final response = await http.post(
  url,
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode(${body || "{}"}),
);
final data = jsonDecode(response.body);
print(data);`,
    pythonFn: (base, path, _, body) => `import requests

payload = ${body || "{}"}
response = requests.post('${base}${path.replace("/api", "")}', json=payload)
data = response.json()
print(data)`,
  },
  {
    id: "ingredient-prices",
    category: "Ingredients",
    method: "GET",
    path: "/api/ingredients/{id}/price",
    title: "Supermarket Prices & Cross-Store Breakdown",
    description: "Retrieves real-time retail prices, pack sizes, normalized unit costs (LKR per 100g/kg), and supermarket product links across Keells, Cargills, Glomark, and SPAR for a specific ingredient UUID.",
    params: [
      { name: "id", type: "UUID", required: true, defaultVal: "d3b07384-d113-40e4-a74d-5c628e08d660", desc: "Canonical ingredient UUID", isPath: true },
    ],
    curlFn: (base, path, p) => {
      const resolved = path.replace("{id}", p.id || "d3b07384-d113-40e4-a74d-5c628e08d660");
      return `curl -X GET "${base}${resolved.replace("/api", "")}"`;
    },
    tsFn: (base, path, p) => {
      const resolved = path.replace("{id}", p.id || "d3b07384-d113-40e4-a74d-5c628e08d660");
      return `const response = await fetch('${base}${resolved.replace("/api", "")}');
const data = await response.json();
console.log(data);`;
    },
    dartFn: (base, path, p) => {
      const resolved = path.replace("{id}", p.id || "d3b07384-d113-40e4-a74d-5c628e08d660");
      return `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('${base}${resolved.replace("/api", "")}');
final response = await http.get(url);
final data = jsonDecode(response.body);
print(data);`;
    },
    pythonFn: (base, path, p) => {
      const resolved = path.replace("{id}", p.id || "d3b07384-d113-40e4-a74d-5c628e08d660");
      return `import requests

response = requests.get('${base}${resolved.replace("/api", "")}')
data = response.json()
print(data)`;
    },
  },
  {
    id: "bulk-ingredients",
    category: "Ingredients",
    method: "POST",
    path: "/api/ingredients/bulk",
    title: "Batch UUID Ingredient Lookup",
    description: "Fetch complete culinary metadata records for multiple canonical ingredients in a single round-trip by passing an array of UUIDs.",
    defaultBody: JSON.stringify(
      {
        ids: [
          "d3b07384-d113-40e4-a74d-5c628e08d660",
        ],
      },
      null,
      2,
    ),
    curlFn: (base, path, _, body) => `curl -X POST "${base}${path.replace("/api", "")}" \\
  -H "Content-Type: application/json" \\
  -d '${(body || "{}").replace(/\n/g, "")}'`,
    tsFn: (base, path, _, body) => `const response = await fetch('${base}${path.replace("/api", "")}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${body || "{}"}),
});
const data = await response.json();
console.log(data);`,
    dartFn: (base, path, _, body) => `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('${base}${path.replace("/api", "")}');
final response = await http.post(
  url,
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode(${body || "{}"}),
);
final data = jsonDecode(response.body);
print(data);`,
    pythonFn: (base, path, _, body) => `import requests

payload = ${body || "{}"}
response = requests.post('${base}${path.replace("/api", "")}', json=payload)
data = response.json()
print(data)`,
  },

  // 3. Supermarket Product Catalog
  {
    id: "search-products",
    category: "Supermarkets",
    method: "GET",
    path: "/api/products",
    title: "Supermarket Product Catalog Search",
    description: "Live product catalog search across Sri Lankan retail supermarket chains (Keells, Cargills, Glomark, SPAR) with normalized pricing, stock availability, and SKU links.",
    params: [
      { name: "query", type: "string", required: true, defaultVal: "anchor butter", desc: "Brand name, grocery item, or product title" },
      { name: "supermarket", type: "string", required: false, defaultVal: "keells", desc: "Filter by chain ('keells', 'cargills', 'glomark', 'spar')" },
      { name: "inStockOnly", type: "boolean", required: false, defaultVal: "true", desc: "Restrict to items currently in stock" },
      { name: "limit", type: "number", required: false, defaultVal: "10", desc: "Max items to return" },
    ],
    curlFn: (base, path, p) => {
      const q = new URLSearchParams(p).toString();
      return `curl -X GET "${base}${path.replace("/api", "")}?${q}"`;
    },
    tsFn: (base, path, p) => {
      const q = new URLSearchParams(p).toString();
      return `const response = await fetch('${base}${path.replace("/api", "")}?${q}');
const data = await response.json();
console.log(data);`;
    },
    dartFn: (base, path, p) => {
      const q = new URLSearchParams(p).toString();
      return `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('${base}${path.replace("/api", "")}?${q}');
final response = await http.get(url);
final data = jsonDecode(response.body);
print(data);`;
    },
    pythonFn: (base, path, p) => {
      const q = new URLSearchParams(p).toString();
      return `import requests

response = requests.get('${base}${path.replace("/api", "")}?${q}')
data = response.json()
print(data)`;
    },
  },

  // 4. System & Quality
  {
    id: "system-meta",
    category: "System",
    method: "GET",
    path: "/api/meta",
    title: "Database Overview & System Metrics",
    description: "Retrieves aggregate database statistics including total canonical ingredients, mapped supermarket SKUs, regional taxonomies, and scraper ingestion status.",
    params: [],
    curlFn: (base, path) => `curl -X GET "${base}${path.replace("/api", "")}"`,
    tsFn: (base, path) => `const res = await fetch('${base}${path.replace("/api", "")}');
const stats = await res.json();
console.log(stats);`,
    dartFn: (base, path) => `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('${base}${path.replace("/api", "")}');
final response = await http.get(url);
final stats = jsonDecode(response.body);
print(stats);`,
    pythonFn: (base, path) => `import requests

res = requests.get('${base}${path.replace("/api", "")}')
print(res.json())`,
  },
  {
    id: "quality-metrics",
    category: "System",
    method: "GET",
    path: "/api/admin/quality",
    title: "Data Quality & Anomaly Detector Metrics",
    description: "Calculates real-time database health score, unmapped retail supermarket products, missing vector embeddings, and orphan ingredient candidates.",
    params: [],
    curlFn: (base, path) => `curl -X GET "${base}${path.replace("/api", "")}"`,
    tsFn: (base, path) => `const res = await fetch('${base}${path.replace("/api", "")}');
const quality = await res.json();
console.log('Health Score:', quality.healthScore);`,
    dartFn: (base, path) => `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('${base}${path.replace("/api", "")}');
final response = await http.get(url);
final quality = jsonDecode(response.body);
print('Health Score: \${quality['healthScore']}');`,
    pythonFn: (base, path) => `import requests

res = requests.get('${base}${path.replace("/api", "")}')
print('Health Score:', res.json()['healthScore'])`,
  },
  {
    id: "analytics",
    category: "System",
    method: "GET",
    path: "/api/admin/analytics",
    title: "Culinary & Regional Intelligence Analytics",
    description: "Fetch market breakdown across Macro-Regions, South Asian State Hierarchies (Punjab, Kerala, Tamil Nadu, etc.), Cuisines, and Flavor Profiles.",
    params: [],
    curlFn: (base, path) => `curl -X GET "${base}${path.replace("/api", "")}"`,
    tsFn: (base, path) => `const res = await fetch('${base}${path.replace("/api", "")}');
const analytics = await res.json();
console.log(analytics);`,
    dartFn: (base, path) => `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('${base}${path.replace("/api", "")}');
final response = await http.get(url);
final analytics = jsonDecode(response.body);
print(analytics);`,
    pythonFn: (base, path) => `import requests

res = requests.get('${base}${path.replace("/api", "")}')
print(res.json())`,
  },
  {
    id: "enhance-image",
    category: "System",
    method: "POST",
    path: "/api/ingredients/enhance/image",
    title: "Trigger 6-Tier Image Ingestion Waterfall",
    description: "Enrich missing ingredient photography using culinary-scored 6-tier waterfall (Wikidata SPARQL, Wikipedia Lead, Wikimedia Search, Open Food Facts, Unsplash, Pexels).",
    defaultBody: JSON.stringify(
      {
        ingredientId: "d3b07384-d113-40e4-a74d-5c628e08d660",
      },
      null,
      2,
    ),
    curlFn: (base, path, _, body) => `curl -X POST "${base}${path.replace("/api", "")}" \\
  -H "Content-Type: application/json" \\
  -d '${(body || "{}").replace(/\n/g, "")}'`,
    tsFn: (base, path, _, body) => `const res = await fetch('${base}${path.replace("/api", "")}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${body || "{}"}),
});
const updated = await res.json();
console.log(updated);`,
    dartFn: (base, path, _, body) => `import 'package:http/http.dart' as http;
import 'dart:convert';

final url = Uri.parse('${base}${path.replace("/api", "")}');
final response = await http.post(
  url,
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode(${body || "{}"}),
);
final data = jsonDecode(response.body);
print(data);`,
    pythonFn: (base, path, _, body) => `import requests

res = requests.post('${base}${path.replace("/api", "")}', json=${body || "{}"})
print(res.json())`,
  },
];

export default function DocumentationPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("All");
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo>(ENDPOINTS[0]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [bodyValue, setBodyValue] = useState<string>(ENDPOINTS[0].defaultBody || "{}");
  const [codeLang, setCodeLang] = useState<"curl" | "ts" | "dart" | "python">("curl");
  const [targetHost, setTargetHost] = useState<"backend" | "gateway">("backend");
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<number | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);

  const filteredEndpoints = ENDPOINTS.filter((ep) => {
    const matchesCategory = selectedCategory === "All" || ep.category === selectedCategory;
    const matchesSearch =
      searchFilter.trim() === "" ||
      ep.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      ep.path.toLowerCase().includes(searchFilter.toLowerCase()) ||
      ep.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectEndpoint = (ep: EndpointInfo) => {
    setSelectedEndpoint(ep);
    setTestResult(null);
    setTestStatus(null);
    setTestLatency(null);
    const initial: Record<string, string> = {};
    ep.params?.forEach((p) => {
      if (p.defaultVal) initial[p.name] = p.defaultVal;
    });
    setParamValues(initial);
    setBodyValue(ep.defaultBody || "{}");
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
    const startTime = performance.now();
    try {
      let url = selectedEndpoint.path;
      let options: RequestInit = { method: selectedEndpoint.method };

      selectedEndpoint.params?.forEach((p) => {
        if (p.isPath) {
          const val = paramValues[p.name] || p.defaultVal;
          url = url.replace(`{${p.name}}`, encodeURIComponent(val));
        }
      });

      if (selectedEndpoint.method === "GET") {
        const activeParams: Record<string, string> = {};
        selectedEndpoint.params?.forEach((p) => {
          if (!p.isPath && paramValues[p.name]?.trim()) {
            activeParams[p.name] = paramValues[p.name].trim();
          }
        });
        const q = new URLSearchParams(activeParams).toString();
        if (q) url += `?${q}`;
      } else if (selectedEndpoint.method === "POST") {
        let parsedBody = {};
        try {
          parsedBody = JSON.parse(bodyValue);
        } catch {
          throw new Error("Invalid JSON in request payload editor");
        }
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedBody),
        };
      }

      const res = await fetch(url, options);
      const duration = Math.round(performance.now() - startTime);
      setTestLatency(duration);
      setTestStatus(res.status);
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      setTestLatency(duration);
      setTestStatus(500);
      setTestResult(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setTestLoading(false);
    }
  };

  const activeBaseUrl =
    targetHost === "backend" ? "https://foodapi.seyone.dev/api/v1" : "https://foodrepo.seyone.dev/api";

  const getActiveSnippet = () => {
    const activeParams: Record<string, string> = {};
    selectedEndpoint.params?.forEach((p) => {
      if (paramValues[p.name]?.trim()) {
        activeParams[p.name] = paramValues[p.name].trim();
      }
    });

    switch (codeLang) {
      case "curl":
        return selectedEndpoint.curlFn(activeBaseUrl, selectedEndpoint.path, activeParams, bodyValue);
      case "ts":
        return selectedEndpoint.tsFn(activeBaseUrl, selectedEndpoint.path, activeParams, bodyValue);
      case "dart":
        return selectedEndpoint.dartFn(activeBaseUrl, selectedEndpoint.path, activeParams, bodyValue);
      case "python":
        return selectedEndpoint.pythonFn(activeBaseUrl, selectedEndpoint.path, activeParams, bodyValue);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
      <NavBar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                API Version 1.0.0 (v1)
              </span>
              <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-full font-mono">
                OAS 3.0 Standard
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-primary" /> FoodRepo Developer Documentation & Interactive Playground
            </h1>
            <p className="text-muted-foreground text-sm max-w-3xl">
              Production-grade culinary knowledge base, semantic ingredient embeddings, multi-supermarket retail catalogs, and Schema.org recipe pricing engine standardized under API v1.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://foodapi.seyone.dev/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-lg text-xs font-medium border border-border/80 bg-background hover:bg-muted/80 text-foreground inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary" /> Live Swagger UI
            </a>
            <a
              href="/docs/api/openapi.yaml"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-lg text-xs font-medium border border-border/80 bg-background hover:bg-muted/80 text-muted-foreground inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Code className="w-3.5 h-3.5" /> OpenAPI YAML
            </a>
          </div>
        </div>

        {/* Categories Bar & Search Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1.5 rounded-xl border border-border/60">
            {(["All", "Recipes", "Ingredients", "Supermarkets", "System"] as CategoryType[]).map((cat) => {
              const count = cat === "All" ? ENDPOINTS.length : ENDPOINTS.filter((e) => e.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {cat === "Recipes" && <Sparkles className="w-3.5 h-3.5" />}
                  {cat === "Ingredients" && <Layers className="w-3.5 h-3.5" />}
                  {cat === "Supermarkets" && <ShoppingBag className="w-3.5 h-3.5" />}
                  {cat === "System" && <Activity className="w-3.5 h-3.5" />}
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter endpoints..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Endpoint Navigation (4 cols) */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Endpoints ({filteredEndpoints.length})
              </h3>
              <span className="text-[10px] text-muted-foreground">Click to load</span>
            </div>

            <div className="space-y-1.5 max-h-[720px] overflow-y-auto pr-1">
              {filteredEndpoints.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => handleSelectEndpoint(ep)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedEndpoint.id === ep.id
                      ? "bg-primary/10 border-primary/40 text-foreground shadow-xs"
                      : "bg-card/50 border-border/60 hover:bg-accent hover:border-border text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ep.method === "GET"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground/80 px-1.5 py-0.5 bg-muted rounded">
                      {ep.category}
                    </span>
                    <code className="text-xs font-mono font-semibold text-foreground truncate">{ep.path}</code>
                  </div>
                  <div className="text-xs font-semibold text-foreground line-clamp-1">{ep.title}</div>
                </button>
              ))}

              {filteredEndpoints.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No matching endpoints found.
                </div>
              )}
            </div>
          </div>

          {/* Main Endpoint Inspector & Code Playground (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Endpoint Overview Card */}
            <Card className="border-border/60 bg-card/50 backdrop-blur-sm shadow-xs">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                        selectedEndpoint.method === "GET"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                      }`}
                    >
                      {selectedEndpoint.method}
                    </span>
                    <code className="text-base font-mono font-bold text-foreground">{selectedEndpoint.path}</code>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Category: {selectedEndpoint.category}
                  </span>
                </div>
                <CardTitle className="text-xl font-bold text-foreground">{selectedEndpoint.title}</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                  {selectedEndpoint.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Query / Path Parameters Form */}
                {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Sliders className="w-4 h-4 text-primary" /> Parameters
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/20">
                      {selectedEndpoint.params.map((p) => (
                        <div key={p.name} className="space-y-1">
                          <label className="text-xs font-mono font-semibold text-foreground flex items-center justify-between">
                            <span>
                              {p.name} {p.required && <span className="text-rose-500">*</span>}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {p.isPath ? "path parameter" : p.type}
                            </span>
                          </label>
                          <input
                            type="text"
                            value={paramValues[p.name] ?? ""}
                            onChange={(e) => handleParamChange(p.name, e.target.value)}
                            placeholder={p.defaultVal || p.desc}
                            className="w-full px-3 py-1.5 rounded-md border border-input bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <p className="text-[11px] text-muted-foreground leading-tight">{p.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* POST Request JSON Body Editor */}
                {selectedEndpoint.method === "POST" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Code className="w-4 h-4 text-primary" /> Request Body (application/json)
                      </span>
                      <button
                        onClick={() => setBodyValue(selectedEndpoint.defaultBody || "{}")}
                        className="text-[11px] text-primary hover:underline lowercase"
                      >
                        Reset to sample
                      </button>
                    </div>
                    <textarea
                      rows={7}
                      value={bodyValue}
                      onChange={(e) => setBodyValue(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Code Snippets & Language Selector */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 bg-muted p-1 rounded-lg">
                        {(["curl", "ts", "dart", "python"] as const).map((lang) => (
                          <button
                            key={lang}
                            onClick={() => setCodeLang(lang)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase transition-colors ${
                              codeLang === lang
                                ? "bg-background text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {lang === "ts" ? "TypeScript" : lang === "dart" ? "Flutter" : lang}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-1 rounded-md border border-border/40">
                        <span>Host:</span>
                        <select
                          value={targetHost}
                          onChange={(e) => setTargetHost(e.target.value as any)}
                          className="bg-transparent font-medium text-foreground focus:outline-none cursor-pointer"
                        >
                          <option value="backend">Engine (foodapi.seyone.dev/api/v1)</option>
                          <option value="gateway">Web Gateway (foodrepo.seyone.dev/api)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopy(getActiveSnippet())}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-accent text-muted-foreground transition-colors self-start sm:self-auto"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy Snippet"}
                    </button>
                  </div>

                  <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-border/40 leading-relaxed">
                    <code>{getActiveSnippet()}</code>
                  </pre>
                </div>

                {/* Try It Out Playground */}
                <div className="pt-4 border-t border-border space-y-4">
                  <button
                    onClick={handleTryItOut}
                    disabled={testLoading}
                    className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {testLoading ? "Executing Query..." : `Execute ${selectedEndpoint.method} ${selectedEndpoint.path}`}
                  </button>

                  {testResult && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                              testStatus && testStatus >= 200 && testStatus < 300
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            HTTP {testStatus}
                          </span>
                          {testLatency !== null && (
                            <span className="flex items-center gap-1 text-[11px]">
                              <Clock className="w-3 h-3" /> {testLatency} ms
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleCopy(testResult)}
                          className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy Response JSON
                        </button>
                      </div>

                      <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs max-h-96 overflow-y-auto border border-border/40">
                        <code>{testResult}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
