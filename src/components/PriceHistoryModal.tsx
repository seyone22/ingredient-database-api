"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp, AlertCircle } from "lucide-react";
import {IProductData} from "@/services/productService";
import { Area, AreaChart } from "recharts";

interface ProductHistoryModalProps {
    product: IProductData; // The product object passed from the table
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const chartConfig = {
    price: {
        label: "Price",
        color: "hsl(var(--primary))",
    },
} satisfies ChartConfig;

export default function ProductHistoryModal({ product, open, onOpenChange }: ProductHistoryModalProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    // 1. Add a small Metrics row
    const calculateStats = (data: any[]) => {
        const prices = data.map(d => d.price);
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
                setHistory(data.history || []);
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Price History
                    </DialogTitle>
                    <DialogDescription>
                        {product?.name} at <strong className="text-foreground">{product?.source?.name}</strong>
                    </DialogDescription>
                </DialogHeader>

                {/* New Insight Section */}
                {stats && (
                    <div className="grid grid-cols-3 gap-4 py-4 border-b">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Average</p>
                            <p className="text-lg font-bold">LKR {stats.avg}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">High</p>
                            <p className="text-lg font-bold text-red-500">LKR {stats.max}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Low</p>
                            <p className="text-lg font-bold text-green-600">LKR {stats.min}</p>
                        </div>
                    </div>
                )}

                <ChartContainer config={chartConfig} className="h-[300px] w-full pt-4">
                    <AreaChart data={history} margin={{ left: -20 }}>
                        <defs>
                            <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} />
                        <YAxis
                            domain={['auto', 'auto']} // Let the chart define the bounds naturally
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `LKR ${val}`}
                        />
                        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                        <Area
                            type="natural" // Smoother curve
                            dataKey="price"
                            stroke="var(--color-price)"
                            fill="url(#fillPrice)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ChartContainer>
            </DialogContent>
        </Dialog>
    );
}