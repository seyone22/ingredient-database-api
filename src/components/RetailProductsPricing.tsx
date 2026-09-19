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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  loadingProducts: boolean;
  resolvedFrom?: { ingredient: string; relation: string } | null;
  onRefreshProducts: () => Promise<void>;
}

export default function RetailProductsPricing({
  ingredientId,
  ingredientName,
  products,
  loadingProducts,
  resolvedFrom,
  onRefreshProducts,
}: RetailProductsPricingProps) {
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});

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

  // Calculate Price Insights
  const insights = useMemo(() => {
    if (!products.length) return null;
    const processed = products.map((p) => ({ ...p, ...getUnitPriceData(p) }));
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
      products.reduce((acc, curr) => acc + curr.price, 0) / products.length;
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
  }, [products]);

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
            className="w-full sm:max-w-xl md:max-w-2xl h-full flex flex-col p-0 gap-0"
          >
            {/* Header */}
            <div className="p-6 border-b pb-4">
              <SheetHeader>
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" /> Map Retail Products
                </SheetTitle>
                <SheetDescription>
                  Search supermarkets to link retail products to{" "}
                  <span className="font-semibold text-foreground">
                    {ingredientName}
                  </span>
                  .
                </SheetDescription>
              </SheetHeader>
            </div>

            {/* Content & Search */}
            <div className="flex flex-col flex-1 overflow-hidden p-4 sm:p-6 gap-4">
              <Command
                className="rounded-xl border shadow-sm flex-1 overflow-hidden flex flex-col bg-background"
                shouldFilter={false}
              >
                <div className="border-b px-3">
                  <CommandInput
                    placeholder="Search products by name or brand (e.g. 'Garlic Butter')..."
                    value={productQuery}
                    onValueChange={setProductQuery}
                    className="text-sm h-12"
                  />
                </div>

                {/* Selection Bar: Select All / Clear Selection & Count */}
                {productResults.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40 text-xs">
                    <span className="text-muted-foreground">
                      {productResults.length} found &bull;{" "}
                      <span className="font-medium text-foreground">
                        {selectedProductIds.size} selected
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllUnlinked}
                        className="text-primary hover:underline font-medium cursor-pointer"
                      >
                        Select all unlinked
                      </button>
                      {selectedProductIds.size > 0 && (
                        <>
                          <span className="text-muted-foreground/50">|</span>
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

                <CommandList className="max-h-none flex-1 overflow-y-auto p-2">
                  {isSearching && (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />{" "}
                      Searching database...
                    </div>
                  )}
                  {!isSearching &&
                    debouncedQuery.length >= 2 &&
                    productResults.length === 0 && (
                      <CommandEmpty className="py-12 text-center text-sm text-muted-foreground">
                        No products found matching &quot;{debouncedQuery}&quot;.
                      </CommandEmpty>
                    )}
                  {!isSearching && debouncedQuery.length < 2 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground gap-2">
                      <Search className="h-8 w-8 text-muted-foreground/40" />
                      <p className="font-medium">Type at least 2 characters</p>
                      <p className="text-xs text-muted-foreground/70">
                        Search across Keells, Cargills, Glomark, and Spar
                      </p>
                    </div>
                  )}

                  <CommandGroup>
                    {productResults.map((prod) => {
                      const isLinked = linkedProductIds.has(prod.id);
                      const isSelected = selectedProductIds.has(prod.id);
                      const currentMapping = prod.currentMapping;
                      const isMappedToOther =
                        currentMapping &&
                        currentMapping.ingredientId !== ingredientId;

                      return (
                        <CommandItem
                          key={prod.id}
                          value={prod.id}
                          onSelect={() =>
                            !isLinked && toggleProductSelection(prod.id)
                          }
                          disabled={isLinked}
                          className={cn(
                            "flex items-start gap-3.5 p-3 rounded-lg border my-1.5 transition-colors",
                            isSelected
                              ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                              : "border-border/60 hover:bg-muted/50",
                            isLinked
                              ? "opacity-60 cursor-not-allowed bg-muted/20"
                              : "cursor-pointer",
                          )}
                        >
                          <div className="pt-1">
                            <Checkbox
                              checked={isSelected || isLinked}
                              disabled={isLinked}
                              onCheckedChange={() =>
                                !isLinked && toggleProductSelection(prod.id)
                              }
                            />
                          </div>

                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border">
                            {getFormattedImageUrl(prod) ? (
                              <img
                                src={getFormattedImageUrl(prod)!}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Store className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>

                          <div className="flex flex-col min-w-0 flex-1 gap-1">
                            <span className="font-medium text-sm leading-snug line-clamp-2">
                              {prod.name}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                {prod.source?.name || "Market"}
                              </span>
                              <span className="text-muted-foreground font-mono font-medium">
                                {prod.currency} {prod.price}
                              </span>
                            </div>

                            {/* Mapping status tags */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {isLinked && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground"
                                >
                                  Linked to this ingredient
                                </Badge>
                              )}

                              {isMappedToOther && !isLinked && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                                >
                                  Mapped to: {currentMapping.ingredientName}
                                </Badge>
                              )}

                              {isSelected && isMappedToOther && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  (Will reassign)
                                </span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 sm:p-6 border-t bg-card mt-auto flex items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground">
                {selectedProductIds.size === 0 ? (
                  "Select items to link"
                ) : (
                  <span>
                    <strong className="text-foreground">
                      {selectedProductIds.size}
                    </strong>{" "}
                    item(s) selected
                  </span>
                )}
              </div>
              <Button
                className="cursor-pointer"
                disabled={selectedProductIds.size === 0 || isMappingLoading}
                onClick={handleCreateMapping}
              >
                {isMappingLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : selectedProductIds.size > 1 ? (
                  `Confirm & Link (${selectedProductIds.size} Products)`
                ) : selectedProductIds.size === 1 ? (
                  "Confirm & Link Product"
                ) : (
                  "Select Products to Link"
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {resolvedFrom && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
          <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>{ingredientName}</strong> is not sold standalone in retail stores. Displaying market pricing for its base parent ingredient (<strong>{resolvedFrom.ingredient}</strong>).
          </span>
        </div>
      )}

      {loadingProducts ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !products.length ? (
        <Card className="bg-muted/50 border-dashed py-16 text-center">
          <div className="max-w-[300px] mx-auto space-y-3">
            <Store className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="font-semibold text-lg">No links found</p>
            <p className="text-sm text-muted-foreground">
              Linked retail products will appear here to provide price
              benchmarks.
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
                  {products[0].currency}{" "}
                  {insights?.avgPrice.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <div className="text-[10px] text-gray-500 font-medium uppercase">
                  Avg Unit: {products[0].currency}{" "}
                  {insights?.avgPricePerUnit.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 bg-blue-50/40">
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-blue-600" />
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
                {products.map((product) => {
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
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                              {product.source?.name}
                              {product.quantity &&
                                ` • ${product.quantity}${product.unit}`}
                            </span>
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
                            className="h-8 w-8"
                            onClick={() => setSelectedHistoryProduct(product)}
                          >
                            <LineChart className="h-4 w-4" />
                          </Button>
                          {product.source?.website && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary"
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

