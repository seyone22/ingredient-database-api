"use client";

import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { getProductSalesHistory } from "@/actions/stock.actions";

interface ProductSparklineProps {
  productId: string;
  mode?: "price" | "sales";
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
}

export default function ProductSparkline({
  productId,
  mode = "price",
  width = 110,
  height = 24,
  className,
  onClick,
}: ProductSparklineProps) {
  const [data, setData] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchPriceHistory = async (): Promise<number[]> => {
      const res = await fetch(`/api/products/${productId}/history`, {
        signal: controller.signal,
      });
      if (!res.ok) return [];
      const json = await res.json();
      if (!Array.isArray(json.history)) return [];
      const prices = json.history
        .map((h: any) => Number(h?.price))
        .filter((p: number) => Number.isFinite(p) && p > 0);
      return prices.slice(-30);
    };

    const fetchHistory = async () => {
      setLoading(true);
      try {
        let history: number[] = [];

        if (mode === "sales") {
          const rawSales = await getProductSalesHistory(productId);
          const cleanSales = Array.isArray(rawSales)
            ? rawSales
                .map((v) => Number(v))
                .filter((v) => Number.isFinite(v) && v >= 0)
            : [];
          // Ignore all-zero arrays (stores without stock velocity tracking)
          if (cleanSales.length >= 2 && cleanSales.some((v) => v > 0)) {
            history = cleanSales.slice(-30);
          } else {
            history = await fetchPriceHistory();
          }
        } else {
          history = await fetchPriceHistory();
        }

        if (isMounted) {
          setData(history.length >= 2 ? history : null);
          setLoading(false);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (isMounted) {
          setData(null);
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [productId, mode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-6 w-full">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (!data || data.length < 2) {
    return (
      <span className="text-xs text-muted-foreground/40 select-none">—</span>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  const padX = 4;
  const padY = 4;
  const innerW = Math.max(1, width - padX * 2);
  const innerH = Math.max(1, height - padY * 2);

  const coords = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * innerW;
    const y =
      range === 0
        ? height / 2
        : padY + innerH - ((d - min) / range) * innerH;
    return { x, y };
  });

  const points = coords
    .map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const last = coords[coords.length - 1];

  const svgContent = (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`block ${className || ""}`}
      role="img"
      aria-label="30-Day Trend"
    >
      <title>30-Day Trend</title>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary opacity-80"
      />
      <circle
        cx={last.x.toFixed(1)}
        cy={last.y.toFixed(1)}
        r="2.75"
        className="fill-primary"
      />
    </svg>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0"
        title="View full price history"
      >
        {svgContent}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center justify-center">
      {svgContent}
    </div>
  );
}
