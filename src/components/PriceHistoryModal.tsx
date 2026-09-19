"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import { IProductData } from "@/types/types";

interface ProductHistoryModalProps {
  product: IProductData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductHistoryModal({
  product,
  open,
  onOpenChange,
}: ProductHistoryModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const calculateStats = (data: any[]) => {
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { min, max, avg: avg.toFixed(2) };
  };

  const stats = history.length > 0 ? calculateStats(history) : null;

  useEffect(() => {
    if (!open || !product?.id) {
      setHistory([]);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/products/${product.id}/history`);
        if (!res.ok) throw new Error("Failed to fetch history");
        const data = await res.json();

        const cleanHistory = (data.history || []).filter(
          (h: any) => h.price !== null && h.price > 0,
        );

        setHistory(cleanHistory);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [product, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-full flex flex-col p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b bg-card/60">
          <SheetHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-lg font-bold leading-tight">
                  Price History
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                  {product?.name} &bull;{" "}
                  <span className="font-semibold text-foreground">
                    {product?.source?.name || "Retailer"}
                  </span>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metrics Row */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border bg-muted/20">
              <div>
                <p className="text-[11px] sm:text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Average Price
                </p>
                <p className="text-lg sm:text-2xl font-bold mt-0.5 tabular-nums">
                  LKR {stats.avg}
                </p>
              </div>
              <div>
                <p className="text-[11px] sm:text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Highest Price
                </p>
                <p className="text-lg sm:text-2xl font-bold text-red-500 mt-0.5 tabular-nums">
                  LKR {stats.max}
                </p>
              </div>
              <div>
                <p className="text-[11px] sm:text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Lowest Price
                </p>
                <p className="text-lg sm:text-2xl font-bold text-green-600 mt-0.5 tabular-nums">
                  LKR {stats.min}
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-2 py-12">
              <Skeleton className="h-72 w-full rounded-xl" />
              <p className="text-center text-xs text-muted-foreground animate-pulse mt-2">
                Loading historical price records...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 my-4 text-center rounded-xl border border-destructive/20 bg-destructive/5 text-muted-foreground">
              <AlertCircle className="h-10 w-10 text-destructive mb-2" />
              <p className="text-sm font-semibold text-foreground">
                Could not load price history
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please try again in a few moments.
              </p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 my-4 text-center rounded-xl border border-dashed border-border bg-muted/30">
              <DollarSign className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold text-foreground">
                No Historical Price Data
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Only a single price point is recorded for this item. Additional price points are captured during automated store updates.
              </p>
            </div>
          ) : (
            <>
              {/* Wide Chart */}
              <div className="w-full h-72 sm:h-80 md:h-96 pt-2 pb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={history}
                    margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="priceGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#b57edc"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#b57edc"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      className="stroke-border/60"
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      className="text-muted-foreground"
                      tickFormatter={(val) => `LKR ${val}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs">
                              <p className="text-muted-foreground font-medium mb-1">
                                {label}
                              </p>
                              <p className="text-sm font-bold text-primary">
                                LKR {payload[0].value?.toLocaleString()}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#b57edc"
                      strokeWidth={2.5}
                      fill="url(#priceGradient)"
                      dot={
                        history.length === 1
                          ? { r: 5, fill: "#b57edc" }
                          : false
                      }
                      activeDot={{ r: 5, strokeWidth: 1, stroke: "#ffffff" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Price Recording Timeline Table */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Price Changes ({history.length} data points)
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Latest:{" "}
                    <strong className="text-foreground">
                      LKR {history[history.length - 1]?.price?.toLocaleString()}
                    </strong>
                  </span>
                </div>
                <div className="rounded-xl border divide-y overflow-hidden max-h-64 overflow-y-auto bg-card shadow-2xs">
                  {history
                    .slice()
                    .reverse()
                    .map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-muted/30 transition-colors"
                      >
                        <span className="text-muted-foreground font-medium">
                          {item.date}
                        </span>
                        <span className="font-mono font-bold text-foreground tabular-nums">
                          LKR {item.price?.toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
