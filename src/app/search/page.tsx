"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IIngredientData } from "@/models/Ingredient";

export default function SearchPage() {
    const searchParams = useSearchParams();
    const query = searchParams.get("query") || "";

    const [results, setResults] = useState<IIngredientData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!query) return;
        setLoading(true);
        setError(null);

        fetch(`/api/ingredients?query=${encodeURIComponent(query)}`)
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    // API returned an error, e.g., 404
                    throw new Error(data.error || "Unknown error");
                }
                return data;
            })
            .then((data: IIngredientData) => {
                setResults([data]); // API returns a single ingredient
            })
            .catch((err: any) => {
                setResults([]);
                setError(err.message);
            })
            .finally(() => setLoading(false));
    }, [query]);

    return (
        <div style={{ padding: "2rem" }}>
            <h1>Search results for "{query}"</h1>

            {loading && <p>Loading...</p>}
            {!loading && error && <p style={{ color: "red" }}>Error: {error}</p>}
            {!loading && !error && results.length === 0 && <p>No results found.</p>}

            <ul>
                {results.map((ing) => (
                    <li key={ing.name}>
                        <strong>{ing.name}</strong> — {ing.provenance || "Unknown"}{" "}
                        {ing.flavor_profile && `| Flavor: ${ing.flavor_profile}`}
                    </li>
                ))}
            </ul>
        </div>
    );
}
