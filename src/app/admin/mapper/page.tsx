"use client";

import React, { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, SkipForward, Link as LinkIcon, PartyPopper, Store } from "lucide-react";
import { cn } from "@/lib/utils";

interface IngredientOption {
    _id: string;
    name: string;
}

interface Product {
    _id: string;
    name: string;
    image_url?: string;
    url?: string; // Accommodating the 'url' field from your DB schema
}

export default function MapperPage() {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);

    // Combobox State
    const [open, setOpen] = useState(false);
    const [ingredientQuery, setIngredientQuery] = useState("");
    const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
    const [selectedIngredient, setSelectedIngredient] = useState<IngredientOption | null>(null);

    // Fetch a random unmapped product
    const fetchRandomProduct = useCallback(async () => {
        setLoading(true);
        setSelectedIngredient(null);
        setIngredientQuery("");
        try {
            const res = await fetch("/api/mapping");
            const data = await res.json();
            if (res.ok && data.product) {
                setProduct(data.product);
            } else {
                setProduct(null);
            }
        } catch (error) {
            console.error("Failed to fetch product", error);
            setProduct(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRandomProduct();
    }, [fetchRandomProduct]);

    // Fetch ingredient suggestions (triggered as user types)
    const searchIngredients = async (query: string) => {
        setIngredientQuery(query);
        if (!query || query.length < 2) {
            setIngredients([]);
            return;
        }

        try {
            const res = await fetch(`/api/ingredients?query=${encodeURIComponent(query)}&autosuggest=true&limit=10`);
            if (!res.ok) return;
            const data = await res.json();
            setIngredients(data.results || []);
        } catch (error) {
            console.error("Search failed", error);
        }
    };

    // Handle Match Submission
    const handleMatch = async () => {
        if (!product || !selectedIngredient) return;
        setActionLoading(true);

        try {
            await fetch("/api/mapping/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: product._id,
                    ingredientId: selectedIngredient._id,
                }),
            });
            await fetchRandomProduct();
        } catch (error) {
            console.error("Mapping failed", error);
            alert("Failed to map ingredient.");
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Skip
    const handleSkip = async () => {
        setActionLoading(true);
        await fetchRandomProduct();
        setActionLoading(false);
    };

    const imageUrl = product?.url || product?.image_url;

    return (
        <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
            <NavBar />

            <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-12 flex flex-col gap-8">

                {/* Header */}
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <LinkIcon className="h-8 w-8 text-primary" />
                        Product Mapper
                    </h1>
                    <p className="text-muted-foreground">Link raw supermarket products to canonical database ingredients.</p>
                </div>

                {/* Loading State */}
                {loading && (
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-8 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/4" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Skeleton className="h-48 w-48 rounded-xl" />
                            <div className="flex gap-4">
                                <Skeleton className="h-10 flex-1" />
                                <Skeleton className="h-10 w-24" />
                                <Skeleton className="h-10 w-24" />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Empty State (All Caught Up) */}
                {!loading && !product && (
                    <Card className="bg-muted/50 border-dashed text-center py-16">
                        <CardContent className="flex flex-col items-center justify-center space-y-4">
                            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                                <PartyPopper className="h-8 w-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">You're all caught up!</h2>
                            <p className="text-muted-foreground max-w-md">
                                There are currently no unmapped products in the database. Excellent work keeping the catalog clean.
                            </p>
                            <Button variant="outline" onClick={fetchRandomProduct} className="mt-4">
                                Check Again
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Active Mapping State */}
                {!loading && product && (
                    <Card className="border-primary/20 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                        <CardHeader>
                            <CardTitle className="text-2xl leading-tight">{product.name}</CardTitle>
                            <CardDescription>ID: {product._id}</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-8">
                            {/* Product Image */}
                            <div className="h-48 w-48 rounded-xl border bg-muted flex items-center justify-center overflow-hidden">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={product.name}
                                        className="h-full w-full object-cover mix-blend-multiply"
                                    />
                                ) : (
                                    <Store className="h-10 w-10 text-muted-foreground" />
                                )}
                            </div>

                            {/* Controls */}
                            <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">

                                {/* Async Combobox */}
                                <div className="flex-1 w-full">
                                    <Popover open={open} onOpenChange={setOpen}>
                                        <PopoverTrigger>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={open}
                                                className="w-full justify-between h-12 text-base font-normal"
                                            >
                                                {selectedIngredient
                                                    ? selectedIngredient.name
                                                    : "Search for an ingredient..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0" align="start">
                                            {/* shouldFilter={false} is critical so cmdk doesn't override our API filtering */}
                                            <Command shouldFilter={false}>
                                                <CommandInput
                                                    placeholder="Type to search..."
                                                    value={ingredientQuery}
                                                    onValueChange={searchIngredients}
                                                />
                                                <CommandList>
                                                    <CommandEmpty>
                                                        {ingredientQuery.length < 2
                                                            ? "Type at least 2 characters..."
                                                            : "No ingredients found."}
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        {ingredients.map((ingredient) => (
                                                            <CommandItem
                                                                key={ingredient._id}
                                                                value={ingredient.name}
                                                                onSelect={() => {
                                                                    setSelectedIngredient(ingredient);
                                                                    setOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedIngredient?._id === ingredient._id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {ingredient.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="default"
                                        className="flex-1 sm:flex-none h-12 px-8 bg-primary hover:bg-primary/90"
                                        disabled={!selectedIngredient || actionLoading}
                                        onClick={handleMatch}
                                    >
                                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Match"}
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        className="flex-1 sm:flex-none h-12 px-6"
                                        disabled={actionLoading}
                                        onClick={handleSkip}
                                    >
                                        Skip <SkipForward className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>

            <Footer />
        </div>
    );
}