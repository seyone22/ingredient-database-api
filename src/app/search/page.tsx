"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { IIngredientData } from "@/models/Ingredient";
import Navbar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import SearchBar from "@/components/searchbar/SearchBar";
import IngredientCard from "@/components/ingredientcard/IngredientCard";
import Pagination from "@/components/pagination/Pagination"; // Import the new component
import styles from "./page.module.css";


export default function SearchPage() {
    const [query, setQuery] = useState<string>("");
    const [results, setResults] = useState<IIngredientData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Extract query from URL manually
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get("query") || "";
        setQuery(q);
    }, []);

    const fetchData = useCallback(async (pageNumber: number = 1) => {

        if (!query.trim()) return;

        console.log("Hi" + pageNumber)

        setLoading(true);
        setError(null);

        try {
            const url = new URL("/api/ingredients", window.location.origin);
            url.searchParams.set("query", query);
            url.searchParams.set("page", pageNumber.toString());
            url.searchParams.set("limit", "20");

            const res = await fetch(url.toString());
            const data = await res.json();

            if (!res.ok || !data.results) {
                setResults([]);
                setError(data.error || "No results found");
                setTotalPages(1);
                setPage(1); // Reset page on error
                return;
            }

            setResults(data.results);
            setPage(data.page);
            setTotalPages(data.totalPages);

            if (data.results.length === 0 && data.page === 1) {
                setError("No results found");
            } else if (data.results.length === 0 && data.page > 1) {
                // If we navigate to an empty page, it means there are no more results
                // You could reset to the last valid page or simply show a message.
                // For now, let's keep showing the empty results and an error message.
                setError("No more results on this page.");
            }

        } catch (err) {
            setResults([]);
            setError("Failed to fetch ingredients");
            setTotalPages(1);
            setPage(1); // Reset page on error
        } finally {
            setLoading(false);
        }
    }, [query]); // Added totalPages to dependencies

    // Fetch data whenever query changes
    useEffect(() => {
        if (query) fetchData(1);
    }, [query, fetchData]); // fetchData is stable due to useCallback

    const handlePageChange = useCallback((newPage: number) => {
        fetchData(newPage);
    }, [fetchData]);


    return (
        <div className={styles.page}>
            <Navbar/>

            <main className={styles.main}>
                <h1 className={styles.title}>Search results for "{query}"</h1>
                <div className={styles.searchBarContainer}>
                    <SearchBar/>
                </div>

                {loading && <p className={styles.loading}>Loading...</p>}
                {!loading && error && <p className={styles.error}>{error}</p>}

                <ul className={styles.resultsList}>
                    {results.map((ing) => (
                        <IngredientCard key={ing.name} ingredient={ing}/>
                    ))}
                </ul>

                {/* Render the Pagination component */}
                {totalPages > 1 && (
                    <Pagination
                        currentPage={page}
                        totalPageCount={totalPages}
                        onPageChange={handlePageChange}
                        disabled={loading} // Disable all pagination buttons when loading
                        siblingCount={1}
                    />
                )}
            </main>

            <Footer/>
        </div>
    );
}