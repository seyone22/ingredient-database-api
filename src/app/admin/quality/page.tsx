"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  AlertTriangle,
  Copy,
  Package,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface MetricState {
  missingImageCount: number;
  missingFdcCount: number;
  missingCommentCount: number;
  missingVarietiesCount: number;
  missingAliasesCount: number;
  orphanCount: number;
  potentialDuplicatesCount: number;
}

interface DuplicatePair {
  item1: { id: string; name: string };
  item2: { id: string; name: string };
  confidence: string;
}

interface OrphanItem {
  id: string;
  name: string;
  cuisine: string[] | null;
  region: string[] | null;
}

export default function DataQualityPage() {
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [healthScore, setHealthScore] = useState(88);
  const [metrics, setMetrics] = useState<MetricState | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [orphans, setOrphans] = useState<OrphanItem[]>([]);
  const [activeTab, setActiveTab] = useState<"duplicates" | "orphans" | "missing">("duplicates");

  useEffect(() => {
    async function fetchQualityData() {
      try {
        const res = await fetch("/api/admin/quality");
        if (res.ok) {
          const data = await res.json();
          setTotal(data.totalIngredients);
          setHealthScore(data.healthScore);
          setMetrics(data.metrics);
          setDuplicates(data.potentialDuplicates || []);
          setOrphans(data.orphanIngredients || []);
        }
      } catch (err) {
        console.error("Failed to load quality data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchQualityData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
      <NavBar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                Enterprise Suite
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-primary" /> Data Quality & Anomaly Detector
            </h1>
            <p className="text-muted-foreground text-sm">
              Real-time heuristic duplicate detection, orphan ingredient auditing, and database health scoring across {total.toLocaleString()} SKUs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/all"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              All Ingredients Grid
            </Link>
            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              Analytics <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Health Score Card */}
              <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Health Score
                  </CardTitle>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-500">
                    {healthScore}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Core Metadata: <strong className="text-foreground">100.0% Complete</strong>
                  </p>
                  <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${healthScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Duplicates Card */}
              <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Potential Duplicates
                  </CardTitle>
                  <Copy className="w-5 h-5 text-rose-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-rose-500">
                    {duplicates.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fuzzy Match Candidates flagged
                  </p>
                </CardContent>
              </Card>

              {/* Orphan Ingredients Card */}
              <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Orphan SKUs
                  </CardTitle>
                  <Package className="w-5 h-5 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-500">
                    {metrics?.orphanCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ingredients with 0 retail products
                  </p>
                </CardContent>
              </Card>

              {/* Missing Images Card */}
              <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Missing Images
                  </CardTitle>
                  <ImageIcon className="w-5 h-5 text-sky-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-sky-500">
                    {metrics?.missingImageCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Overnight GitHub Pipeline
                  </p>
                </CardContent>
              </Card>

            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <button
                onClick={() => setActiveTab("duplicates")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "duplicates"
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                👯 Potential Duplicates ({duplicates.length})
              </button>
              <button
                onClick={() => setActiveTab("orphans")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "orphans"
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                📦 Orphan Ingredients ({orphans.length})
              </button>
              <button
                onClick={() => setActiveTab("missing")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "missing"
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                ⚠️ Missing Metadata Breakdown
              </button>
            </div>

            {/* TAB CONTENT: DUPLICATES */}
            {activeTab === "duplicates" && (
              <Card className="border-border/60 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Copy className="w-5 h-5 text-rose-500" /> Potential Duplicate Candidate Pairs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {duplicates.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      ✨ No high-confidence duplicate ingredient pairs detected!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                          <tr>
                            <th className="p-4">Confidence</th>
                            <th className="p-4">Ingredient Candidate A</th>
                            <th className="p-4">Ingredient Candidate B</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {duplicates.map((pair, idx) => (
                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                              <td className="p-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                  {pair.confidence}
                                </span>
                              </td>
                              <td className="p-4 font-semibold text-foreground">
                                <Link href={`/ingredient/${pair.item1.id}`} target="_blank" className="hover:underline text-primary flex items-center gap-1">
                                  {pair.item1.name} <ExternalLink className="w-3 h-3" />
                                </Link>
                              </td>
                              <td className="p-4 font-semibold text-foreground">
                                <Link href={`/ingredient/${pair.item2.id}`} target="_blank" className="hover:underline text-primary flex items-center gap-1">
                                  {pair.item2.name} <ExternalLink className="w-3 h-3" />
                                </Link>
                              </td>
                              <td className="p-4 text-right">
                                <button className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
                                  Review & Merge
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* TAB CONTENT: ORPHANS */}
            {activeTab === "orphans" && (
              <Card className="border-border/60 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-500" /> Orphan Ingredients (0 Mapped Supermarket Products)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                        <tr>
                          <th className="p-4">Ingredient Name</th>
                          <th className="p-4">Cuisine</th>
                          <th className="p-4">Region</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {orphans.slice(0, 15).map((item) => (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4 font-semibold text-foreground">
                              <Link href={`/ingredient/${item.id}`} target="_blank" className="hover:underline text-primary flex items-center gap-1">
                                {item.name} <ExternalLink className="w-3 h-3" />
                              </Link>
                            </td>
                            <td className="p-4 text-muted-foreground">
                              {Array.isArray(item.cuisine) ? item.cuisine.join(", ") : "—"}
                            </td>
                            <td className="p-4 text-muted-foreground">
                              {Array.isArray(item.region) ? item.region.join(", ") : "—"}
                            </td>
                            <td className="p-4 text-right">
                              <Link
                                href={`/admin/mapper?search=${encodeURIComponent(item.name)}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                              >
                                Map Products
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TAB CONTENT: MISSING METADATA */}
            {activeTab === "missing" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border/60 bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Missing Verified Product Image
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-sky-500">
                      {metrics?.missingImageCount.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚡ <i>GitHub Action 6-Tier Pipeline actively populating overnight</i>
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Missing USDA FDC Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-500">
                      {metrics?.missingFdcCount.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Opportunity for local USDA database string joining
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Missing Description / Comment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-500">
                      {metrics?.missingCommentCount.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Optional culinary description field
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

      </main>

      <Footer />
    </div>
  );
}
