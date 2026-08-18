"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Globe,
  Utensils,
  MapPin,
  Sparkles,
  ShieldCheck,
  Database,
} from "lucide-react";

interface ChartItem {
  label: string;
  count: number;
}

export default function CulinaryAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(20841);
  const [macroRegions, setMacroRegions] = useState<ChartItem[]>([]);
  const [southAsianSubregions, setSouthAsianSubregions] = useState<ChartItem[]>([]);
  const [cuisines, setCuisines] = useState<ChartItem[]>([]);
  const [flavors, setFlavors] = useState<ChartItem[]>([]);
  const [dietary, setDietary] = useState<ChartItem[]>([]);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/admin/analytics");
        if (res.ok) {
          const data = await res.json();
          setTotal(data.totalIngredients);
          setMacroRegions(data.macroRegions || []);
          setSouthAsianSubregions(data.southAsianSubregions || []);
          setCuisines(data.topCuisines || []);
          setFlavors(data.flavorProfiles || []);
          setDietary(data.dietaryFlags || []);
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const maxMacro = macroRegions[0]?.count || 1;
  const maxCuisine = cuisines[0]?.count || 1;
  const maxFlavor = flavors[0]?.count || 1;
  const maxSouthAsian = southAsianSubregions[0]?.count || 1;

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
      <NavBar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                Market Intelligence
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-primary" /> Regional & Culinary Analytics Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Visualizing regional hierarchies, sub-cuisines, flavor matrices, and dietary distribution across {total.toLocaleString()} ingredients.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/quality"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-primary" /> Data Quality Detector
            </Link>
            <Link
              href="/admin/all"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Database className="w-4 h-4" /> All Ingredients Grid
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Visual Charts Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* CHART 1: MACRO-REGIONAL DISTRIBUTION */}
              <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Globe className="w-5 h-5 text-sky-500" /> Macro-Regional Distribution
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Global ingredient origins</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
                    100% Coverage
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  {macroRegions.slice(0, 8).map((item) => {
                    const pct = Math.round((item.count / maxMacro) * 100);
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">{item.label}</span>
                          <span className="text-muted-foreground">{item.count.toLocaleString()} items</span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-sky-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* CHART 2: SOUTH ASIAN & INDIAN SUB-REGION STATE BREAKDOWN */}
              <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-orange-500" /> South Asian State-Level Sub-Region Hierarchy
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">State & micro-regional breakdown (1,354 SKUs)</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                    State Tiered
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  {southAsianSubregions.slice(0, 8).map((item) => {
                    const pct = Math.round((item.count / maxSouthAsian) * 100);
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">{item.label}</span>
                          <span className="text-muted-foreground">{item.count.toLocaleString()} items</span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-orange-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* CHART 3: TOP GLOBAL CUISINES */}
              <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Utensils className="w-5 h-5 text-emerald-500" /> Top Global Culinary Traditions
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Cuisine tagging distribution</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    100% Mapped
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cuisines.slice(0, 8).map((item) => {
                    const pct = Math.round((item.count / maxCuisine) * 100);
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">{item.label}</span>
                          <span className="text-muted-foreground">{item.count.toLocaleString()} items</span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* CHART 4: FLAVOR PROFILE MATRIX */}
              <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" /> Flavor Profile Composition Matrix
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Taste notes & organoleptic attributes</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                    Multi-Tag
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  {flavors.slice(0, 8).map((item) => {
                    const pct = Math.round((item.count / maxFlavor) * 100);
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">{item.label}</span>
                          <span className="text-muted-foreground">{item.count.toLocaleString()} items</span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

            </div>

            {/* DIETARY COMPLIANCE GAUGES */}
            <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  🥗 Dietary Compliance & Allergen Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {dietary.map((item) => (
                    <div key={item.label} className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between">
                      <div className="text-xs font-semibold text-muted-foreground">{item.label}</div>
                      <div className="text-2xl font-bold text-foreground my-2">
                        {item.count.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {((item.count / total) * 100).toFixed(1)}% of database
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

      </main>

      <Footer />
    </div>
  );
}
