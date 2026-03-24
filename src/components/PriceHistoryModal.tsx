"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp, AlertCircle } from "lucide-react";

interface ProductHistoryModalProps {
    product: any | null; // The product object passed from the table
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

    useEffect(() => {
        if (!open || !product?._id) return;

        const fetchHistory = async () => {
            setLoading(true);
            setError(false);
            try {
                const res = await fetch(`/api/products/${product._id}/history`);
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

                <div className="py-4">
                    {loading ? (
                        <Skeleton className="h-[300px] w-full rounded-xl" />
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                            <p>Failed to load price history.</p>
                        </div>
                    ) : history.length < 2 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                            <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
                            <p>Not enough data points yet.</p>
                            <p className="text-sm">Check back after the next scrape!</p>
                        </div>
                    ) : (
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <LineChart data={history} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                />
                                {/* Setting domain to 'dataMin', 'dataMax' keeps the line from flattening out if prices are high */}
                                <YAxis
                                    domain={['dataMin', 'dataMax']}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${product?.currency} ${val}`}
                                />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                <Line
                                    type="monotone"
                                    dataKey="price"
                                    stroke="var(--color-price)"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "var(--color-price)" }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ChartContainer>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}