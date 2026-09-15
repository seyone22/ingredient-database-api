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
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TrendingUp, AlertCircle } from "lucide-react";
import { IProductData } from "@/services/productService";
import { Area, AreaChart } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProductHistoryModalProps {
  product: IProductData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const chartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function ProductHistoryModal({
  product,
  open,
  onOpenChange,
}: ProductHistoryModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const isMobile = useIsMobile();

  // 1. Add a small Metrics row
  const calculateStats = (data: any[]) => {
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { min, max, avg: avg.toFixed(2) };
  };

  const stats = history.length > 0 ? calculateStats(history) : null;

  useEffect(() => {
    if (!open || !product?.id) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/products/${product.id}/history`);
        if (!res.ok) throw new Error("Failed to fetch history");
        const data = await res.json();

        // 👈 Filter to remove any price entries that are 0 or null
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
        <div className="grid grid-cols-3 gap-2 sm:gap-4 py-3 border-b">
          <div>
            <p className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider">Average</p>
            <p className="text-base sm:text-lg font-bold">LKR {stats.avg}</p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider">High</p>
            <p className="text-base sm:text-lg font-bold text-red-500">LKR {stats.max}</p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider">Low</p>
            <p className="text-base sm:text-lg font-bold text-green-600">
              LKR {stats.min}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2 pt-4">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p>Failed to load price history.</p>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <p>No historical price data recorded yet for this product.</p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-64 sm:h-75 w-full pt-2">
          <AreaChart data={history} margin={{ left: -20, right: 10 }}>
            <defs>
              <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--primary)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--primary)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            <YAxis
              domain={["auto", "auto"]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `LKR ${val}`}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <Area
              type="natural"
              dataKey="price"
              stroke="var(--primary)"
              fill="url(#fillPrice)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
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
