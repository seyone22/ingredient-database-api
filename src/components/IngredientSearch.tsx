"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IIngredientData } from "@/models/Ingredient";
import IngredientCard from "@/components/ingredientcard/IngredientCard";
import Pagination from "@/components/pagination/Pagination";

export default function IngredientSearch() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize state from URL if someone shares a link
    const initialQuery = searchParams.get("query") || "";
    const [inputValue, setInputValue] = useState(initialQuery);
    const [activeQuery, setActiveQuery] = useState(initialQuery);

    const [results, setResults] = useState<IIngredientData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchData = useCallback(async (searchQuery: string, pageNumber: number = 1) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const url = new URL("/api/ingredients/vector", window.location.origin);
            url.searchParams.set("query", searchQuery);
            url.searchParams.set("page", pageNumber.toString());
            url.searchParams.set("limit", "20");

            const res = await fetch(url.toString());
            const data = await res.json();

            if (!res.ok || !data.results) {
                setResults([]);
                setError(data.error || "No results found");
                setTotalPages(1);
                setPage(1);
                return;
            }

            setResults(data.results);
            setPage(data.page);
            setTotalPages(data.totalPages);

            if (data.results.length === 0) {
                setError(data.page === 1 ? "No results found" : "No more results on this page.");
            }
        } catch {
            setResults([]);
            setError("Failed to fetch ingredients. Please try again.");
            setTotalPages(1);
            setPage(1);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch data whenever the active query changes
    useEffect(() => {
        if (activeQuery) {
            fetchData(activeQuery, 1);
        } else {
            setResults([]);
        }
    }, [activeQuery, fetchData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (!trimmed) return;

        setActiveQuery(trimmed);

        // Update the URL without reloading the page, preserving shareable links
        router.replace(`/?query=${encodeURIComponent(trimmed)}`, { scroll: false });
    };

    const handlePageChange = useCallback((newPage: number) => {
        fetchData(activeQuery, newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [activeQuery, fetchData]);

    return (
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 py-12 gap-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
                <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
                    <span className="text-primary">Food</span>Repo
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    FoodRepo aggregates food ingredient data and relationships to help
                    people and developers understand what they're cooking with.
                </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSubmit} className="flex w-full max-w-2xl items-center space-x-2">
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
                <Button type="submit" size="lg" className="h-12 px-8" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
                </Button>
            </form>

            {/* Error Handling */}
            {error && !loading && (
                <Alert variant="destructive" className="w-full max-w-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Results Section */}
            {!loading && results.length > 0 && (
                <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {results.map((ing) => (
                            <IngredientCard key={ing.name} ingredient={ing} />
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