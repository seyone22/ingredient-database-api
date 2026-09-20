"use client";

import {
  AlertCircle,
  Check,
  CheckSquare,
  ChefHat,
  ClipboardList,
  Copy,
  DollarSign,
  ExternalLink,
  Link as LinkIcon,
  Package,
  RefreshCw,
  Scale,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  Square,
  Store,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useState, useEffect } from "react";
import Footer from "@/components/footer/Footer";
import NavBar from "@/components/navbar/NavBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  HowToSupply,
  PricingStrategy,
  SchemaOrgRecipe,
} from "@/types/recipePricing";

const SUPERMARKET_OPTIONS = [
  { id: "keells", label: "Keells", color: "bg-emerald-600" },
  { id: "cargills", label: "Cargills", color: "bg-red-600" },
  { id: "glomark", label: "Glomark", color: "bg-blue-600" },
  { id: "spar", label: "SPAR", color: "bg-emerald-700" },
  { id: "arpico", label: "Arpico", color: "bg-blue-700" },
];

function ItemThumbnail({
  src,
  fallbackSrc,
  alt,
}: {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
}) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(
    src || fallbackSrc || null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc || null);
    setFailed(false);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (currentSrc === src && fallbackSrc && fallbackSrc !== src) {
      setCurrentSrc(fallbackSrc);
    } else {
      setFailed(true);
    }
  };

  if (!currentSrc || failed) {
    return (
      <div className="w-12 h-12 rounded-lg bg-background border border-border/80 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs relative">
        <Store className="w-5 h-5 text-muted-foreground/60" />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-lg bg-background border border-border/80 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={handleError}
      />
    </div>
  );
}

export default function RecipePricingPage() {
  const [activeTab, setActiveTab] = useState<"url" | "text">("url");
  const [urlInput, setUrlInput] = useState("");
  const [rawTextInput, setRawTextInput] = useState("");

  // Options State
  const [strategy, setStrategy] = useState<PricingStrategy>("cheapest");
  const [targetServings, setTargetServings] = useState<number | undefined>(
    undefined,
  );
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [excludeInput, setExcludeInput] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  // Execution & Response State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SchemaOrgRecipe | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const toggleItemCheck = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyReceiptText = () => {
    if (!result) return;
    const lines = [
      `🛒 GROCERY SHOPPING LIST: ${result.name.toUpperCase()}`,
      `Yield: ${result.recipeYield || "Standard"} servings`,
      `Strategy: ${strategy.replace(/_/g, " ").toUpperCase()}`,
      `----------------------------------------`,
    ];

    result.recipeIngredient?.forEach((ing, i) => {
      const offer = ing.offers?.[0];
      const isChecked = checkedItems[`${ing.name}-${i}`];
      const checkMark = isChecked ? "[x]" : "[ ]";
      const req = `${ing.requiredQuantity?.value ?? 1} ${ing.requiredQuantity?.unitText ?? "unit"}`;
      if (offer) {
        const store = offer.seller?.name || "Store";
        const pricingType = offer.isLooseWeight ? "Weighed at Scale" : `${offer.packsNeeded} pack`;
        lines.push(`${checkMark} ${ing.name} (${req})`);
        lines.push(`    -> ${offer.itemOffered?.name} [${store}]`);
        lines.push(`    -> Rs. ${offer.basketCost?.toFixed(2)} (${pricingType})`);
      } else {
        lines.push(`${checkMark} ${ing.name} (${req}) - (Unpriced / Pantry)`);
      }
    });

    lines.push(`----------------------------------------`);
    lines.push(`BASKET CHECKOUT TOTAL: Rs. ${basketCostSpec?.price?.toFixed(2) || "0.00"}`);
    lines.push(`PRO-RATA RECIPE COST: Rs. ${recipeCostSpec?.price?.toFixed(2) || "0.00"}`);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  // Preset demo
  const handleLoadDemo = () => {
    setActiveTab("url");
    setUrlInput("https://preppykitchen.com/key-lime-pie/");
  };

  const handleToggleStore = (storeId: string) => {
    setSelectedStores((prev) =>
      prev.includes(storeId)
        ? prev.filter((s) => s !== storeId)
        : [...prev, storeId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);

    const steps = [
      activeTab === "url"
        ? "Fetching recipe webpage..."
        : "Parsing recipe text...",
      "Extracting ingredients with AI...",
      "Matching Sri Lankan supermarket products...",
      "Evaluating dual pro-rata and basket costs...",
    ];

    let stepIndex = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setLoadingStep(steps[stepIndex]);
      }
    }, 1800);

    try {
      const payload: Record<string, unknown> = {
        options: {
          strategy,
          servings: targetServings,
          sources: selectedStores.length > 0 ? selectedStores : undefined,
          exclude: excludeInput
            ? excludeInput
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
        },
      };

      if (activeTab === "url") {
        if (!urlInput.trim()) throw new Error("Please enter a recipe URL.");
        payload.url = urlInput.trim();
      } else {
        if (!rawTextInput.trim())
          throw new Error("Please paste recipe text or ingredient lines.");
        payload.rawText = rawTextInput.trim();
      }

      const res = await fetch("/api/recipes/parse-and-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.title || "Failed to price recipe.");
      }

      setResult(data as SchemaOrgRecipe);
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const recipeOffers = result?.offers;
  const priceSpecs = recipeOffers?.priceSpecification || [];
  const recipeCostSpec = priceSpecs.find(
    (s) => s.name?.includes("Recipe Cost") || s.name?.includes("Pro-rata"),
  );
  const basketCostSpec = priceSpecs.find(
    (s) => s.name?.includes("Basket Cost") || s.name?.includes("Checkout"),
  );
  const servingCostSpec = priceSpecs.find((s) =>
    s.name?.includes("Cost Per Serving"),
  );

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans antialiased text-foreground">
      <NavBar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3 pt-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Recipe Supermarket Pricing
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            Import any recipe URL or paste raw ingredients to calculate
            real-time basket costs across Sri Lankan supermarkets (Keells,
            Cargills, SPAR, Glomark, Arpico).
          </p>
        </div>

        {/* Input & Form Card */}
        <Card className="shadow-sm border-border/80">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setActiveTab("url")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                    activeTab === "url"
                      ? "bg-background shadow-xs text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Recipe Web URL
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("text")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                    activeTab === "text"
                      ? "bg-background shadow-xs text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Paste Recipe / Ingredients
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLoadDemo}
                  className="text-xs h-8 border-dashed"
                >
                  <ChefHat className="w-3.5 h-3.5 mr-1 text-primary" />
                  Try Key Lime Pie Demo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOptions(!showOptions)}
                  className={`text-xs h-8 ${showOptions ? "bg-muted" : ""}`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
                  Options
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === "url" ? (
                <div className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="url"
                      placeholder="https://preppykitchen.com/key-lime-pie/ (or any recipe site)"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      disabled={loading}
                      className="flex-1"
                      required
                    />
                    <Button
                      type="submit"
                      disabled={loading || !urlInput.trim()}
                      className="font-semibold shadow-xs"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4 mr-1.5" />
                      )}
                      Price Recipe
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Accepts blogs, JSON-LD recipe pages, or cooking sites.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    placeholder={`Paste recipe ingredients (one per line or complete instructions):\n1 1/2 cups graham cracker crumbs\n6 to 8 tablespoons unsalted butter\n1/4 cup granulated sugar\n2 cans sweetened condensed milk\n3/4 cup lime juice\n4 egg yolks\n1 cup heavy cream`}
                    value={rawTextInput}
                    onChange={(e) => setRawTextInput(e.target.value)}
                    disabled={loading}
                    rows={6}
                    className="font-mono text-xs sm:text-sm"
                    required
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={loading || !rawTextInput.trim()}
                      className="font-semibold shadow-xs"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4 mr-1.5" />
                      )}
                      Price Ingredients
                    </Button>
                  </div>
                </div>
              )}

              {/* Collapsible Options Panel */}
              {showOptions && (
                <div className="p-4 rounded-lg bg-muted/40 border border-border/70 space-y-4 text-xs sm:text-sm animate-in fade-in-50">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Strategy */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="pricing-strategy"
                        className="font-semibold text-xs text-muted-foreground uppercase tracking-wider"
                      >
                        Pricing Strategy
                      </label>
                      <select
                        id="pricing-strategy"
                        value={strategy}
                        onChange={(e) =>
                          setStrategy(e.target.value as PricingStrategy)
                        }
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="cheapest">
                          Lowest Checkout Outlay (Minimum Cart Total)
                        </option>
                        <option value="cheapest_per_unit">
                          Best Unit Value (Optimized Pro-Rata)
                        </option>
                        <option value="cheapest_single_store">
                          Single Store (Lowest Total Trip)
                        </option>
                        <option value="expensive">
                          Premium / Highest Shelf
                        </option>
                      </select>
                    </div>

                    {/* Servings */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="scale-servings"
                        className="font-semibold text-xs text-muted-foreground uppercase tracking-wider"
                      >
                        Scale Servings
                      </label>
                      <Input
                        id="scale-servings"
                        type="number"
                        min={1}
                        max={100}
                        placeholder="Leave blank for recipe default"
                        value={targetServings || ""}
                        onChange={(e) =>
                          setTargetServings(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        className="h-9 text-xs sm:text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Scales quantities linearly if specified.
                      </p>
                    </div>

                    {/* Exclude Staples */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="exclude-staples"
                        className="font-semibold text-xs text-muted-foreground uppercase tracking-wider"
                      >
                        Exclude Pantry Staples
                      </label>
                      <Input
                        id="exclude-staples"
                        type="text"
                        placeholder="e.g. water, salt, black pepper"
                        value={excludeInput}
                        onChange={(e) => setExcludeInput(e.target.value)}
                        className="h-9 text-xs sm:text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Comma-separated ingredients assumed already at home
                        (cost Rs. 0).
                      </p>
                    </div>
                  </div>

                  {/* Supermarkets Filter */}
                  <div className="space-y-1.5 pt-1">
                    <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block">
                      Supermarket Sources (Leave all unchecked to search all)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {SUPERMARKET_OPTIONS.map((st) => {
                        const isChecked = selectedStores.includes(st.id);
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => handleToggleStore(st.id)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                              isChecked
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "bg-background text-muted-foreground border-input hover:border-foreground/40"
                            }`}
                          >
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs sm:text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unable to price recipe</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-7 h-7 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-semibold">{loadingStep}</p>
                  <p className="text-xs text-muted-foreground">
                    Grounded with live pricing across Sri Lankan supermarkets
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            {/* Header / Hero Overview */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-card rounded-xl border border-border shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Yield: {result.recipeYield || "Standard"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs capitalize">
                    Strategy: {strategy.replace(/_/g, " ")}
                  </Badge>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {result.name}
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" />
                  Priced against Sri Lankan Supermarket Inventory
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyJson}
                  className="text-xs h-8"
                >
                  {copiedJson ? (
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 mr-1" />
                  )}
                  {copiedJson ? "Copied JSON-LD" : "Copy JSON-LD"}
                </Button>
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-border/80 bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Total Recipe Cost
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    Rs. {recipeCostSpec?.price?.toFixed(2) || "0.00"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Pro-rata cost of exact portions required for this recipe.
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Cashier Basket Cost
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    Rs. {basketCostSpec?.price?.toFixed(2) || "0.00"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Full packaging units to purchase at checkout counter.
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Cost Per Serving
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    Rs. {servingCostSpec?.price?.toFixed(2) || "0.00"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Per-plate preparation cost based on {result.recipeYield}{" "}
                  servings.
                </CardContent>
              </Card>
            </div>

            {/* Store Breakdown Badges */}
            {result.storeBreakdown &&
              Object.keys(result.storeBreakdown).length > 0 && (
                <Card className="border-border/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Store className="w-4 h-4 text-primary" />
                      Supermarket Fulfillment Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Subtotals and product availability per retail supermarket.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {Object.entries(result.storeBreakdown).map(
                        ([slug, store]) => (
                          <div
                            key={slug}
                            className="p-3 rounded-lg bg-muted/30 border border-border/70 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm">
                                {store.storeName}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {store.itemCount} items
                              </Badge>
                            </div>
                            <div className="text-xs space-y-0.5 text-muted-foreground">
                              <div className="flex justify-between">
                                <span>Pro-rata:</span>
                                <span className="font-medium text-foreground">
                                  Rs. {store.recipeSubtotal?.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Basket:</span>
                                <span className="font-medium text-foreground">
                                  Rs. {store.basketSubtotal?.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Instagrammable Digital Grocery Receipt Card */}
            <Card className="border-border shadow-md overflow-hidden bg-gradient-to-b from-card to-muted/20">
              {/* Receipt Header Banner */}
              <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] tracking-wider uppercase bg-background font-mono">
                      Official Grocery Receipt
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {Object.values(checkedItems).filter(Boolean).length} / {result.recipeIngredient?.length || 0} gathered
                    </Badge>
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl text-foreground flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    Shopping List · {result.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tap any item to cross off while shopping in aisle. Optimized for mobile screenshots.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyReceiptText}
                    className="text-xs h-8 shadow-2xs font-medium"
                  >
                    {copiedReceipt ? (
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5 mr-1.5 text-primary" />
                    )}
                    {copiedReceipt ? "Copied List!" : "Share / Copy List"}
                  </Button>
                </div>
              </div>

              {/* Receipt Items List */}
              <CardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {result.recipeIngredient?.map((ing: HowToSupply, idx) => {
                    const offer = ing.offers?.[0];
                    const isPriced = ing.status === "priced" && !!offer;
                    const isExcluded = ing.status === "excluded";
                    const itemKey = `${ing.name}-${idx}`;
                    const isChecked = checkedItems[itemKey] === true;

                    return (
                      <div
                        key={itemKey}
                        onClick={() => toggleItemCheck(itemKey)}
                        className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors select-none ${
                          isChecked ? "bg-muted/40 opacity-55" : "hover:bg-muted/20"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Interactive Checkbox */}
                          <button
                            type="button"
                            aria-label={`Mark ${ing.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemCheck(itemKey);
                            }}
                            className="shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-hidden"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-5 h-5 text-primary" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          {/* Product Thumbnail Image */}
                          <ItemThumbnail
                            src={offer?.itemOffered?.image}
                            fallbackSrc={ing.image}
                            alt={offer?.itemOffered?.name || ing.name}
                          />

                          {/* Item Details */}
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {ing.identifier ? (
                                <Link
                                  href={`/ingredient/${ing.identifier}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`font-semibold text-sm hover:text-primary transition-colors ${
                                    isChecked ? "line-through" : ""
                                  }`}
                                >
                                  {ing.name}
                                </Link>
                              ) : (
                                <span
                                  className={`font-semibold text-sm ${
                                    isChecked ? "line-through" : ""
                                  }`}
                                >
                                  {ing.name}
                                </span>
                              )}

                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 font-mono font-normal"
                              >
                                {ing.requiredQuantity?.value ?? 1}{" "}
                                {ing.requiredQuantity?.unitText ?? "unit"}
                              </Badge>

                              {ing.fulfillment?.strategy === "derivative" && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 h-4 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-300"
                                >
                                  Derived
                                </Badge>
                              )}

                              {isExcluded && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground"
                                >
                                  Pantry Staple
                                </Badge>
                              )}
                            </div>

                            {/* Matched Supermarket Item Name & Packaging Badge */}
                            {isPriced && offer ? (
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-medium px-1.5 py-0 h-4"
                                >
                                  {offer.seller?.name || "Store"}
                                </Badge>
                                <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px] sm:max-w-[320px]">
                                  {offer.itemOffered?.name}
                                </span>
                                {offer.isLooseWeight ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 flex items-center gap-1 font-medium"
                                  >
                                    <Scale className="w-2.5 h-2.5" /> Scale Produce
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-4 bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 flex items-center gap-1 font-medium"
                                  >
                                    <Package className="w-2.5 h-2.5" /> {offer.packsNeeded}{" "}
                                    {offer.packsNeeded === 1 ? "pack" : "packs"}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                {isExcluded
                                  ? "Assumed at home (Rs. 0.00)"
                                  : "No supermarket match available"}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Price Column */}
                        <div className="text-right shrink-0">
                          {isPriced && offer ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-sm sm:text-base text-foreground">
                                Rs. {offer.basketCost?.toFixed(2)}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Portion: Rs. {offer.recipeCost?.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs font-mono text-muted-foreground">
                              Rs. 0.00
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Perforated Receipt Bottom Summary */}
                <div className="p-4 sm:p-5 bg-muted/30 border-t-2 border-dashed border-border/80 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>CASHIER BASKET TOTAL</span>
                    <span className="text-base sm:text-xl font-black text-foreground font-sans">
                      Rs. {basketCostSpec?.price?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>EXACT RECIPE PORTIONS</span>
                    <span className="font-medium text-foreground">
                      Rs. {recipeCostSpec?.price?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>COST PER SERVING ({result.recipeYield || 1} plates)</span>
                    <span className="font-semibold text-primary font-sans">
                      Rs. {servingCostSpec?.price?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border/40 text-center">
                    <p className="text-[10px] text-muted-foreground/80 font-mono tracking-widest uppercase">
                      *** FOODREPO AUTHENTIC SUPERMARKET INVENTORY PASS ***
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
