"use client";

import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import IngredientCard from "@/components/ingredientcard/IngredientCard";
import Pagination from "@/components/pagination/Pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Ingredient } from "@/types/types";

interface SearchErrorState {
  message: string;
  type: "not_found" | "waking_up" | "server_error";
  isRetryable: boolean;
}

export default function IngredientSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL if someone shares a link
  const initialQuery = searchParams.get("query") || "";
  const [inputValue, setInputValue] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);

  const [results, setResults] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SearchErrorState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(
    async (searchQuery: string, pageNumber: number = 1) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setResults([]);
        setError(null);
        setCountdown(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const url = new URL("/api/ingredients", window.location.origin);
        url.searchParams.set("query", trimmed);
        url.searchParams.set("page", pageNumber.toString());
        url.searchParams.set("limit", "20");

        const res = await fetch(url.toString());
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.results) {
          setResults([]);
          setTotalPages(1);
          setPage(1);

          const isWakingUp =
            res.status === 503 ||
            Boolean(data?.isWakingUp) ||
            data?.code === "BACKEND_UNAVAILABLE" ||
            data?.code === "BACKEND_TIMEOUT";

          if (isWakingUp) {
            setError({
              type: "waking_up",
              message:
                data?.error ||
                "FoodRepo database is currently warming up. Connection in progress...",
              isRetryable: true,
            });
            return;
          }

          if (res.status === 404) {
            setError({
              type: "not_found",
              message: `No ingredients found matching "${trimmed}".`,
              isRetryable: false,
            });
            return;
          }

          setError({
            type: "server_error",
            message:
              data?.error || "Failed to load ingredients. Please try again.",
            isRetryable: true,
          });
          return;
        }

        setResults(data.results);
        setPage(data.page || 1);
        setTotalPages(data.totalPages || 1);

        if (data.results.length === 0) {
          setError({
            type: "not_found",
            message:
              data.page === 1
                ? `No ingredients found matching "${trimmed}".`
                : "No more results on this page.",
            isRetryable: false,
          });
        } else {
          setError(null);
        }
      } catch {
        setResults([]);
        setTotalPages(1);
        setPage(1);
        setError({
          type: "server_error",
          message:
            "Unable to connect to FoodRepo. Please check your network connection.",
          isRetryable: true,
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Auto-retry timer when backend is waking up
  useEffect(() => {
    if (error?.type !== "waking_up" || !activeQuery) {
      setCountdown(null);
      return;
    }

    setCountdown(4);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          fetchData(activeQuery, page);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [error?.type, activeQuery, page, fetchData]);

  // Fetch data whenever the active query changes
  useEffect(() => {
    if (activeQuery) {
      fetchData(activeQuery, 1);
    } else {
      setResults([]);
      setError(null);
    }
  }, [activeQuery, fetchData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setCountdown(null);
    setActiveQuery(trimmed);

    // Update the URL without reloading the page, preserving shareable links
    router.replace(`/?query=${encodeURIComponent(trimmed)}`, { scroll: false });
  };

  const handleRetry = useCallback(() => {
    setCountdown(null);
    if (activeQuery) {
      fetchData(activeQuery, page);
    }
  }, [activeQuery, page, fetchData]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      fetchData(activeQuery, newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [activeQuery, fetchData],
  );

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 py-12 gap-8">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 transition-transform hover:scale-105 duration-200">
          <Image
            src="/logo.png"
            alt="FoodRepo Logo"
            fill
            priority
            sizes="(max-width: 640px) 112px, 144px"
            className="object-contain drop-shadow-sm"
          />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
          <span className="text-primary">Food</span>Repo
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          FoodRepo aggregates food ingredient data and relationships to help
          people and developers understand what they're cooking with.
        </p>
      </div>

      {/* Search Bar */}
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-2xl items-center space-x-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for ingredients (e.g., Garlic, Olive Oil)..."
            className="pl-10 h-12 text-base shadow-sm"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-12 px-8"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
        </Button>
      </form>

      {/* Error & Wake-up Handling */}
      {error && !loading && (
        <div className="w-full max-w-2xl animate-in fade-in duration-300">
          {error.type === "waking_up" ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-950 dark:text-amber-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm">
                      Database Service is Warming Up
                    </h4>
                    <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                      FoodRepo's backend is starting up and connecting.
                      {countdown !== null && countdown > 0
                        ? ` Retrying automatically in ${countdown}s...`
                        : " Ready to retry."}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  disabled={loading}
                  className="border-amber-500/40 bg-background/80 hover:bg-amber-500/20 text-xs shrink-0 self-end sm:self-center"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Retry Now
                </Button>
              </div>
            </div>
          ) : error.type === "not_found" ? (
            <div className="rounded-xl border bg-muted/30 p-8 text-center space-y-2">
              <Search className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <p className="font-medium text-foreground">{error.message}</p>
              <p className="text-xs text-muted-foreground">
                Try searching by common culinary name, genus, or an alternate
                spelling.
              </p>
            </div>
          ) : (
            <Alert
              variant="destructive"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <AlertDescription className="text-sm">
                  {error.message}
                </AlertDescription>
              </div>
              {error.isRetryable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  disabled={loading}
                  className="h-8 text-xs shrink-0 self-end sm:self-center bg-background/50 hover:bg-background"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Try Again
                </Button>
              )}
            </Alert>
          )}
        </div>
      )}

      {/* Results Section */}
      {!loading && results.length > 0 && (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((ing) => (
              <IngredientCard key={ing.id} ingredient={ing} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center pt-8 border-t">
              <Pagination
                currentPage={page}
                totalPageCount={totalPages}
                onPageChange={handlePageChange}
                disabled={loading}
                siblingCount={1}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
