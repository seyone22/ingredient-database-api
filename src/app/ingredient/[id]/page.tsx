// app/ingredient/[id]/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import styles from "@/app/page.module.css";
import { Box, Typography, CircularProgress, Paper, Grid } from "@mui/material";
import {IIngredientData} from "@/models/Ingredient";

export default function IngredientPage() {
    const { id } = useParams();
    const [ingredient, setIngredient] = useState<IIngredientData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchIngredient = async () => {
            try {
                const res = await fetch(`/api/ingredients/${id}`);
                if (!res.ok) throw new Error("Failed to fetch ingredient");
                const data: any = await res.json();
                setIngredient(data.ingredient);
            } catch (err) {
                console.error(err);
                setIngredient(null);
            } finally {
                setLoading(false);
            }
        };

        fetchIngredient();
    }, [id]);

    if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 10 }} />;

    if (!ingredient) return <Typography variant="h6" sx={{ mt: 10, textAlign: "center" }}>Ingredient not found</Typography>;

    return (
        <div className={styles.page}>
            <NavBar />
            <main className={styles.main}>
                <Paper sx={{ p: 3, width: "100%", maxWidth: 800, mx: "auto" }}>
                    <Typography variant="h4" gutterBottom>{ingredient.name}</Typography>
                    {ingredient.aliases && ingredient.aliases.length > 0 && (
                        <Typography variant="subtitle1">Aliases: {ingredient.aliases.join(", ")}</Typography>
                    )}

                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        {ingredient.country && ingredient.country.length > 0 && (
                            <Grid>
                                <Typography variant="body1"><strong>Country:</strong> {ingredient.country.join(", ")}</Typography>
                            </Grid>
                        )}
                        {ingredient.cuisine && ingredient.cuisine.length > 0 && (
                            <Grid>
                                <Typography variant="body1"><strong>Cuisine:</strong> {ingredient.cuisine.join(", ")}</Typography>
                            </Grid>
                        )}
                        {ingredient.region && ingredient.region.length > 0 && (
                            <Grid>
                                <Typography variant="body1"><strong>Region:</strong> {ingredient.region.join(", ")}</Typography>
                            </Grid>
                        )}
                        {ingredient.flavor_profile && ingredient.flavor_profile.length > 0 && (
                            <Grid>
                                <Typography variant="body1"><strong>Flavor Profile:</strong> {ingredient.flavor_profile.join(", ")}</Typography>
                            </Grid>
                        )}
                        {ingredient.dietary_flags && ingredient.dietary_flags.length > 0 && (
                            <Grid>
                                <Typography variant="body1"><strong>Dietary Flags:</strong> {ingredient.dietary_flags.join(", ")}</Typography>
                            </Grid>
                        )}
                    </Grid>
                </Paper>
            </main>
            <Footer />
        </div>
    );
}
