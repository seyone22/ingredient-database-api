"use client";

import {
  AlertCircle,
  Check,
  ChefHat,
  ClipboardList,
  Copy,
  DollarSign,
  ExternalLink,
  Link as LinkIcon,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useState } from "react";
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
  { id: "spar", label: "SPAR", color: "bg-green-700" },
  { id: "glomark", label: "Glomark", color: "bg-amber-600" },
  { id: "arpico", label: "Arpico", color: "bg-blue-600" },
];

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            Standard Schema.org / JSON-LD Pricing Engine
          </div>
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
                          Cheapest (Best Mix Across Stores)
                        </option>
                        <option value="cheapest_per_unit">
                          Cheapest Per Unit (Optimized Pro-Rata)
                        </option>
                        <option value="cheapest_total_pack">
                          Cheapest Total Pack (Min Immediate Spend)
                        </option>
                        <option value="single_store_cheapest">
                          Single Store (Lowest Total Trip)
                        </option>
                        <option value="organic_premium">
                          Organic / Premium Preferred
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

            {/* Ingredient Breakdown List */}
            <Card className="border-border/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                      Ingredients & Supermarket Matches
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Matched with real supermarket items. Click ingredient
                      links to inspect canonical database records.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {result.recipeIngredient?.length || 0} Ingredients
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {result.recipeIngredient?.map((ing: HowToSupply, idx) => {
                    const offer = ing.offers?.[0];
                    const isPriced = ing.status === "priced" && !!offer;
                    const isExcluded = ing.status === "excluded";

                    return (
                      <div
                        key={`${ing.name || "ingredient"}-${idx}`}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                      >
                        {/* Ingredient Info */}
                        <div className="space-y-1 min-w-[240px]">
                          <div className="flex items-center gap-2">
                            {ing.identifier ? (
                              <Link
                                href={`/ingredient/${ing.identifier}`}
                                className="font-semibold text-sm sm:text-base hover:text-primary transition-colors flex items-center gap-1 group"
                              >
                                <span>{ing.name}</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                              </Link>
                            ) : (
                              <span className="font-semibold text-sm sm:text-base">
                                {ing.name}
                              </span>
                            )}

                            {isPriced && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-300"
                              >
                                Priced
                              </Badge>
                            )}
                            {isExcluded && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-muted text-muted-foreground"
                              >
                                Excluded
                              </Badge>
                            )}
                            {!isPriced && !isExcluded && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-300"
                              >
                                Unpriced
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>
                              Quantity:{" "}
                              <strong>
                                {ing.requiredQuantity?.value ?? 1}{" "}
                                {ing.requiredQuantity?.unitText ?? "unit"}
                              </strong>
                            </span>
                            {ing.note && <span>• {ing.note}</span>}
                          </div>
                        </div>

                        {/* Matched Product & Price */}
                        {isPriced && offer ? (
                          <div className="flex flex-col sm:items-end text-left sm:text-right space-y-1">
                            <div className="flex items-center gap-1.5 sm:justify-end">
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-medium"
                              >
                                {offer.seller?.name || "Supermarket"}
                              </Badge>
                              <span className="text-xs sm:text-sm font-medium line-clamp-1 max-w-[280px]">
                                {offer.itemOffered?.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground">
                                Shelf: Rs. {offer.price}
                              </span>
                              <span className="text-muted-foreground font-mono">
                                •
                              </span>
                              <span className="font-semibold text-foreground">
                                Pro-rata: Rs. {offer.recipeCost?.toFixed(2)}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] font-normal"
                              >
                                {offer.packsNeeded}{" "}
                                {offer.packsNeeded === 1 ? "pack" : "packs"}{" "}
                                (Rs. {offer.basketCost})
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground italic sm:text-right">
                            {isExcluded
                              ? "Excluded from pricing options"
                              : "No supermarket match found"}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
