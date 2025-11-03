"use client";

import { useEffect, useState } from "react";
import { TextField, Button, CircularProgress, Autocomplete, Card, CardContent, Typography, Box } from "@mui/material";

interface IngredientOption {
    _id: string;
    name: string;
}

interface Product {
    _id: string;
    name: string;
    image_url?: string;
}

export default function MapperPage() {
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);
    const [ingredientQuery, setIngredientQuery] = useState("");
    const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
    const [selectedIngredient, setSelectedIngredient] = useState<IngredientOption | null>(null);

    // Fetch a random unmapped product
    const fetchRandomProduct = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/mapping");
            const data = await res.json();
            if (res.ok) setProduct(data.product);
            else setProduct(null);
        } finally {
            setLoading(false);
        }
    };

    // Fetch ingredient suggestions
    const searchIngredients = async (query: string) => {
        if (!query) return;
        const res = await fetch(`/api/ingredients?query=${encodeURIComponent(query)}&autosuggest=true&limit=10`);
        if (!res.ok) return;
        const data = await res.json();
        setIngredients(data.results || []);
    };

    // Handle match button
    const handleMatch = async () => {
        if (!product || !selectedIngredient) return;
        setLoading(true);
        await fetch("/api/mapping/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                productId: product._id,
                ingredientId: selectedIngredient._id,
            }),
        });
        setSelectedIngredient(null);
        setIngredientQuery("");
        await fetchRandomProduct();
        setLoading(false);
    };

    // Handle skip
    const handleSkip = async () => {
        await fetchRandomProduct();
    };

    useEffect(() => {
        fetchRandomProduct();
    }, []);

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
                🧩 Product → Ingredient Mapper
            </Typography>

            {loading && <CircularProgress />}

            {product && (
                <Card sx={{ mt: 3 }}>
                    <CardContent>
                        <Typography variant="h6">{product.name}</Typography>
                        {product.image_url && (
                            <Box component="img" src={product.image_url} alt={product.name} sx={{ width: 200, borderRadius: 2, mt: 2 }} />
                        )}

                        <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
                            <Autocomplete
                                freeSolo
                                options={ingredients}
                                getOptionLabel={(option: any) => option.name}
                                value={selectedIngredient}
                                onInputChange={(_, value) => {
                                    setIngredientQuery(value);
                                    searchIngredients(value);
                                }}
                                onChange={(_, value: any) => setSelectedIngredient(value)}
                                renderInput={(params) => <TextField {...params} label="Search Ingredient" />}
                                sx={{ flex: 1 }}
                            />
                            <Button variant="contained" color="success" onClick={handleMatch} disabled={!selectedIngredient}>
                                Match
                            </Button>
                            <Button variant="outlined" color="warning" onClick={handleSkip}>
                                Skip
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {!loading && !product && (
                <Typography color="text.secondary" sx={{ mt: 4 }}>
                    ✅ All products are mapped! 🎉
                </Typography>
            )}
        </Box>
    );
}
