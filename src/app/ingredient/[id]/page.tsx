"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowLeft, Globe, Image as ImageIcon, Info, Leaf,
    Sparkles, Utensils, TrendingDown, TrendingUp, Store,
    ExternalLink, Calculator, Loader2, Wand2, Plus, Check, LineChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import ProductHistoryModal from "@/components/PriceHistoryModal"; // <-- Import the new modal!

export default function IngredientPage() {
    const { id } = useParams();
    const router = useRouter();

    // Core Ingredient State
    const [ingredient, setIngredient] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);

    // Pricing & Product State
    const [products, setProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);

    // Product Mapping Modal State
    const [isMappingOpen, setIsMappingOpen] = useState(false);
    const [productQuery, setProductQuery] = useState("");
    const [productResults, setProductResults] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isMappingLoading, setIsMappingLoading] = useState(false);

    // History Modal State
    const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<any>(null);

    // 1. Fetch Core Ingredient Data
    const fetchIngredient = async () => {
        try {
            const res = await fetch(`/api/ingredients/${id}`);
            if (!res.ok) throw new Error("Failed to fetch ingredient");
            const data = await res.json();
            setIngredient(data.ingredient || data);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    // 2. Fetch Pricing Data Independently
    const fetchPrices = async () => {
        try {
            const res = await fetch(`/api/ingredients/${id}/price`);
            if (!res.ok) throw new Error("Failed to fetch prices");
            const data = await res.json();
            setProducts(data.prices || []);
        } catch (err) {
            console.error("Pricing fetch error:", err);
            setProducts([]);
        } finally {
            setLoadingProducts(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        fetchIngredient();
    }, [id]);

    useEffect(() => {
        if (!id) return;
        fetchPrices();
    }, [id]);

    // --- Action: Enhance Item ---
    const handleEnhance = async () => {
        if (!confirm(`Run AI enrichment on ${ingredient.name}?`)) return;
        setIsEnhancing(true);

        try {
            const res = await fetch(`/api/ingredients/enhance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: [id] }),
            });

            if (!res.ok) throw new Error("Enhancement failed");

            await fetchIngredient(); // Refresh page data
            alert("Ingredient successfully enhanced!");
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Enhancement failed");
        } finally {
            setIsEnhancing(false);
        }
    };

    // --- Action: Search Products (for Mapping) ---
    const searchUnmappedProducts = async (query: string) => {
        setProductQuery(query);
        if (!query || query.length < 2) {
            setProductResults([]);
            return;
        }
        try {
            const res = await fetch(`/api/products?query=${encodeURIComponent(query)}&limit=15`);
            if (!res.ok) return;
            const data = await res.json();
            setProductResults(data.products || []);
        } catch (error) {
            console.error("Product search failed", error);
        }
    };

    // --- Action: Create Mapping ---
    const handleCreateMapping = async () => {
        if (!selectedProduct) return;
        setIsMappingLoading(true);

        try {
            const res = await fetch("/api/mapping/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: selectedProduct._id,
                    ingredientId: id,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to map product");
            }

            setIsMappingOpen(false);
            setSelectedProduct(null);
            setProductQuery("");
            setLoadingProducts(true);
            await fetchPrices(); // Refresh pricing table

        } catch (error: any) {
            console.error("Mapping failed", error);
            alert(error.message);
        } finally {
            setIsMappingLoading(false);
        }
    };

    const formatAliases = (aliases: any[]) => {
        if (!aliases || aliases.length === 0) return null;
        return aliases.map(a => (typeof a === 'string' ? a : a.name)).join(", ");
    };

    // --- Pricing Analytics Logic ---
    const hasProducts = products.length > 0;
    let cheapestProduct = null;
    let expensiveProduct = null;
    let averagePrice = 0;

    if (hasProducts && !loadingProducts) {
        const sorted = [...products].sort((a, b) => a.price - b.price);
        cheapestProduct = sorted[0];
        expensiveProduct = sorted[sorted.length - 1];

        const total = products.reduce((acc: number, curr: any) => acc + curr.price, 0);
        averagePrice = total / products.length;
    }

    return (
        <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
            <NavBar />

            <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-8 pt-0 flex flex-col gap-8">
                {/* Back Button & Top Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                    <Button variant="ghost" onClick={() => router.back()} className="-ml-4 text-muted-foreground hover:text-foreground self-start">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to results
                    </Button>

                    {!loading && ingredient && (
                        <Button
                            onClick={handleEnhance}
                            disabled={isEnhancing}
                            className="bg-primary hover:bg-primary/90 shadow-sm"
                        >
                            {isEnhancing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                            {isEnhancing ? "Enhancing..." : "Enhance with AI"}
                        </Button>
                    )}
                </div>

                {/* Main Loading State */}
                {loading && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-3/4 md:w-1/2" />
                            <Skeleton className="h-6 w-1/3" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Skeleton className="h-64 md:col-span-1 rounded-xl" />
                            <div className="md:col-span-2 space-y-4">
                                <Skeleton className="h-8 w-1/4" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-8 w-1/3" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {!loading && (error || !ingredient) && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <Info className="h-12 w-12 text-muted-foreground" />
                        <h2 className="text-2xl font-bold">Ingredient not found</h2>
                        <p className="text-muted-foreground">We couldn't find the ingredient you were looking for.</p>
                        <Button onClick={() => router.push('/')}>Return Home</Button>
                    </div>
                )}

                {/* Content State */}
                {!loading && ingredient && (
                    <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 flex flex-col gap-12">

                        {/* --- TOP SECTION: INGREDIENT DETAILS --- */}
                        <div className="flex flex-col gap-8">
                            {/* Header */}
                            <div className="space-y-3 border-b pb-6">
                                <div className="flex items-baseline gap-3 flex-wrap">
                                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground capitalize">
                                        {ingredient.name}
                                    </h1>
                                    {ingredient.pronunciation && (
                                        <span className="text-xl text-muted-foreground italic">
                                            /{ingredient.pronunciation}/
                                        </span>
                                    )}
                                </div>

                                {ingredient.aliases && ingredient.aliases.length > 0 && (
                                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-3xl">
                                        <span className="font-semibold text-foreground">Also known as: </span>
                                        {formatAliases(ingredient.aliases)}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                                {/* Left Column: Image */}
                                {ingredient.image?.url && (
                                    <div className="lg:col-span-1 space-y-3">
                                        <div className="rounded-2xl overflow-hidden border bg-muted shadow-sm ring-1 ring-border/50">
                                            <img
                                                src={ingredient.image.url}
                                                alt={ingredient.name}
                                                className="w-full h-auto object-cover aspect-square lg:aspect-[4/3]"
                                            />
                                        </div>
                                        {ingredient.image.author && (
                                            <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
                                                <ImageIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                <span
                                                    className="[&>a]:text-primary [&>a]:hover:underline"
                                                    dangerouslySetInnerHTML={{ __html: `Photo by ${ingredient.image.author}` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Right Column: Details */}
                                <div className={`space-y-10 ${ingredient.image?.url ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                                    {ingredient.comment && (
                                        <div className="text-base text-foreground/90 leading-relaxed
                                            [&>p]:mb-4 last:[&>p]:mb-0
                                            [&>a]:text-primary [&>a]:font-medium [&>a]:hover:underline"
                                        >
                                            <div dangerouslySetInnerHTML={{ __html: ingredient.comment }} />
                                        </div>
                                    )}

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {(ingredient.country?.length > 0 || ingredient.region?.length > 0) && (
                                            <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-3">
                                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                    <Globe className="h-4 w-4" /> Origin
                                                </h3>
                                                <div className="flex flex-col gap-1.5 text-sm">
                                                    {ingredient.country && ingredient.country.length > 0 && (
                                                        <p><span className="font-medium">Country:</span> {ingredient.country.join(", ")}</p>
                                                    )}
                                                    {ingredient.region && ingredient.region.length > 0 && (
                                                        <p><span className="font-medium">Region:</span> {ingredient.region.join(", ")}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {ingredient.cuisine && ingredient.cuisine.length > 0 && (
                                            <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-3">
                                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                    <Utensils className="h-4 w-4" /> Cuisines
                                                </h3>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {ingredient.cuisine.map((c: string) => (
                                                        <Badge key={c} variant="outline" className="bg-background">{c}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {ingredient.flavor_profile && ingredient.flavor_profile.length > 0 && (
                                            <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-3">
                                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4" /> Flavor Profile
                                                </h3>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {ingredient.flavor_profile.map((f: string) => (
                                                        <Badge key={f} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-medium">
                                                            {f}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {ingredient.dietary_flags && ingredient.dietary_flags.length > 0 && (
                                            <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-3">
                                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                    <Leaf className="h-4 w-4" /> Dietary Info
                                                </h3>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {ingredient.dietary_flags.map((d: string) => (
                                                        <Badge key={d} variant="default" className="bg-green-600 hover:bg-green-700 text-white font-medium border-none shadow-none">
                                                            {d}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        {/* --- BOTTOM SECTION: PRICING & PRODUCTS --- */}
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-bold tracking-tight">Retail Products & Pricing</h2>
                                        {loadingProducts && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                                    </div>
                                    <p className="text-muted-foreground">Compare live supermarket listings and prices for this ingredient.</p>
                                </div>

                                {/* Map Product Modal Trigger */}
                                <Dialog open={isMappingOpen} onOpenChange={setIsMappingOpen}>
                                    <DialogTrigger>
                                        <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/5">
                                            <Plus className="mr-2 h-4 w-4" /> Map Product
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                            <DialogTitle>Map a Retail Product</DialogTitle>
                                            <DialogDescription>
                                                Search the database for a raw supermarket product to link to <strong className="capitalize">{ingredient.name}</strong>.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="flex flex-col gap-4 py-4">
                                            <Command className="rounded-lg border shadow-md overflow-hidden" shouldFilter={false}>
                                                <CommandInput
                                                    placeholder="Search scraped products (e.g., Keells Apple)..."
                                                    value={productQuery}
                                                    onValueChange={searchUnmappedProducts}
                                                />
                                                <CommandList className="max-h-[250px]">
                                                    <CommandEmpty>
                                                        {productQuery.length < 2 ? "Type to search..." : "No products found."}
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        {productResults.map((prod) => (
                                                            <CommandItem
                                                                key={prod._id}
                                                                value={prod.name}
                                                                onSelect={() => setSelectedProduct(prod)}
                                                                className="flex items-center gap-3 py-3"
                                                            >
                                                                <Check className={cn("h-4 w-4 shrink-0", selectedProduct?._id === prod._id ? "opacity-100" : "opacity-0")} />
                                                                {(prod.url || prod.image_url) ? (
                                                                    <img src={prod.url || prod.image_url} alt="" className="h-8 w-8 object-cover rounded bg-muted" />
                                                                ) : (
                                                                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                                                        <Store className="h-4 w-4 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col truncate">
                                                                    <span className="truncate font-medium">{prod.name}</span>
                                                                    <span className="text-xs text-muted-foreground">{prod.source?.name || "Unknown Source"}</span>
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
                                                {isMappingLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Link"}
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {/* Progressive Loading State for Products */}
                            {loadingProducts ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Skeleton className="h-28 w-full rounded-xl" />
                                        <Skeleton className="h-28 w-full rounded-xl" />
                                        <Skeleton className="h-28 w-full rounded-xl" />
                                    </div>
                                    <Skeleton className="h-64 w-full rounded-xl" />
                                </div>
                            ) : !hasProducts ? (
                                /* Empty State */
                                <Card className="bg-muted/50 border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <Store className="h-10 w-10 text-muted-foreground mb-4" />
                                        <p className="text-lg font-medium">No retail products found</p>
                                        <p className="text-sm text-muted-foreground">We haven't mapped any supermarket items to this ingredient yet.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                /* Data State */
                                <>
                                    {/* Pricing Analytics Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-2 fade-in duration-500">
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Lowest Price</CardTitle>
                                                <TrendingDown className="h-4 w-4 text-green-600" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-green-600">
                                                    {cheapestProduct?.currency} {cheapestProduct?.price.toLocaleString()}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                                    at {cheapestProduct?.source?.name || "Unknown Source"}
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Highest Price</CardTitle>
                                                <TrendingUp className="h-4 w-4 text-destructive" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold text-destructive">
                                                    {expensiveProduct?.currency} {expensiveProduct?.price.toLocaleString()}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                                    at {expensiveProduct?.source?.name || "Unknown Source"}
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Average Price</CardTitle>
                                                <Calculator className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">
                                                    {cheapestProduct?.currency} {averagePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Across {products.length} products
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Products Table */}
                                    <div className="rounded-xl border bg-card overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-500 delay-100">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="w-[80px]">Image</TableHead>
                                                    <TableHead>Product Name</TableHead>
                                                    <TableHead>Supermarket</TableHead>
                                                    <TableHead>Size</TableHead>
                                                    <TableHead className="text-right">Price</TableHead>
                                                    <TableHead className="w-[150px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {products.map((product: any) => (
                                                    <TableRow key={product._id}>
                                                        <TableCell>
                                                            <div className="h-10 w-10 rounded-md overflow-hidden bg-background border flex items-center justify-center">
                                                                {product.url ? (
                                                                    <img src={product.url} alt={product.name} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <Store className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium max-w-[250px] truncate" title={product.name}>
                                                            {product.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            {product.source?.name ? (
                                                                <Badge variant="secondary" className="font-normal">
                                                                    {product.source.name}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground whitespace-nowrap">
                                                            {product.quantity && product.unit ? `${product.quantity}${product.unit}` : "—"}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium whitespace-nowrap">
                                                            {product.currency} {product.price.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 px-2 text-muted-foreground hover:text-primary"
                                                                    onClick={() => setSelectedHistoryProduct(product)}
                                                                    title="View Price History"
                                                                >
                                                                    <LineChart className="h-4 w-4" />
                                                                </Button>
                                                                {product.source?.website && (
                                                                    <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10" title="View Source">
                                                                        <a href={product.source.website} target="_blank" rel="noopener noreferrer">
                                                                            <ExternalLink className="h-4 w-4" />
                                                                        </a>
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <Footer />

            {/* Price History Modal Component */}
            <ProductHistoryModal
                product={selectedHistoryProduct}
                open={!!selectedHistoryProduct}
                onOpenChange={(open) => !open && setSelectedHistoryProduct(null)}
            />
        </div>
    );
}