"use client";

import { useEffect, useState } from "react";
import {
    Grid,
    CircularProgress,
    Box,
    Typography,
    Stack,
    Divider,
} from "@mui/material";
import StatCard from "@/components/statCard/StatCard";
import AdminCharts from "@/components/adminChart/AdminCharts";
import { DatabaseStats } from "@/services/metaService";

export default function AdminDashboard() {
    const [stats, setStats] = useState<DatabaseStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/meta/admin")
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch stats");
                return res.json();
            })
            .then((data) => {
                setStats(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError("Failed to load statistics.");
                setLoading(false);
            });
    }, []);

    if (loading)
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
                <CircularProgress />
            </Box>
        );

    if (error || !stats)
        return (
            <Typography color="error" textAlign="center" mt={4}>
                {error || "No data available."}
            </Typography>
        );

    const mappingCoverage = stats.mappingCoverage?.toFixed(1);

    return (
        <Box sx={{ px: 4 }}>
            {/* ====== Top Stat Cards ====== */}
            <Grid container spacing={3} justifyContent="center">
                <Stack gap={4} direction="row" flexWrap="wrap" sx={{ width: "100%" }} justifyContent="center" alignItems="center">
                    <StatCard title="Ingredients" value={stats.totalIngredients.toLocaleString()} />
                    <StatCard title="Products" value={stats.totalProducts.toLocaleString()} />
                    <StatCard title="Mapped Products" value={stats.totalMappedProducts.toLocaleString()} />
                    <StatCard title="Mapping Coverage" value={`${mappingCoverage}%`} />
                </Stack>
            </Grid>

            {/* ====== Data Completeness ====== */}
            <Box mt={6}>
                <Stack direction="row" gap={3} flexWrap="wrap" alignItems="center" justifyContent="center" sx={{ width: "100%" }}>
                    <StatCard
                        title="Missing Country"
                        value={stats.dataCompleteness.missingCountry.toLocaleString()}
                    />
                    <StatCard
                        title="Missing Cuisine"
                        value={stats.dataCompleteness.missingCuisine.toLocaleString()}
                    />
                    <StatCard
                        title="Missing Region"
                        value={stats.dataCompleteness.missingRegion.toLocaleString()}
                    />
                    <StatCard
                        title="Missing Flavor"
                        value={stats.dataCompleteness.missingFlavor.toLocaleString()}
                    />
                </Stack>
            </Box>

            {/* ====== Distribution Charts ====== */}
            <AdminCharts
                countries={stats.countries}
                cuisines={stats.cuisines}
                regions={stats.regions}
                flavorProfiles={stats.flavorProfiles}
                topIngredients={stats.topIngredients}
                productsBySource={stats.productsBySource}
                growth={stats.growth}
            />
        </Box>
    );
}
