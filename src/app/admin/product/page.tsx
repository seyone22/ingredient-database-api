"use client";

import React, { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import {getProductSalesHistory} from "@/actions/stock.actions";

// --- Types ---
interface Source {
    _id: string;
    name: string;
}

interface Product {
    _id: string;
    name: string;
    source: Source;
    price: number;
    currency: string;
    averageSale?: number;
    url?: string;
    // Removed salesHistory from here; it's now fetched independently
}

interface ApiResponse {
    results: Product[];
    total: number;
    page: number;
    limit: number;
}

// --- Smart Sparkline Wrapper Component ---
const ProductSparkline = ({ productId }: { productId: string }) => {
    const [data, setData] = useState<number[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchHistory = async () => {
            setLoading(true);
            // Fire the Server Action
            const history = await getProductSalesHistory(productId);

            if (isMounted) {
                setData(history);
                setLoading(false);
            }
        };

        fetchHistory();

        // Cleanup to prevent setting state on unmounted components
        return () => { isMounted = false; };
    }, [productId]);

    if (loading) {
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }

    if (!data || data.length < 2) {
        return <span className="text-xs text-muted-foreground">Not enough data</span>;
    }

    // Mathematical SVG Drawing
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 120;
    const height = 30;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d - min) / range) * height;
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg width={width} height={height} viewBox={`0 -5 ${width} ${height + 10}`} className="overflow-visible">
            <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary opacity-80"
            />
            <circle
                cx={width}
                cy={height - ((data[data.length - 1] - min) / range) * height}
                r="3"
                className="fill-primary"
            />
        </svg>
    );
};

export default function AllProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    // Pagination State
    const [totalRows, setTotalRows] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                query: searchQuery,
                page: page.toString(),
                limit: pageSize.toString(),
                // includeHistory flag is no longer needed here
            });

            const res = await fetch(`/api/products?${params.toString()}`);
            const data: ApiResponse = await res.json();

            if (res.ok) {
                setProducts(data.results);
                setTotalRows(data.total);
            } else {
                setProducts([]);
                setTotalRows(0);
            }
        } catch (err) {
            console.error(err);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchQuery]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchProducts();
    };

    return (
        <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
            <NavBar />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">All Products</h1>
                    <p className="text-muted-foreground">Monitor product pricing, sources, and sales velocity.</p>
                </div>

                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search products by name or SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" variant="secondary" disabled={loading}>
                        {loading ? "Loading..." : "Search"}
                    </Button>
                </form>

                <div className="rounded-md border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[250px]">Product</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Avg Sale (Velocity)</TableHead>
                                <TableHead>30-Day Trend</TableHead>
                                <TableHead className="text-right">External</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!products || products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        {loading ? "Loading products..." : "No products found."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((row) => (
                                    <TableRow key={row._id}>
                                        <TableCell className="font-medium">{row.name}</TableCell>

                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                                                {row.source?.name || "Unknown"}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            {row.currency} {row.price.toFixed(2)}
                                        </TableCell>

                                        <TableCell>
                                            {row.averageSale ? `${row.averageSale}/day` : "—"}
                                        </TableCell>

                                        <TableCell>
                                            {/* Dedicated component fetches its own data progressively */}
                                            <ProductSparkline productId={row._id} />
                                        </TableCell>

                                        <TableCell className="text-right">
                                            {row.url ? (
                                                <Button variant="ghost" size="icon">
                                                    <a href={row.url} target="_blank" rel="noreferrer">
                                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                    </a>
                                                </Button>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{totalRows === 0 ? 0 : (page - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(page * pageSize, totalRows)}</span> of <span className="font-medium">{totalRows}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => p + 1)}
                            disabled={page * pageSize >= totalRows || loading}
                        >
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}