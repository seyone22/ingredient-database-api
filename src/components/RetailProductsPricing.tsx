"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calculator,
  Check,
  ExternalLink,
  LineChart,
  Loader2,
  Plus,
  Store,
  Info,
  Sparkles,
  Search,
  X,
  Trash2,
} from "lucide-react";
import ProductHistoryModal from "@/components/PriceHistoryModal";
import { cn } from "@/lib/utils";

const getUnitPriceData = (product: any) => {
  const name = product.name.toLowerCase();
  const qtyMatch = name.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l)/i);

  let qty = product.quantity || 1;
  let unit = (product.unit || "unit").toLowerCase();

  if (qtyMatch && !product.quantity) {
    qty = parseFloat(qtyMatch[1]);
    unit = qtyMatch[2].toLowerCase();
  }

  let baseQty = qty || 1; // Prevent division by zero
  let baseUnit = unit;

  if (unit === "kg" || unit === "l") {
    baseQty = qty * 1000;
    baseUnit = unit === "kg" ? "g" : "ml";
  }

  const pricePer100 =
    baseUnit === "g" || baseUnit === "ml"
      ? (product.price / baseQty) * 100
      : product.price / baseQty;

  const displayUnit =
    baseUnit === "g" || baseUnit === "ml"
      ? `100${baseUnit}`
      : baseUnit === "unit"
        ? "unit"
        : baseUnit;

  return {
    pricePer100,
    displayUnit,
    normalizedQty: baseQty,
  };
};

const getFormattedImageUrl = (product: any) => {
  if (!product) return null;
  let imgUrl = product.url || product.imageUrl;

  if (!imgUrl && product.raw) {
    try {
      const rawObj = typeof product.raw === "string" ? JSON.parse(product.raw) : product.raw;
      imgUrl = rawObj?.image || rawObj?.images?.[0]?.src || rawObj?.imageUrl;
    } catch (e) {}
  }

  if (!imgUrl) return null;
  if (imgUrl.startsWith("/")) {
    imgUrl = `https://cargillsonline.com${imgUrl}`;
  }
  return imgUrl;
};

interface RetailProductsPricingProps {
  ingredientId: string;
  ingredientName: string;
  products: any[];
  categories?: { id: string; name: string; count: number }[] | null;
  loadingProducts: boolean;
  resolvedFrom?: { ingredient: string; relation: string; level?: number } | null;
  onRefreshProducts: () => Promise<void>;
}

export default function RetailProductsPricing({
  ingredientId,
  ingredientName,
  products,
  categories,
  loadingProducts,
  resolvedFrom,
  onRefreshProducts,
}: RetailProductsPricingProps) {
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Search State
  const [productQuery, setProductQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [isMappingLoading, setIsMappingLoading] = useState(false);
  const [selectedHistoryProduct, setSelectedHistoryProduct] =
    useState<any>(null);
  const [unlinkingProductId, setUnlinkingProductId] = useState<string | null>(
    null,
  );

  const handleUnlink = async (productId: string) => {
    if (!confirm("Remove this product link from this ingredient?")) return;
    setUnlinkingProductId(productId);
    try {
      const res = await fetch("/api/mapping/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          ingredientId,
        }),
      });
      if (!res.ok) throw new Error("Failed to unlink product");
      await onRefreshProducts();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to unlink product");
    } finally {
      setUnlinkingProductId(null);
    }
  };

  // Selection helpers
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const selectAllUnlinked = () => {
    const unlinked = productResults
      .filter((p) => !linkedProductIds.has(p.id))
      .map((p) => p.id);
    setSelectedProductIds(new Set(unlinked));
  };

  const clearSelection = () => {
    setSelectedProductIds(new Set());
  };

  // Track already linked product IDs for fast O(1) lookups
  const linkedProductIds = useMemo(() => {
    return new Set(products.map((p) => p.id));
  }, [products]);

  const unlinkedCount = useMemo(() => {
    return productResults.filter((p) => !linkedProductIds.has(p.id)).length;
  }, [productResults, linkedProductIds]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (!categories || categories.length <= 1 || selectedCategory === "all") {
      return products;
    }
    return products.filter(
      (p) =>
        p.childIngredient?.name?.toLowerCase() === selectedCategory.toLowerCase() ||
        p.childIngredient?.id === selectedCategory,
    );
  }, [products, categories, selectedCategory]);

  // Calculate Price Insights
  const insights = useMemo(() => {
    if (!filteredProducts.length) return null;
    const processed = filteredProducts.map((p) => ({ ...p, ...getUnitPriceData(p) }));
    const validUnitPrices = processed.filter(
      (p) => p.pricePer100 > 0 && !isNaN(p.pricePer100),
    );

    const sortedByUnit = [...validUnitPrices].sort(
      (a, b) => a.pricePer100 - b.pricePer100,
    );
    const bestValue = sortedByUnit[0] || processed[0];
    const highestValue = sortedByUnit[sortedByUnit.length - 1] || bestValue;
    const cheapestAbsolute = [...processed].sort(
      (a, b) => a.price - b.price,
    )[0];

    const avgPrice =
      filteredProducts.reduce((acc, curr) => acc + curr.price, 0) / filteredProducts.length;
    const avgPricePerUnit =
      validUnitPrices.length > 0
        ? validUnitPrices.reduce((acc, curr) => acc + curr.pricePer100, 0) /
          validUnitPrices.length
        : 0;

    const savingsVsAvg =
      avgPricePerUnit > 0
        ? Math.max(0, Math.round(((avgPricePerUnit - bestValue.pricePer100) / avgPricePerUnit) * 100))
        : 0;

    const priceSpreadRatio =
      bestValue.pricePer100 > 0
        ? (highestValue.pricePer100 / bestValue.pricePer100).toFixed(1)
        : "1.0";

    // Generate specific actionable recommendation
    let recommendationText = "";
    if (savingsVsAvg > 10) {
      recommendationText = `Buy ${bestValue.name.slice(0, 24)}... at ${bestValue.source?.name || "store"} to save ${savingsVsAvg}% vs average unit price.`;
    } else if (parseFloat(priceSpreadRatio) > 1.5) {
      recommendationText = `Huge ${priceSpreadRatio}x unit price variation across stores. Best deal starts at LKR ${bestValue.pricePer100.toFixed(2)}/100.`;
    } else if (bestValue.id !== cheapestAbsolute.id) {
      recommendationText = `Larger sizes at ${bestValue.source?.name || "market"} provide significantly lower per-unit costs.`;
    } else {
      recommendationText = `Prices are consistent. ${bestValue.name.slice(0, 24)} at LKR ${bestValue.price} is the top deal.`;
    }

    return {
      bestValue,
      cheapestAbsolute,
      highestValue,
      avgPrice,
      hasBulkSaving: bestValue.id !== cheapestAbsolute.id,
      avgPricePerUnit,
      savingsVsAvg,
      priceSpreadRatio,
      recommendationText,
    };
  }, [filteredProducts]);

  // 1. Debounce the user input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(productQuery);
    }, 300); // Wait 300ms after user stops typing
    return () => clearTimeout(timer);
  }, [productQuery]);

  // 2. Fetch results when debounced query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.length < 2) {
        setProductResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        // Increased limit to 150 for better scrolling selection
        const res = await fetch(
          `/api/products?query=${encodeURIComponent(debouncedQuery)}&limit=150`,
        );
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

    fetchResults();
  }, [debouncedQuery]);

  const handleCreateMapping = async () => {
    if (selectedProductIds.size === 0) return;
    setIsMappingLoading(true);
    try {
      const res = await fetch("/api/mapping/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: Array.from(selectedProductIds),
          ingredientId,
          override: true,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.detail || errData.message || errData.error || "Mapping failed",
        );
      }

      setIsMappingOpen(false);
      setSelectedProductIds(new Set());
      setProductQuery("");
      setProductResults([]);
      await onRefreshProducts();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to map products");
    } finally {
      setIsMappingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Retail Pricing Analysis
          </h2>
          <p className="text-muted-foreground text-sm">
            Real-time market data for{" "}
            <span className="text-primary font-medium">{ingredientName}</span>
          </p>
        </div>
        <Sheet open={isMappingOpen} onOpenChange={setIsMappingOpen}>
          <SheetTrigger render={
            <Button
              variant="outline"
              size="sm"
              className="border-primary/50 text-primary cursor-pointer hover:bg-primary/10"
            >
              <Plus className="mr-2 h-4 w-4" /> Map Products
            </Button>
          } />
          <SheetContent
            side="right"
            className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-full flex flex-col p-0 gap-0"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b bg-card/60">
              <SheetHeader className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <SheetTitle className="text-lg font-bold leading-tight">
                      Map Retail Products
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                      Search & link supermarket products to{" "}
                      <span className="font-semibold text-foreground">
                        {ingredientName}
                      </span>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-3.5 border-b bg-background">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search products by name or brand (e.g. 'Garlic Butter')..."
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  className="pl-10 pr-9 h-10 text-sm bg-muted/20 border-border/80 focus-visible:bg-background"
                  autoFocus
                />
                {productQuery && (
                  <button
                    type="button"
                    onClick={() => setProductQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Subheader / Quick Actions Toolbar */}
            {productResults.length > 0 && (
              <div className="px-6 py-2.5 bg-muted/30 border-b flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {productResults.length} found &bull;{" "}
                  <strong className="text-foreground font-semibold">
                    {selectedProductIds.size} selected
                  </strong>
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={selectAllUnlinked}
                    className="text-primary hover:underline font-medium cursor-pointer"
                  >
                    Select all unlinked ({unlinkedCount})
                  </button>
                  {selectedProductIds.size > 0 && (
                    <>
                      <span className="text-muted-foreground/40">|</span>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Content List Area - Single Clean Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {isSearching && (
                <div className="flex flex-col items-center justify-center py-20 text-sm text-muted-foreground gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p>Searching supermarket database...</p>
                </div>
              )}

              {!isSearching && debouncedQuery.length < 2 && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-sm text-muted-foreground gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/60">
                    <Search className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Search Supermarkets</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Type at least 2 characters to search Keells, Cargills, Glomark, and Spar
                    </p>
                  </div>
                </div>
              )}

              {!isSearching && debouncedQuery.length >= 2 && productResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-sm text-muted-foreground gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/60">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">No products found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      No supermarket items matched &quot;{debouncedQuery}&quot;
                    </p>
                  </div>
                </div>
              )}

              {!isSearching && productResults.length > 0 && (
                <div className="rounded-xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-2xs">
                  {productResults.map((prod) => {
                    const isLinked = linkedProductIds.has(prod.id);
                    const isSelected = selectedProductIds.has(prod.id);
                    const currentMapping = prod.currentMapping;
                    const isMappedToOther =
                      currentMapping &&
                      currentMapping.ingredientId !== ingredientId;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => !isLinked && toggleProductSelection(prod.id)}
                        className={cn(
                          "group flex items-center gap-3.5 px-4 py-3 transition-colors select-none",
                          !isLinked && "cursor-pointer hover:bg-muted/40",
                          isSelected && "bg-primary/[0.04]",
                          isLinked && "opacity-60 bg-muted/15 cursor-not-allowed",
                        )}
                      >
                        <div
                          className="shrink-0 flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected || isLinked}
                            disabled={isLinked}
                            onCheckedChange={() =>
                              !isLinked && toggleProductSelection(prod.id)
                            }
                          />
                        </div>

                        {/* Thumbnail */}
                        <div className="h-11 w-11 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-center shrink-0 overflow-hidden">
                          {getFormattedImageUrl(prod) ? (
                            <img
                              src={getFormattedImageUrl(prod)!}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Store className="h-5 w-5 text-muted-foreground/60" />
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex flex-col min-w-0 flex-1 gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-sm text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                              {prod.name}
                            </span>
                            <span className="font-mono font-semibold text-sm tabular-nums text-foreground shrink-0">
                              {prod.currency} {prod.price.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="text-[10px] bg-secondary text-secondary-foreground font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase">
                              {prod.source?.name || "Supermarket"}
                            </span>
                            {prod.quantity && (
                              <span className="text-[11px] text-muted-foreground">
                                {prod.quantity} {prod.unit}
                              </span>
                            )}

                            {/* Mapping status tags */}
                            {isLinked && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                                <Check className="h-3 w-3 text-green-600" /> Linked
                              </span>
                            )}

                            {isMappedToOther && !isLinked && (
                              <span className="inline-flex items-center text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                Mapped to: {currentMapping.ingredientName}
                              </span>
                            )}

                            {isSelected && isMappedToOther && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                (Will reassign)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="px-6 py-4 border-t bg-card/80 backdrop-blur-sm mt-auto flex items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground">
                {selectedProductIds.size === 0 ? (
                  "Select items to link"
                ) : (
                  <span>
                    <strong className="text-foreground font-semibold">
                      {selectedProductIds.size}
                    </strong>{" "}
                    {selectedProductIds.size === 1 ? "item" : "items"} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMappingOpen(false)}
                  disabled={isMappingLoading}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="cursor-pointer min-w-[140px]"
                  disabled={selectedProductIds.size === 0 || isMappingLoading}
                  onClick={handleCreateMapping}
                >
                  {isMappingLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Linking...
                    </>
                  ) : selectedProductIds.size > 1 ? (
                    `Confirm & Link (${selectedProductIds.size})`
                  ) : selectedProductIds.size === 1 ? (
                    "Confirm & Link"
                  ) : (
                    "Select Products"
                  )}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {resolvedFrom && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
          <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            {resolvedFrom.relation === "parent" ? (
              <>
                No retail products are directly mapped to <strong>{ingredientName}</strong>. Displaying market pricing from its immediate parent ingredient (<strong>{resolvedFrom.ingredient}</strong>).
              </>
            ) : resolvedFrom.relation === "ancestor" ? (
              <>
                No retail products are directly mapped to <strong>{ingredientName}</strong> or its immediate parent. Displaying market pricing from ancestor ingredient (<strong>{resolvedFrom.ingredient}</strong>).
              </>
            ) : (
              <>
                Displaying market pricing aggregated across varieties of <strong>{ingredientName}</strong>.
              </>
            )}
          </span>
        </div>
      )}

      {categories && categories.length > 1 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
            <span className="font-semibold text-foreground">Categories & Varieties:</span>
            <span>{categories.length - 1} categories</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
            {categories.map((cat) => {
              const isSelected =
                selectedCategory === cat.name ||
                (selectedCategory === "all" && cat.id === "all");
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === cat.name ? "all" : cat.name,
                    )
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer border shadow-sm",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground hover:bg-muted/70 hover:text-foreground border-border/60",
                  )}
                >
                  <span className="capitalize">{cat.name}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                      isSelected
                        ? "bg-primary-foreground/25 text-primary-foreground"
                        : "bg-muted text-foreground/80 border border-border/40",
                    )}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loadingProducts ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !filteredProducts.length ? (
        <Card className="bg-muted/50 border-dashed py-16 text-center">
          <div className="max-w-[300px] mx-auto space-y-3">
            <Store className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="font-semibold text-lg">No products found</p>
            <p className="text-sm text-muted-foreground">
              {selectedCategory !== "all"
                ? `No products mapped under category "${selectedCategory}".`
                : "Linked retail products will appear here to provide price benchmarks."}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-100 bg-green-50/30">
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <Sparkles className="h-4 w-4 text-green-600" />
                <CardTitle className="text-xs font-bold uppercase text-green-700">
                  Best Unit Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {insights?.bestValue.currency}{" "}
                  {insights?.bestValue.pricePer100.toFixed(2)}
                </div>
                <p className="text-[10px] text-green-600 font-medium">
                  Per {insights?.bestValue.displayUnit}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                  Market Average
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {insights?.bestValue.currency}{" "}
                  {insights?.avgPricePerUnit.toFixed(2)}
                </div>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Per 100g/ml (Avg base: LKR {insights?.avgPrice.toFixed(0)})
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-100 bg-blue-50/30">
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-1.5">
                  <LineChart className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-xs font-bold uppercase text-blue-700">
                    Buying Insight
                  </CardTitle>
                </div>
                {insights && insights.savingsVsAvg > 0 && (
                  <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5">
                    Save {insights.savingsVsAvg}%
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-sm font-semibold text-blue-900 leading-snug">
                  {insights?.recommendationText}
                </div>
                {insights && (
                  <p className="text-[10px] text-blue-700/80 font-medium">
                    {insights.priceSpreadRatio !== "1.0"
                      ? `${insights.priceSpreadRatio}x price spread across stores (LKR ${insights.bestValue.pricePer100.toFixed(2)} vs LKR ${insights.highestValue.pricePer100.toFixed(2)}/100)`
                      : `Market average unit price: LKR ${insights.avgPricePerUnit.toFixed(2)}/100`}
                  </p>
                )}
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
                {filteredProducts.map((product) => {
                  const unitData = getUnitPriceData(product);
                  const isBestValue = product.id === insights?.bestValue.id;
                  const formattedImgUrl = getFormattedImageUrl(product);
                  const isImgFailed = imgErrorMap[product.id];

                  return (
                    <TableRow
                      key={product.id}
                      className={cn(isBestValue && "bg-green-50/20")}
                    >
                      <TableCell>
                        <div className="h-10 w-10 rounded border bg-white flex items-center justify-center overflow-hidden shrink-0">
                          {formattedImgUrl && !isImgFailed ? (
                            <img
                              src={formattedImgUrl}
                              alt={product.name}
                              className="object-cover h-full w-full"
                              onError={() =>
                                setImgErrorMap((prev) => ({
                                  ...prev,
                                  [product.id]: true,
                                }))
                              }
                            />
                          ) : (
                            <Store className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm line-clamp-1">
                            {product.name}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                              {product.source?.name}
                              {product.quantity &&
                                ` • ${product.quantity}${product.unit}`}
                            </span>
                            {product.childIngredient && categories && categories.length > 1 && (
                              <Badge
                                variant="outline"
                                className="h-4 text-[9px] font-medium border-primary/20 text-primary bg-primary/5 px-1 capitalize"
                              >
                                {product.childIngredient.name}
                              </Badge>
                            )}
                            {isBestValue && (
                              <Badge className="h-4 text-[9px] bg-green-600 hover:bg-green-600 border-none px-1">
                                BEST VALUE
                              </Badge>
                            )}
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
                          <span className="text-[10px] text-muted-foreground">
                            per {unitData.displayUnit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Price history"
                            onClick={() => setSelectedHistoryProduct(product)}
                          >
                            <LineChart className="h-4 w-4" />
                          </Button>
                          {product.source?.website && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary"
                              title="View on store website"
                            >
                              <a
                                href={product.source.website}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Unlink product"
                            disabled={unlinkingProductId === product.id}
                            onClick={() => handleUnlink(product.id)}
                          >
                            {unlinkingProductId === product.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
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

