"use client";

import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ListFilter,
  Loader2,
  Play,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import Footer from "@/components/footer/Footer";
import NavBar from "@/components/navbar/NavBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import "react-calendar-heatmap/dist/styles.css";
import CalendarHeatmap from "react-calendar-heatmap";
import { Tooltip } from "react-tooltip";

export default function IngestDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/logs?type=SCRAPE_RUN&limit=1000");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, []);

  // Process logs for the heatmap (last 1 year)
  const heatmapData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((log) => {
      const date = new Date(log.startTime).toISOString().split("T")[0];
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  }, [logs]);

  // Process source distribution for Activity Overview & Spider Chart
  const sourceStats = React.useMemo(() => {
    const defaultSources: Record<string, number> = {
      Keells: 7610,
      Arpico: 4888,
      Cargills: 4152,
      SPAR: 2963,
      Glomark: 1775,
    };

    const rawSources: Record<string, number> =
      stats?.productsBySource && Object.keys(stats.productsBySource).length > 0
        ? stats.productsBySource
        : defaultSources;

    const total = Object.values(rawSources).reduce((acc, c) => acc + c, 0) || 1;
    const sorted = Object.entries(rawSources)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return { total, list: sorted };
  }, [stats]);

  // Compute 4-axis Cross Spider Chart coordinates (GitHub style in purple theme)
  const spiderChartData = React.useMemo(() => {
    const cx = 175;
    const cy = 110;
    const L = 72;

    const north = sourceStats.list[0] || {
      name: "Keells",
      count: 7610,
      percent: 36,
    };
    const east = sourceStats.list[1] || {
      name: "Arpico",
      count: 4888,
      percent: 23,
    };
    const south = sourceStats.list[2] || {
      name: "Cargills",
      count: 4152,
      percent: 19,
    };
    const west = sourceStats.list[3] || {
      name: "SPAR",
      count: 2963,
      percent: 14,
    };

    const maxPercent = Math.max(
      north.percent,
      east.percent,
      south.percent,
      west.percent,
      1,
    );

    const getRadius = (pct: number) => {
      return 14 + (pct / maxPercent) * (L - 22);
    };

    const rNorth = getRadius(north.percent);
    const rEast = getRadius(east.percent);
    const rSouth = getRadius(south.percent);
    const rWest = getRadius(west.percent);

    const ptNorth = { x: cx, y: cy - rNorth };
    const ptEast = { x: cx + rEast, y: cy };
    const ptSouth = { x: cx, y: cy + rSouth };
    const ptWest = { x: cx - rWest, y: cy };

    return {
      cx,
      cy,
      L,
      north,
      east,
      south,
      west,
      ptNorth,
      ptEast,
      ptSouth,
      ptWest,
      polygonPoints: `${ptNorth.x},${ptNorth.y} ${ptEast.x},${ptEast.y} ${ptSouth.x},${ptSouth.y} ${ptWest.x},${ptWest.y}`,
    };
  }, [sourceStats]);

  const handleManualTrigger = async () => {
    if (
      !confirm(
        "Are you sure you want to trigger a manual supermarket ingest? This will spin up the scrapers.",
      )
    )
      return;
    setIsTriggering(true);
    try {
      const res = await fetch("/api/admin/scraper/run", { method: "POST" });
      if (!res.ok) throw new Error("Trigger failed");
      alert("Scraper pipeline initiated successfully.");
      fetchLogs();
    } catch (err) {
      alert("Failed to start scraper. Check server logs.");
    } finally {
      setIsTriggering(false);
    }
  };

  const today = React.useMemo(() => new Date(), []);
  const oneYearAgo = React.useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
      <NavBar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Data Ingest Control
            </h1>
            <p className="text-muted-foreground italic text-sm">
              "Them bitches don't know what hit em."
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleManualTrigger}
            disabled={isTriggering || loading}
            className="bg-primary hover:bg-primary/90 font-bold px-8 shadow-lg"
          >
            {isTriggering ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Play className="mr-2 h-5 w-5 fill-current" />
            )}
            Trigger Unified Ingest
          </Button>
        </div>

        {/* Heatmap Section */}
        <Card className="bg-card shadow-xs border-border/80 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Ingest Frequency
            </CardTitle>
            <CardDescription>
              Visualizing supermarket scrape activity over the last 1 year
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Added a responsive wrapper with overflow-x-auto for small screens */}
            <div className="pt-4 pb-2 px-1 overflow-x-auto">
              <div className="min-w-[750px] heatmap-container">
                <CalendarHeatmap
                  startDate={oneYearAgo}
                  endDate={today}
                  values={heatmapData}
                  gutterSize={2.5}
                  showWeekdayLabels={true}
                  weekdayLabels={["", "Mon", "", "Wed", "", "Fri", ""]}
                  transformDayElement={(element: any) =>
                    React.cloneElement(element, {
                      rx: 2,
                      ry: 2,
                    })
                  }
                  classForValue={(value: any) => {
                    if (!value || value.count === 0) {
                      return "color-empty";
                    }
                    if (value.count === 1) return "color-scale-1";
                    if (value.count === 2) return "color-scale-2";
                    if (value.count <= 4) return "color-scale-3";
                    return "color-scale-4";
                  }}
                  // Cast the return object to 'any' to stop the TS error
                  tooltipDataAttrs={(value: any): any => {
                    const dateStr = value?.date
                      ? new Date(value.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : null;
                    return {
                      "data-tooltip-id": "heatmap-tooltip",
                      "data-tooltip-content": dateStr
                        ? `${value.count} scrape run${value.count === 1 ? "" : "s"} on ${dateStr}`
                        : "No activity logged",
                    };
                  }}
                  showMonthLabels={true}
                />
                <Tooltip id="heatmap-tooltip" />

                {/* GitHub-style bottom legend */}
                <div className="flex items-center justify-between pt-3 mt-2 text-xs text-muted-foreground border-t border-border/40 px-1">
                  <span>Supermarket scrape activity</span>
                  <div className="flex items-center gap-1.5">
                    <span>Less</span>
                    <span
                      title="No activity"
                      className="w-[10px] h-[10px] rounded-[2px] bg-[#ebedf0] dark:bg-[#161b22] border border-border/40 inline-block"
                    />
                    <span
                      title="1 run"
                      className="w-[10px] h-[10px] rounded-[2px] bg-[#e9d5ff] dark:bg-[#3b1d54] inline-block"
                    />
                    <span
                      title="2 runs"
                      className="w-[10px] h-[10px] rounded-[2px] bg-[#c084fc] dark:bg-[#6b21a8] inline-block"
                    />
                    <span
                      title="3-4 runs"
                      className="w-[10px] h-[10px] rounded-[2px] bg-[#9333ea] dark:bg-[#a855f7] inline-block"
                    />
                    <span
                      title="5+ runs"
                      className="w-[10px] h-[10px] rounded-[2px] bg-[#581c87] dark:bg-[#d8b4fe] inline-block"
                    />
                    <span>More</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Overview & Spider Chart (GitHub style in purple theme) */}
        <Card className="bg-card shadow-xs border-border/80 overflow-hidden">
          <CardContent className="py-5 px-6 sm:px-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: Activity Overview */}
              <div className="md:col-span-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Activity overview
                </h3>
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-xs space-y-1.5">
                    <span className="text-muted-foreground font-medium">
                      Ingested from
                    </span>
                    <div className="space-y-1">
                      {sourceStats.list.slice(0, 3).map((s) => (
                        <div key={s.name} className="flex items-center gap-1.5">
                          <Link
                            href="/admin/product"
                            className="text-primary font-semibold hover:underline"
                          >
                            {s.name}
                          </Link>
                          <span className="text-muted-foreground text-[11px]">
                            ({s.count.toLocaleString()} SKUs • {s.percent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                    {sourceStats.list.length > 3 && (
                      <p className="text-muted-foreground text-[11px] pt-0.5">
                        and {sourceStats.list.length - 3} other{" "}
                        {sourceStats.list.length - 3 === 1
                          ? "source"
                          : "sources"}{" "}
                        (
                        {sourceStats.list
                          .slice(3)
                          .map((s) => `${s.name}: ${s.percent}%`)
                          .join(", ")}
                        )
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Divider */}
              <div className="hidden md:flex justify-center md:col-span-1 self-stretch items-center">
                <div className="w-px bg-border/60 h-28" />
              </div>

              {/* Right Column: Spider / Radar Cross Chart */}
              <div className="md:col-span-6 flex justify-center items-center">
                <svg
                  viewBox="0 0 350 220"
                  className="w-full max-w-[360px] h-auto overflow-visible select-none"
                  role="img"
                  aria-label="Supermarket activity distribution cross chart"
                >
                  <title>Supermarket activity distribution</title>
                  {/* Perpendicular Axis Cross (Purple) */}
                  <line
                    x1={spiderChartData.cx}
                    y1={spiderChartData.cy - spiderChartData.L}
                    x2={spiderChartData.cx}
                    y2={spiderChartData.cy + spiderChartData.L}
                    stroke="currentColor"
                    className="text-purple-600/70 dark:text-purple-400/60"
                    strokeWidth="1.75"
                  />
                  <line
                    x1={spiderChartData.cx - spiderChartData.L}
                    y1={spiderChartData.cy}
                    x2={spiderChartData.cx + spiderChartData.L}
                    y2={spiderChartData.cy}
                    stroke="currentColor"
                    className="text-purple-600/70 dark:text-purple-400/60"
                    strokeWidth="1.75"
                  />

                  {/* Polygon shape */}
                  <polygon
                    points={spiderChartData.polygonPoints}
                    fill="rgba(168, 85, 247, 0.22)"
                    stroke="#9333ea"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    className="dark:fill-purple-500/25 dark:stroke-purple-400"
                  />

                  {/* Circular nodes on the 4 axes */}
                  {[
                    spiderChartData.ptNorth,
                    spiderChartData.ptEast,
                    spiderChartData.ptSouth,
                    spiderChartData.ptWest,
                  ].map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="3.5"
                      className="fill-background stroke-purple-600 dark:stroke-purple-400"
                      strokeWidth="2"
                    />
                  ))}

                  {/* Labels: North */}
                  <text
                    x={spiderChartData.cx}
                    y={spiderChartData.cy - spiderChartData.L - 19}
                    textAnchor="middle"
                    className="text-xs font-semibold fill-foreground"
                  >
                    {spiderChartData.north.percent}%
                  </text>
                  <text
                    x={spiderChartData.cx}
                    y={spiderChartData.cy - spiderChartData.L - 6}
                    textAnchor="middle"
                    className="text-[11px] fill-muted-foreground"
                  >
                    {spiderChartData.north.name}
                  </text>

                  {/* Labels: East */}
                  <text
                    x={spiderChartData.cx + spiderChartData.L + 9}
                    y={spiderChartData.cy - 2}
                    textAnchor="start"
                    className="text-xs font-semibold fill-foreground"
                  >
                    {spiderChartData.east.percent}%
                  </text>
                  <text
                    x={spiderChartData.cx + spiderChartData.L + 9}
                    y={spiderChartData.cy + 11}
                    textAnchor="start"
                    className="text-[11px] fill-muted-foreground"
                  >
                    {spiderChartData.east.name}
                  </text>

                  {/* Labels: South */}
                  <text
                    x={spiderChartData.cx}
                    y={spiderChartData.cy + spiderChartData.L + 16}
                    textAnchor="middle"
                    className="text-xs font-semibold fill-foreground"
                  >
                    {spiderChartData.south.percent}%
                  </text>
                  <text
                    x={spiderChartData.cx}
                    y={spiderChartData.cy + spiderChartData.L + 28}
                    textAnchor="middle"
                    className="text-[11px] fill-muted-foreground"
                  >
                    {spiderChartData.south.name}
                  </text>

                  {/* Labels: West */}
                  <text
                    x={spiderChartData.cx - spiderChartData.L - 9}
                    y={spiderChartData.cy - 2}
                    textAnchor="end"
                    className="text-xs font-semibold fill-foreground"
                  >
                    {spiderChartData.west.percent}%
                  </text>
                  <text
                    x={spiderChartData.cx - spiderChartData.L - 9}
                    y={spiderChartData.cy + 11}
                    textAnchor="end"
                    className="text-[11px] fill-muted-foreground"
                  >
                    {spiderChartData.west.name}
                  </text>
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Log List Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4 bg-muted/20">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListFilter className="h-5 w-5 text-primary" />
                Recent Events
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLogs}
              className="text-muted-foreground"
            >
              <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[200px]">Start Time</TableHead>
                <TableHead>Source Tag</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No ingest events found in the audit trail.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {new Date(log.startTime).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "capitalize font-mono text-[10px]",
                          log.tag === "CRON_SCRAPE"
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "bg-purple-100 text-purple-700 border-purple-200",
                        )}
                      >
                        {log.tag}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.endTime
                        ? `${Math.round((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000 / 60)}m`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {log.status === "completed" && (
                        <div className="flex items-center text-green-600 gap-1.5 font-semibold">
                          <CheckCircle2 className="h-4 w-4" /> Success
                        </div>
                      )}
                      {log.status === "failed" && (
                        <div className="flex items-center text-destructive gap-1.5 font-semibold">
                          <XCircle className="h-4 w-4" /> Failed
                        </div>
                      )}
                      {log.status === "pending" && (
                        <div className="flex items-center text-primary gap-1.5 font-semibold">
                          <Loader2 className="h-4 w-4 animate-spin" />{" "}
                          Working...
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.error ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <button
                            className={"flex justify-center items-center"}
                            onClick={() =>
                              alert(
                                `Error: ${log.error}\n\nStack:\n${log.stack}`,
                              )
                            }
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            &nbsp;View Error
                          </button>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {log.message || "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

// Utility for class merging
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
