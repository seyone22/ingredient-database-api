"use client";

import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { getProductSalesHistory } from "@/actions/stock.actions";

interface ProductSparklineProps {
  productId: string;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
}

export default function ProductSparkline({
  productId,
  width = 110,
  height = 24,
  className,
  onClick,
}: ProductSparklineProps) {
  const [data, setData] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        // 1. Try stock / sales velocity history first
        let history = await getProductSalesHistory(productId);

        // 2. If not enough data points, fall back to price history
        if (!history || history.length < 2) {
          const res = await fetch(`/api/products/${productId}/history`);
          if (res.ok) {
            const json = await res.json();
            if (
              json.history &&
              Array.isArray(json.history) &&
              json.history.length >= 2
            ) {
              history = json.history.map((h: any) => Number(h.price));
            }
          }
        }

        if (isMounted) {
          setData(history && history.length >= 2 ? history : null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setData(null);
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [productId]);

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
  const range = max - min || 1;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastY =
    height - ((data[data.length - 1] - min) / range) * (height - 6) - 3;

  const svgContent = (
    <svg
      width={width}
      height={height}
      viewBox={`0 -4 ${width} ${height + 8}`}
      className={`overflow-visible ${className || ""}`}
      role="img"
      aria-label="30-Day Trend"
    >
      <title>30-Day Trend</title>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary opacity-80"
      />
      <circle cx={width} cy={lastY} r="3" className="fill-primary" />
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
