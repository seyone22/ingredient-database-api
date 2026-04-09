"use client";

import React, { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Calculator, Check, ExternalLink, LineChart, Loader2,
    Plus, Store, Info, Sparkles, Search
} from "lucide-react";
import ProductHistoryModal from "@/components/PriceHistoryModal";
import { cn } from "@/lib/utils";

const getUnitPriceData = (product: any) => {
    // Attempt to extract quantity/unit from name if not explicitly provided
    const name = product.name.toLowerCase();
    const qtyMatch = name.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l)/i);

    let qty = product.quantity || 1;
    let unit = (product.unit || 'unit').toLowerCase();

    if (qtyMatch && !product.quantity) {
        qty = parseFloat(qtyMatch[1]);
        unit = qtyMatch[2].toLowerCase();
    }

    let baseQty = qty;
    let baseUnit = unit;

    if (unit === 'kg' || unit === 'l') {
        baseQty = qty * 1000;
        baseUnit = unit === 'kg' ? 'g' : 'ml';
    }

    const pricePer100 = (baseUnit === 'g' || baseUnit === 'ml')
        ? (product.price / baseQty) * 100
        : product.price / baseQty;

    return {
        pricePer100,
        displayUnit: baseUnit === 'g' || baseUnit === 'ml' ? `100${baseUnit}` : 'unit',
        normalizedQty: baseQty
    };
};

interface RetailProductsPricingProps {
    ingredientId: string;
    ingredientName: string;
    products: any[];
    loadingProducts: boolean;
    onRefreshProducts: () => Promise<void>;
}

export default function RetailProductsPricing({
                                                  ingredientId,
                                                  ingredientName,
                                                  products,
                                                  loadingProducts,
                                                  onRefreshProducts
                                              }: RetailProductsPricingProps) {
    const [isMappingOpen, setIsMappingOpen] = useState(false);
    const [productQuery, setProductQuery] = useState("");
    const [productResults, setProductResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isMappingLoading, setIsMappingLoading] = useState(false);
    const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<any>(null);

    const insights = useMemo(() => {
        if (!products.length) return null;
        const processed = products.map(p => ({ ...p, ...getUnitPriceData(p) }));
        const bestValue = [...processed].sort((a, b) => a.pricePer100 - b.pricePer100)[0];
        const cheapestAbsolute = [...processed].sort((a, b) => a.price - b.price)[0];
        const validUnitPrices = processed.filter(p => p.pricePer100 > 0 && !isNaN(p.pricePer100));
        const avgPrice = products.reduce((acc, curr) => acc + curr.price, 0) / products.length;
        const avgPricePerUnit = validUnitPrices.length > 0
            ? validUnitPrices.reduce((acc, curr) => acc + curr.pricePer100, 0) / validUnitPrices.length
            : 0;

        return { bestValue, cheapestAbsolute, avgPrice, hasBulkSaving: bestValue._id !== cheapestAbsolute._id, avgPricePerUnit };
    }, [products]);

    const searchUnmappedProducts = async (query: string) => {
        setProductQuery(query);
        if (query.length < 2) {
            setProductResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await fetch(`/api/products?query=${encodeURIComponent(query)}&limit=100`);
            if (res.ok) {
                const data = await res.json();
                setProductResults(data.results || []);
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleCreateMapping = async () => {
        if (!selectedProduct) return;
        setIsMappingLoading(true);
        try {
            const res = await fetch("/api/mapping/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: selectedProduct._id, ingredientId }),
            });
            if (!res.ok) throw new Error("Mapping failed");
            setIsMappingOpen(false);
            setSelectedProduct(null);
            setProductQuery("");
            setProductResults([]);
            await onRefreshProducts();
        } catch (error) {
            alert("Failed to map product");
        } finally {
            setIsMappingLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Retail Pricing Analysis</h2>
                    <p className="text-muted-foreground text-sm">Real-time market data for <span className="text-primary font-medium">{ingredientName}</span></p>
                </div>
                <Dialog open={isMappingOpen} onOpenChange={setIsMappingOpen}>
                    <DialogTrigger>
                        <Button variant="outline" size="sm" className="border-primary/50 text-primary">
                            <Plus className="mr-2 h-4 w-4" /> Map Product
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Map a Retail Product</DialogTitle>
                            <DialogDescription>
                                Search the database to link a retail item to this ingredient.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4 py-4">
                            <Command className="rounded-lg border shadow-md" shouldFilter={false}>
                                <CommandInput
                                    placeholder="Search products (e.g. 'Paneer')..."
                                    value={productQuery}
                                    onValueChange={searchUnmappedProducts}
                                />
                                <CommandList className="min-h-[200px]">
                                    {isSearching && (
                                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
                                        </div>
                                    )}
                                    {!isSearching && productQuery.length >= 2 && productResults.length === 0 && (
                                        <CommandEmpty>No products found for "{productQuery}".</CommandEmpty>
                                    )}
                                    {!isSearching && productQuery.length < 2 && (
                                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground italic">
                                            Type at least 2 characters to search...
                                        </div>
                                    )}
                                    <CommandGroup>
                                        {productResults.map((prod) => (
                                            <CommandItem
                                                key={prod._id}
                                                value={prod._id}
                                                onSelect={() => setSelectedProduct(prod)}
                                                className="flex items-center gap-3 py-3 cursor-pointer"
                                            >
                                                <div className={cn(
                                                    "flex h-5 w-5 items-center justify-center rounded-full border border-primary",
                                                    selectedProduct?._id === prod._id ? "bg-primary text-primary-foreground" : "opacity-50"
                                                )}>
                                                    {selectedProduct?._id === prod._id && <Check className="h-3 w-3" />}
                                                </div>
                                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden border">
                                                    {prod.url ? (
                                                        <img src={prod.url} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Store className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col truncate">
                                                    <span className="truncate font-medium text-sm">{prod.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                            {prod.source?.name || "Market"}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {prod.currency} {prod.price}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                            <Button
                                className="w-full"
                                disabled={!selectedProduct || isMappingLoading}
                                onClick={handleCreateMapping}
                            >
                                {isMappingLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm & Link Product"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {loadingProducts ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
                </div>
            ) : !products.length ? (
                <Card className="bg-muted/50 border-dashed py-16 text-center">
                    <div className="max-w-[300px] mx-auto space-y-3">
                        <Store className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="font-semibold text-lg">No links found</p>
                        <p className="text-sm text-muted-foreground">Linked retail products will appear here to provide price benchmarks.</p>
                    </div>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-green-100 bg-green-50/30">
                            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                                <Sparkles className="h-4 w-4 text-green-600" />
                                <CardTitle className="text-xs font-bold uppercase text-green-700">Best Unit Value</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-700">
                                    {insights?.bestValue.currency} {insights?.bestValue.pricePer100.toFixed(2)}
                                </div>
                                <p className="text-[10px] text-green-600 font-medium">Per {insights?.bestValue.displayUnit}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                                <Calculator className="h-4 w-4 text-muted-foreground" />
                                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Market Average</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {products[0].currency} {insights?.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-[10px] text-gray-500 font-medium uppercase">
                                    Avg Unit: {products[0].currency} {insights?.avgPricePerUnit.toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={cn(insights?.hasBulkSaving ? "border-blue-100 bg-blue-50/30" : "")}>
                            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                                <Info className="h-4 w-4 text-blue-600" />
                                <CardTitle className="text-xs font-bold uppercase text-blue-700">Buying Insight</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-semibold text-blue-800 leading-tight">
                                    {insights?.hasBulkSaving
                                        ? "Bulk purchase is currently more efficient."
                                        : "Standard packs offer the best value today."}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[60px]"></TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => {
                                    const unitData = getUnitPriceData(product);
                                    const isBestValue = product._id === insights?.bestValue._id;

                                    return (
                                        <TableRow key={product._id} className={cn(isBestValue && "bg-green-50/20")}>
                                            <TableCell>
                                                <div className="h-10 w-10 rounded border bg-white flex items-center justify-center overflow-hidden shrink-0">
                                                    {product.url ? <img src={product.url} alt="" className="object-cover h-full w-full" /> : <Store className="h-4 w-4 text-muted-foreground" />}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm line-clamp-1">{product.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                                            {product.source?.name}
                                                            {product.quantity && ` • ${product.quantity}${product.unit}`}
                                                        </span>
                                                        {isBestValue && <Badge className="h-4 text-[9px] bg-green-600 hover:bg-green-600 border-none px-1">BEST VALUE</Badge>}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-sm tabular-nums">
                                                {product.currency} {product.price.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-medium">
                                                        {product.currency} {unitData.pricePer100.toFixed(2)}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">per {unitData.displayUnit}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedHistoryProduct(product)}>
                                                        <LineChart className="h-4 w-4" />
                                                    </Button>
                                                    {product.source?.website && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                                                            <a href={product.source.website} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}

            <ProductHistoryModal
                product={selectedHistoryProduct}
                open={!!selectedHistoryProduct}
                onOpenChange={(open) => !open && setSelectedHistoryProduct(null)}
            />
        </div>
    );
}