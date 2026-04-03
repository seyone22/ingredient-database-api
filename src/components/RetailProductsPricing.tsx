"use client";

import React, {useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {Calculator, Check, ExternalLink, LineChart, Loader2, Plus, Store, TrendingDown, TrendingUp} from "lucide-react";
import ProductHistoryModal from "@/components/PriceHistoryModal";
import {cn} from "@/lib/utils";

// --- UTILS: Size parsing and Unit Pricing ---
const parseProductSize = (name: string, qty?: string | number, unit?: string) => {
    let q = typeof qty === 'string' ? parseFloat(qty) : qty;
    let u = (unit || '').toLowerCase().trim();

    // Fallback to extracting from name if db fields are missing
    if (!q || isNaN(q) || !u) {
        const match = name.match(/(\d+(?:\.\d+)?)\s*(kg|g|mg|l|ml)\b/i);
        if (match) {
            q = parseFloat(match[1]);
            u = match[2].toLowerCase();
        } else {
            return null;
        }
    }

    let baseQty = q;
    let baseUnit = u;

    // Normalize to base units for apples-to-apples comparison
    if (['kg', 'kilogram', 'kilograms'].includes(u)) {
        baseQty = q * 1000;
        baseUnit = 'g';
    } else if (['l', 'liter', 'liters', 'litre', 'litres'].includes(u)) {
        baseQty = q * 1000;
        baseUnit = 'ml';
    }

    return {baseQty, baseUnit, originalQty: q, originalUnit: u};
};

const calculateUnitPrice = (price: number, parsedSize: any, currency: string) => {
    if (!parsedSize || !parsedSize.baseQty) return "—";
    const {baseQty, baseUnit} = parsedSize;

    // Standardize metric to per 100g or 100ml
    if (baseUnit === 'g' || baseUnit === 'ml') {
        const pricePer100 = price / (baseQty / 100);
        return `${currency} ${pricePer100.toFixed(2)} / 100${baseUnit}`;
    }

    // Fallback for piece/bunch/etc
    const pricePerUnit = price / baseQty;
    return `${currency} ${pricePerUnit.toFixed(2)} / ${baseUnit}`;
};

// --- COMPONENT ---
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
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isMappingLoading, setIsMappingLoading] = useState(false);
    const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<any>(null);

    const searchUnmappedProducts = async (query: string) => {
        setProductQuery(query);
        if (!query || query.length < 2) {
            setProductResults([]);
            return;
        }
        try {
            const res = await fetch(`/api/products?query=${encodeURIComponent(query)}&limit=100`);
            if (!res.ok) return;
            const data = await res.json();
            setProductResults(data.products || []);
        } catch (error) {
            console.error("Product search failed", error);
        }
    };

    const handleCreateMapping = async () => {
        if (!selectedProduct) return;
        setIsMappingLoading(true);
        try {
            const res = await fetch("/api/mapping/create", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    productId: selectedProduct._id,
                    ingredientId: ingredientId,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to map product");

            setIsMappingOpen(false);
            setSelectedProduct(null);
            setProductQuery("");
            await onRefreshProducts(); // Tell parent to fetch new prices
        } catch (error: any) {
            console.error("Mapping failed", error);
            alert(error.message);
        } finally {
            setIsMappingLoading(false);
        }
    };

    const hasProducts = products.length > 0;
    let cheapestProduct = null;
    let expensiveProduct = null;
    let averagePrice = 0;

    if (hasProducts && !loadingProducts) {
        const sorted = [...products].sort((a, b) => a.price - b.price);
        cheapestProduct = sorted[0];
        expensiveProduct = sorted[sorted.length - 1];
        averagePrice = products.reduce((acc, curr) => acc + curr.price, 0) / products.length;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold tracking-tight">Retail Products & Pricing</h2>
                        {loadingProducts && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>}
                    </div>
                    <p className="text-muted-foreground">Compare live supermarket listings and prices for this
                        ingredient.</p>
                </div>

                <Dialog open={isMappingOpen} onOpenChange={setIsMappingOpen}>
                    <DialogTrigger>
                        <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/5">
                            <Plus className="mr-2 h-4 w-4"/> Map Product
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Map a Retail Product</DialogTitle>
                            <DialogDescription>
                                Search the database for a raw supermarket product to link to <strong
                                className="capitalize">{ingredientName}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4 py-4">
                            <Command className="rounded-lg border shadow-md overflow-hidden" shouldFilter={false}>
                                <CommandInput placeholder="Search scraped products..." value={productQuery}
                                              onValueChange={searchUnmappedProducts}/>
                                <CommandList className="max-h-[250px]">
                                    <CommandEmpty>{productQuery.length < 2 ? "Type to search..." : "No products found."}</CommandEmpty>
                                    <CommandGroup>
                                        {productResults.map((prod) => (
                                            <CommandItem key={prod._id} value={prod.name}
                                                         onSelect={() => setSelectedProduct(prod)}
                                                         className="flex items-center gap-3 py-3">
                                                <Check
                                                    className={cn("h-4 w-4 shrink-0", selectedProduct?._id === prod._id ? "opacity-100" : "opacity-0")}/>
                                                {(prod.url || prod.image_url) ? (
                                                    <img src={prod.url || prod.image_url} alt=""
                                                         className="h-8 w-8 object-cover rounded bg-muted"/>
                                                ) : (
                                                    <div
                                                        className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                                        <Store className="h-4 w-4 text-muted-foreground"/>
                                                    </div>
                                                )}
                                                <div className="flex flex-col truncate">
                                                    <span className="truncate font-medium">{prod.name}</span>
                                                    <span
                                                        className="text-xs text-muted-foreground">{prod.source?.name || "Unknown Source"}</span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                            <Button className="w-full" disabled={!selectedProduct || isMappingLoading}
                                    onClick={handleCreateMapping}>
                                {isMappingLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Confirm Link"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {loadingProducts ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Skeleton className="h-28 w-full rounded-xl"/>
                        <Skeleton className="h-28 w-full rounded-xl"/>
                        <Skeleton className="h-28 w-full rounded-xl"/>
                    </div>
                    <Skeleton className="h-64 w-full rounded-xl"/>
                </div>
            ) : !hasProducts ? (
                <Card className="bg-muted/50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Store className="h-10 w-10 text-muted-foreground mb-4"/>
                        <p className="text-lg font-medium">No retail products found</p>
                        <p className="text-sm text-muted-foreground">We haven't mapped any supermarket items to this
                            ingredient yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-2 fade-in duration-500">
                        {/* Note: Absolute Lowest price. You could upgrade this to be Lowest *Unit* Price if desired */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Lowest Absolute Price</CardTitle>
                                <TrendingDown className="h-4 w-4 text-green-600"/>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="text-2xl font-bold text-green-600">{cheapestProduct?.currency} {cheapestProduct?.price.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground mt-1 truncate">at {cheapestProduct?.source?.name || "Unknown Source"}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Highest Absolute Price</CardTitle>
                                <TrendingUp className="h-4 w-4 text-destructive"/>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="text-2xl font-bold text-destructive">{expensiveProduct?.currency} {expensiveProduct?.price.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground mt-1 truncate">at {expensiveProduct?.source?.name || "Unknown Source"}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Average Price</CardTitle>
                                <Calculator className="h-4 w-4 text-muted-foreground"/>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="text-2xl font-bold">{cheapestProduct?.currency} {averagePrice.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}</div>
                                <p className="text-xs text-muted-foreground mt-1">Across {products.length} products</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div
                        className="rounded-xl border bg-card overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-500 delay-100">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[80px]">Image</TableHead>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Supermarket</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Price per Unit</TableHead>
                                    <TableHead className="w-[150px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product: any) => {
                                    const parsedSize = parseProductSize(product.name, product.quantity, product.unit);
                                    const displaySize = parsedSize
                                        ? `${parsedSize.originalQty}${parsedSize.originalUnit}`
                                        : (product.quantity && product.unit ? `${product.quantity}${product.unit}` : "—");

                                    return (
                                        <TableRow key={product._id}>
                                            <TableCell>
                                                <div
                                                    className="h-10 w-10 rounded-md overflow-hidden bg-background border flex items-center justify-center">
                                                    {product.url ? <img src={product.url} alt={product.name}
                                                                        className="h-full w-full object-cover"/> :
                                                        <Store className="h-4 w-4 text-muted-foreground"/>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium max-w-[250px] truncate"
                                                       title={product.name}>{product.name}</TableCell>
                                            <TableCell>{product.source?.name ? <Badge variant="secondary"
                                                                                      className="font-normal">{product.source.name}</Badge> :
                                                <span className="text-muted-foreground">—</span>}</TableCell>
                                            <TableCell
                                                className="text-muted-foreground whitespace-nowrap">{displaySize}</TableCell>
                                            <TableCell
                                                className="text-right font-medium whitespace-nowrap">{product.currency} {product.price.toLocaleString()}</TableCell>
                                            <TableCell
                                                className="text-right font-medium whitespace-nowrap text-muted-foreground">
                                                {calculateUnitPrice(product.price, parsedSize, product.currency)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="sm"
                                                            className="h-8 px-2 text-muted-foreground hover:text-primary"
                                                            onClick={() => setSelectedHistoryProduct(product)}
                                                            title="View Price History">
                                                        <LineChart className="h-4 w-4"/>
                                                    </Button>
                                                    {product.source?.website && (
                                                        <Button variant="ghost" size="sm"
                                                                className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                                                                title="View Source">
                                                            <a href={product.source.website} target="_blank"
                                                               rel="noopener noreferrer"><ExternalLink
                                                                className="h-4 w-4"/></a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
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