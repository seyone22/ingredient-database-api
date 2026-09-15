"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { TrendingUp, AlertCircle, Calendar, DollarSign } from "lucide-react";
import { IProductData } from "@/services/productService";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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

  const bodyContent = (
    <div className="flex flex-col gap-4">
      {/* Metrics Row */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 py-3 border-y bg-muted/20 -mx-4 px-4 sm:mx-0 sm:px-4 sm:rounded-lg">
          <div>
            <p className="text-[11px] sm:text-xs text-muted-foreground uppercase font-medium tracking-wider">Average</p>
            <p className="text-base sm:text-lg font-bold">LKR {stats.avg}</p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs text-muted-foreground uppercase font-medium tracking-wider">High</p>
            <p className="text-base sm:text-lg font-bold text-red-500">LKR {stats.max}</p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs text-muted-foreground uppercase font-medium tracking-wider">Low</p>
            <p className="text-base sm:text-lg font-bold text-green-600">
              LKR {stats.min}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2 py-8">
          <Skeleton className="h-60 w-full rounded-xl" />
          <p className="text-center text-xs text-muted-foreground animate-pulse">Loading price records...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-8 my-4 text-center rounded-xl border border-destructive/20 bg-destructive/5 text-muted-foreground">
          <AlertCircle className="h-9 w-9 text-destructive mb-2" />
          <p className="text-sm font-semibold text-foreground">Could not load price history</p>
          <p className="text-xs text-muted-foreground mt-1">Please try again in a few moments.</p>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 my-4 text-center rounded-xl border border-dashed border-border bg-muted/30">
          <DollarSign className="h-9 w-9 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-semibold text-foreground">No Historical Price Data</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            We haven't recorded multiple price points for this item yet. Prices are tracked during daily automated scrapes.
          </p>
        </div>
      ) : (
        <div className="w-full h-64 sm:h-72 pt-2 pb-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b57edc" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#b57edc" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
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
                        <p className="text-muted-foreground font-medium mb-1">{label}</p>
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
                dot={history.length === 1 ? { r: 5, fill: "#b57edc" } : false}
                activeDot={{ r: 5, strokeWidth: 1, stroke: "#ffffff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Price History
            </SheetTitle>
            <SheetDescription className="text-sm">
              {product?.name} at{" "}
              <strong className="text-foreground">{product?.source?.name}</strong>
            </SheetDescription>
          </SheetHeader>
          {bodyContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-200 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Price History
          </DialogTitle>
          <DialogDescription>
            {product?.name} at{" "}
            <strong className="text-foreground">{product?.source?.name}</strong>
          </DialogDescription>
        </DialogHeader>
        {bodyContent}
      </DialogContent>
    </Dialog>
  );
}
