"use client";

import { useState } from "react";
import Navbar from "@/components/NavBar";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

export default function ContributePage() {
    const [name, setName] = useState("");
    const [aliases, setAliases] = useState("");
    const [provenance, setProvenance] = useState("");
    const [country, setCountry] = useState("");
    const [cuisine, setCuisine] = useState("");
    const [region, setRegion] = useState("");
    const [flavor, setFlavor] = useState("");
    const [comment, setComment] = useState("");
    const [pronunciation, setPronunciation] = useState("");
    const [photo, setPhoto] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch("/api/ingredients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    aliases: aliases.split(",").map((s) => s.trim()).filter(Boolean),
                    provenance,
                    country: country.split(",").map((s) => s.trim()).filter(Boolean),
                    cuisine: cuisine.split(",").map((s) => s.trim()).filter(Boolean),
                    region: region.split(",").map((s) => s.trim()).filter(Boolean),
                    flavor_profile: flavor.split(",").map((s) => s.trim()).filter(Boolean),
                    comment,
                    pronunciation,
                    photo,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to add ingredient");
            }

            setMessage("Ingredient added successfully!");
            setName("");
            setAliases("");
            setProvenance("");
            setCountry("");
            setCuisine("");
            setRegion("");
            setFlavor("");
            setComment("");
            setPronunciation("");
            setPhoto("");
        } catch (err: any) {
            setMessage(err.message || "Error submitting ingredient");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <Navbar />
            <main className={styles.main}>
                <h1 className={styles.title}>Contribute an Ingredient</h1>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Aliases (comma-separated)"
                        value={aliases}
                        onChange={(e) => setAliases(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Provenance"
                        value={provenance}
                        onChange={(e) => setProvenance(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Country (comma-separated)"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Cuisine (comma-separated)"
                        value={cuisine}
                        onChange={(e) => setCuisine(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Region (comma-separated)"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Flavor profile (comma-separated)"
                        value={flavor}
                        onChange={(e) => setFlavor(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Pronunciation"
                        value={pronunciation}
                        onChange={(e) => setPronunciation(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Photo URL"
                        value={photo}
                        onChange={(e) => setPhoto(e.target.value)}
                    />
                    <textarea
                        placeholder="Comment / description"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />

                    <button type="submit" disabled={loading}>
                        {loading ? "Submitting..." : "Submit"}
                    </button>
                </form>
                {message && <p className={styles.message}>{message}</p>}
            </main>
            <Footer />
        </div>
    );
}
