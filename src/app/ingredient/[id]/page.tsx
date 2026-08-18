"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Globe,
  Image as ImageIcon,
  Info,
  Leaf,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Utensils,
  Wand2,
} from "lucide-react";
import RetailProductsPricing from "@/components/RetailProductsPricing";
import NutritionFacts from "@/components/NutritionFacts";

export default function IngredientPage() {
  const { id } = useParams();
  const router = useRouter();

  // Core Ingredient State
  const [ingredient, setIngredient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);

  // Pricing & Product State (Passed to Child Component)
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

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

  const fetchPrices = async () => {
    setLoadingProducts(true);
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
    fetchPrices();
  }, [id]);

  // --- Action: Fetch/Refresh Image ---
  const handleImageAction = async () => {
    setIsFetchingImage(true);
    try {
      const res = await fetch(`/api/ingredients/enhance/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch image");
      }

      await fetchIngredient();
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsFetchingImage(false);
    }
  };

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
      await fetchIngredient();
      alert("Ingredient successfully enhanced!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Enhancement failed");
    } finally {
      setIsEnhancing(false);
    }
  };

  const formatAliases = (aliases: any[]) => {
    if (!aliases || aliases.length === 0) return null;
    const cleaned = aliases
      .map((a) => {
        if (!a) return "";
        if (typeof a === "string") {
          if (a === "[object Object]" || a.includes("[object Object]")) return "";
          return a.trim();
        }
        if (typeof a === "object") {
          const val = a.name || a.alias || a.value || a.text || a.label || a.title;
          return typeof val === "string" && val !== "[object Object]" ? val.trim() : "";
        }
        return String(a);
      })
      .filter((a) => Boolean(a) && a !== "[object Object]");

    if (cleaned.length === 0) return null;
    return cleaned.join(", ");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
      <NavBar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-8 pt-0 flex flex-col gap-8">
        {/* Back Button & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="-ml-4 text-muted-foreground hover:text-foreground self-start"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to results
          </Button>

          {!loading && ingredient && (
            <Button
              onClick={handleEnhance}
              disabled={isEnhancing}
              className="bg-primary hover:bg-primary/90 shadow-sm"
            >
              {isEnhancing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              {isEnhancing ? "Enhancing..." : "Enhance with AI"}
            </Button>
          )}
        </div>

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

        {!loading && (error || !ingredient) && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <Info className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-2xl font-bold">Ingredient not found</h2>
            <p className="text-muted-foreground">
              We couldn't find the ingredient you were looking for.
            </p>
            <Button onClick={() => router.push("/")}>Return Home</Button>
          </div>
        )}

        {!loading && ingredient && (() => {
          const rawDiet: string[] = ingredient.dietaryFlags || ingredient.dietary_flags || [];
          const rawFlavor: string[] = ingredient.flavorProfile || ingredient.flavor_profile || [];
          const country: string[] = ingredient.country || [];
          const region: string[] = ingredient.region || [];
          const cuisine: string[] = ingredient.cuisine || ingredient.cuisines || [];
          const substitutes: string[] = ingredient.substitutes || [];
          const pairsWith: string[] = ingredient.pairsWith || ingredient.pairs_with || [];
          const varieties: string[] = ingredient.varieties || [];
          const derivatives: string[] = ingredient.derivatives || [];
          const usedIn: string[] = ingredient.usedIn || ingredient.used_in || [];
          const partOf: string[] = Array.isArray(ingredient.partOf)
            ? ingredient.partOf
            : Array.isArray(ingredient.part_of)
            ? ingredient.part_of
            : typeof ingredient.partOf === "string"
            ? [ingredient.partOf]
            : [];
          const provenance: string | null = ingredient.provenance && ingredient.provenance !== "MISSING" ? ingredient.provenance : null;

          const formatLabel = (str: string) => {
            if (!str) return "";
            return str
              .replace(/_/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase());
          };

          // Case-insensitive deduplication
          const dietaryFlags = Array.from(new Set(rawDiet.map((d) => d.trim().toLowerCase()))).map(formatLabel);
          const flavorProfile = Array.from(new Set(rawFlavor.map((f) => f.trim().toLowerCase()))).map(formatLabel);
          const cleanVarieties = Array.from(new Set(varieties.map((v) => v.trim()))).filter((v) => v.toLowerCase() !== ingredient.name.toLowerCase());

          return (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 flex flex-col gap-12">
              <div className="flex flex-col gap-8">
                {/* Header */}
                <div className="space-y-3 border-b pb-6">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground capitalize">
                      {ingredient.name}
                    </h1>
                    {ingredient.pronunciation && (
                      <span className="text-xl text-muted-foreground italic">
                        /{ingredient.pronunciation}/
                      </span>
                    )}
                    {provenance && (
                      <Badge variant="secondary" className="text-xs px-2.5 py-1 font-medium bg-muted text-muted-foreground">
                        {provenance}
                      </Badge>
                    )}
                  </div>
                  {ingredient.aliases && ingredient.aliases.length > 0 && (
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-3xl">
                      <span className="font-semibold text-foreground">
                        Also known as:{" "}
                      </span>
                      {formatAliases(ingredient.aliases)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                  {/* Left Column: Image Management */}
                  <div className="lg:col-span-1 space-y-3">
                    {ingredient.image?.url ? (
                      <div className="relative group">
                        <div className="rounded-2xl overflow-hidden border bg-muted shadow-sm ring-1 ring-border/50">
                          <img
                            src={ingredient.image.url}
                            alt={ingredient.name}
                            className="w-full h-auto object-cover aspect-square lg:aspect-[4/3]"
                          />
                        </div>
                        {/* Refresh Overlay Button */}
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={handleImageAction}
                          disabled={isFetchingImage}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
                        >
                          {isFetchingImage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center aspect-square lg:aspect-[4/3] bg-muted/30 gap-4 p-6 text-center">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">
                            No image available
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            Fetch a context-aware image from Wikidata.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleImageAction}
                          disabled={isFetchingImage}
                          className="mt-2"
                        >
                          {isFetchingImage ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="mr-2 h-4 w-4" />
                          )}
                          Fetch Image
                        </Button>
                      </div>
                    )}
                    {ingredient.image?.author && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
                        <ImageIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span
                          className="[&>a]:text-primary [&>a]:hover:underline"
                          dangerouslySetInnerHTML={{
                            __html: `Photo by ${ingredient.image.author}`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Column: Details & Cards */}
                  <div className="lg:col-span-2 space-y-8">
                    {ingredient.comment && (
                      <div
                        className="text-base text-foreground/90 leading-relaxed
                                              [&>p]:mb-4 last:[&>p]:mb-0
                                              [&>a]:text-primary [&>a]:font-medium [&>a]:hover:underline"
                        dangerouslySetInnerHTML={{ __html: ingredient.comment }}
                      />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Dietary Info */}
                      {dietaryFlags.length > 0 && (
                        <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-card-foreground p-5 shadow-sm space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                            <Leaf className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Dietary Info
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {dietaryFlags.map((d: string) => (
                              <Badge
                                key={d}
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium border-none shadow-none text-xs px-2.5 py-0.5"
                              >
                                {formatLabel(d)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Flavor Profile */}
                      {flavorProfile.length > 0 && (
                        <div className="rounded-xl border bg-purple-500/5 border-purple-500/20 text-card-foreground p-5 shadow-sm space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-purple-700 dark:text-purple-400 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Flavor Profile
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {flavorProfile.map((f: string) => (
                              <Badge
                                key={f}
                                variant="secondary"
                                className="bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 border-none font-medium text-xs px-2.5 py-0.5"
                              >
                                {formatLabel(f)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Origin & Geography */}
                      {(country.length > 0 || region.length > 0 || provenance) && (
                        <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Globe className="h-4 w-4" /> Origin & Geography
                          </h3>
                          <div className="flex flex-col gap-1.5 text-sm">
                            {country.length > 0 && (
                              <p>
                                <span className="font-medium text-foreground">Country:</span>{" "}
                                {country.join(", ")}
                              </p>
                            )}
                            {region.length > 0 && (
                              <p>
                                <span className="font-medium text-foreground">Region:</span>{" "}
                                {region.join(", ")}
                              </p>
                            )}
                            {provenance && (
                              <p>
                                <span className="font-medium text-foreground">Provenance:</span>{" "}
                                {provenance}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cuisines */}
                      {cuisine.length > 0 && (
                        <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Utensils className="h-4 w-4" /> Cuisines
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {cuisine.map((c: string) => (
                              <Badge
                                key={c}
                                variant="outline"
                                className="bg-background text-xs px-2.5 py-0.5"
                              >
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Substitutes */}
                      {substitutes.length > 0 && (
                        <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Wand2 className="h-4 w-4" /> Substitutes
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {substitutes.map((s: string) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium border-none text-xs px-2.5 py-0.5"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pairs With */}
                      {pairsWith.length > 0 && (
                        <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Utensils className="h-4 w-4" /> Pairs Well With
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {pairsWith.map((pw: string) => (
                              <Badge
                                key={pw}
                                variant="outline"
                                className="bg-primary/5 text-primary border-primary/20 text-xs px-2.5 py-0.5"
                              >
                                {pw}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Known Varieties */}
                      {cleanVarieties.length > 0 && (
                        <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-3 sm:col-span-2">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Info className="h-4 w-4" /> Known Varieties ({cleanVarieties.length})
                          </h3>
                          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                            {cleanVarieties.map((v: string) => (
                              <Badge key={v} variant="secondary" className="text-xs px-2.5 py-0.5 capitalize">
                                {v}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Derivatives */}
                      {derivatives.length > 0 && (
                        <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Info className="h-4 w-4" /> Derivatives & Forms
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {derivatives.map((d: string) => (
                              <Badge key={d} variant="outline" className="text-xs px-2.5 py-0.5">
                                {d}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Used In */}
                      {usedIn.length > 0 && (
                        <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Utensils className="h-4 w-4" /> Common Uses
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {usedIn.map((u: string) => (
                              <Badge key={u} variant="secondary" className="text-xs px-2.5 py-0.5">
                                {u}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Part Of */}
                      {partOf.length > 0 && (
                        <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Info className="h-4 w-4" /> Category / Classification
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {partOf.map((p: string) => (
                              <Badge key={p} variant="outline" className="text-xs px-2.5 py-0.5">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <NutritionFacts
                ingredientId={id as string}
                ingredientName={ingredient.name}
                nutrition={ingredient.nutrition || null}
                onLinkSuccess={(fdcId, nutritionData) => {
                  setIngredient((prev: any) => ({
                    ...prev,
                    fdcId,
                    nutrition: nutritionData,
                  }));
                }}
              />

              <Separator className="bg-border/50" />

              <RetailProductsPricing
                ingredientId={id as string}
                ingredientName={ingredient.name}
                products={products}
                loadingProducts={loadingProducts}
                onRefreshProducts={fetchPrices}
              />
            </div>
          );
        })()}
      </main>
      <Footer />
    </div>
  );
}
