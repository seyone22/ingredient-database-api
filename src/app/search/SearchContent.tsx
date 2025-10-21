"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { IIngredientData } from "@/models/Ingredient";
import SearchBar from "@/components/searchbar/SearchBar";
import IngredientCard from "@/components/ingredientcard/IngredientCard";
import Pagination from "@/components/pagination/Pagination";
import Loader from "@/components/loader/Loader";
import styles from "./page.module.css";

export default function SearchContent() {
    const searchParams = useSearchParams();
    const [query, setQuery] = useState("");

    const [results, setResults] = useState<IIngredientData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Extract query from URL
    useEffect(() => {
        const q = searchParams.get("query") || "";
        setQuery(q);
    }, [searchParams]);

    const fetchData = useCallback(
        async (pageNumber: number = 1) => {
            if (!query.trim()) return;

            setLoading(true);
            setError(null);

            try {
                const url = new URL("/api/ingredients/vector", window.location.origin);
                url.searchParams.set("query", query);
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
                    setError(
                        data.page === 1 ? "No results found" : "No more results on this page."
                    );
                }
            } catch {
                setResults([]);
                setError("Failed to fetch ingredients");
                setTotalPages(1);
                setPage(1);
            } finally {
                setLoading(false);
            }
        },
        [query]
    );

    // Fetch data whenever query changes
    useEffect(() => {
        if (query) fetchData(1);
    }, [query, fetchData]);

    const handlePageChange = useCallback(
        (newPage: number) => {
            fetchData(newPage);
        },
        [fetchData]
    );

    return (
        <>
            <h1 className={styles.title}>Search results for "{query}"</h1>
            <div className={styles.searchBarContainer}>
                <SearchBar />
            </div>

            {loading && <Loader />}
            {!loading && error && <p className={styles.error}>{error}</p>}

            {!loading && results.length > 0 && (
                <>
                    <ul className={styles.resultsList}>
                        {results.map((ing) => (
                            <IngredientCard key={ing.name} ingredient={ing} />
                        ))}
                    </ul>

                    {totalPages > 1 && (
                        <Pagination
                            currentPage={page}
                            totalPageCount={totalPages}
                            onPageChange={handlePageChange}
                            disabled={loading}
                            siblingCount={1}
                        />
                    )}
                </>
            )}
        </>
    );
}
