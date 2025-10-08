"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SearchBar.module.css";
import Loader from "@/components/loader/Loader";

export default function SearchBar() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (!query.trim()) return;
        router.push(`/search?query=${encodeURIComponent(query.trim())}`);
        setLoading(false);
    };

    return (
        <form className={styles.search} onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Search ingredients..."
                aria-label="Search ingredients"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit">{!loading ? "Search" : (<Loader color={'white'} size={24} />)}</button>
        </form>
    );
}
