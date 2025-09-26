"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IIngredientData } from "@/models/Ingredient";
import Navbar from "@/components/NavBar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import styles from "./page.module.css";

export default function SearchPage() {
    const router = useRouter();
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

    const fetchData = async (pageNumber: number = 1) => {
        if (!query.trim()) return;

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
                return;
            }

            setResults(data.results);
            setPage(data.page);
            setTotalPages(data.totalPages);
            if (data.results.length === 0) setError("No results found");
        } catch (err) {
            setResults([]);
            setError("Failed to fetch ingredients");
        } finally {
            setLoading(false);
        }
    };

    // Fetch data whenever query changes
    useEffect(() => {
        if (query) fetchData(1);
    }, [query]);

    return (
        <div className={styles.page}>
            <Navbar />

            <main className={styles.main}>
                <h1 className={styles.title}>Search results for "{query}"</h1>
                <div className={styles.searchBarContainer}>
                    <SearchBar />
                </div>

                {loading && <p className={styles.loading}>Loading...</p>}
                {!loading && error && <p className={styles.error}>{error}</p>}

                <ul className={styles.resultsList}>
                    {results.map((ing) => (
                        <li key={ing.name} className={styles.card}>
                            <h2 className={styles.ingName}>{ing.name}</h2>
                            <p>
                                <strong>Provenance:</strong> {ing.provenance || "Unknown"}
                            </p>
                            {ing.flavor_profile && (
                                <p>
                                    <strong>Flavor:</strong> {ing.flavor_profile.join(", ")}
                                </p>
                            )}
                            {ing.comment && (
                                <p dangerouslySetInnerHTML={{ __html: ing.comment }}></p>
                            )}
                        </li>
                    ))}
                </ul>

                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <button onClick={() => fetchData(page - 1)} disabled={page <= 1}>
                            Previous
                        </button>
                        <span>
              Page {page} of {totalPages}
            </span>
                        <button
                            onClick={() => fetchData(page + 1)}
                            disabled={page >= totalPages}
                        >
                            Next
                        </button>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
