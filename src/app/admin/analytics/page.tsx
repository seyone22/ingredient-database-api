"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
    <main style={{ minHeight: "100vh", background: "#0b0f19", color: "#f8fafc", fontFamily: "Inter, system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

        {/* Header Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", color: "#38bdf8", fontWeight: 600 }}>
              MARKET INTELLIGENCE & ANALYTICS
            </span>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 800, margin: "0.2rem 0 0.5rem 0", background: "linear-gradient(90deg, #ffffff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              📈 Regional & Culinary Intelligence Dashboard
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: 0 }}>
              Visualizing regional hierarchies, sub-cuisines, flavor matrices, and dietary distribution across {total.toLocaleString()} ingredients.
            </p>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <Link href="/admin/quality" style={{ padding: "0.65rem 1.2rem", borderRadius: "8px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", textDecoration: "none", fontSize: "0.9rem", fontWeight: 600, border: "1px solid rgba(56, 189, 248, 0.3)" }}>
              🛡️ Data Quality & Anomalies
            </Link>
            <Link href="/admin/all" style={{ padding: "0.65rem 1.2rem", borderRadius: "8px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#e2e8f0", textDecoration: "none", fontSize: "0.9rem", fontWeight: 600 }}>
              🔍 All Ingredients Grid
            </Link>
          </div>
        </div>

        {/* Visual Charts Layout Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(620px, 1fr))", gap: "1.75rem", marginBottom: "2rem" }}>

          {/* CHART 1: MACRO-REGIONAL DISTRIBUTION */}
          <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                  🌍 Macro-Regional Distribution
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Global ingredient origins</span>
              </div>
              <span style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem", borderRadius: "4px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", fontWeight: 600 }}>
                100% Coverage
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {macroRegions.slice(0, 8).map((item) => {
                const pct = Math.round((item.count / maxMacro) * 100);
                return (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                      <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{item.label}</span>
                      <span style={{ color: "#94a3b8" }}>{item.count.toLocaleString()} items</span>
                    </div>
                    <div style={{ height: "8px", background: "#1e293b", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #38bdf8, #0284c7)", borderRadius: "4px", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHART 2: SOUTH ASIAN & INDIAN SUB-REGION STATE BREAKDOWN */}
          <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                  🌶️ South Asian & Indian Sub-Region State Hierarchy
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>State & micro-regional breakdown (1,354 SKUs)</span>
              </div>
              <span style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem", borderRadius: "4px", background: "rgba(251, 146, 60, 0.15)", color: "#fb923c", fontWeight: 600 }}>
                State Tiered
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {southAsianSubregions.slice(0, 8).map((item) => {
                const pct = Math.round((item.count / maxSouthAsian) * 100);
                return (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                      <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{item.label}</span>
                      <span style={{ color: "#94a3b8" }}>{item.count.toLocaleString()} items</span>
                    </div>
                    <div style={{ height: "8px", background: "#1e293b", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #fb923c, #ea580c)", borderRadius: "4px", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHART 3: TOP GLOBAL CUISINES */}
          <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                  🍳 Top Global Culinary Traditions
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Cuisine tagging distribution</span>
              </div>
              <span style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem", borderRadius: "4px", background: "rgba(74, 222, 128, 0.15)", color: "#4ade80", fontWeight: 600 }}>
                100% Mapped
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {cuisines.slice(0, 8).map((item) => {
                const pct = Math.round((item.count / maxCuisine) * 100);
                return (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                      <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{item.label}</span>
                      <span style={{ color: "#94a3b8" }}>{item.count.toLocaleString()} items</span>
                    </div>
                    <div style={{ height: "8px", background: "#1e293b", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #4ade80, #16a34a)", borderRadius: "4px", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHART 4: FLAVOR PROFILE MATRIX */}
          <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                  👅 Flavor Profile Composition Matrix
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Taste notes & organoleptic attributes</span>
              </div>
              <span style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem", borderRadius: "4px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", fontWeight: 600 }}>
                Multi-Tag
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {flavors.slice(0, 8).map((item) => {
                const pct = Math.round((item.count / maxFlavor) * 100);
                return (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                      <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{item.label}</span>
                      <span style={{ color: "#94a3b8" }}>{item.count.toLocaleString()} items</span>
                    </div>
                    <div style={{ height: "8px", background: "#1e293b", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #c084fc, #9333ea)", borderRadius: "4px", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* DIETARY COMPLIANCE GAUGES */}
        <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "16px", padding: "1.75rem" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 1.25rem 0", color: "#f8fafc" }}>
            🥗 Dietary Compliance & Allergen Distribution
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
            {dietary.map((item) => (
              <div key={item.label} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "12px", padding: "1.25rem" }}>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#38bdf8", margin: "0.3rem 0" }}>
                  {item.count.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {((item.count / total) * 100).toFixed(1)}% of total database
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
