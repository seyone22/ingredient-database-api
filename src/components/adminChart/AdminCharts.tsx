"use client";

import { BarChart, PieChart, LineChart } from "@mui/x-charts";
import { Box, Stack, Typography } from "@mui/material";
import { DatabaseStats } from "@/services/metaService";

interface AdminChartsProps {
    countries: DatabaseStats["countries"];
    cuisines: DatabaseStats["cuisines"];
    regions: DatabaseStats["regions"];
    flavorProfiles: DatabaseStats["flavorProfiles"];
    productsBySource: Record<string, number>;
    topIngredients: { name: string; count: number }[];
    growth: {
        ingredients: { date: string; count: number }[];
        products: { date: string; count: number }[];
        mappings: { date: string; count: number }[];
    };
}

export default function AdminCharts({
                                        countries,
                                        cuisines,
                                        regions,
                                        flavorProfiles,
                                        productsBySource,
                                        topIngredients,
                                        growth,
                                    }: AdminChartsProps) {
    const toChartData = (obj: Record<string, number>) =>
        Object.entries(obj)
            .map(([key, value]) => ({ label: key, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

    const countryData = toChartData(countries.byCountry);
    const cuisineData = toChartData(cuisines.byCuisine);
    const regionData = toChartData(regions.byRegion);
    const flavorData = toChartData(flavorProfiles.byFlavor);
    const sourceData = toChartData(productsBySource);

    return (
        <Stack direction="column" sx={{ mt: 6 }} gap={6}>
            {/* ===== Row 1: Country + Region ===== */}
            <Stack direction="row" gap={4} sx={{ width: "100%" }}>
                <Box sx={{ borderRadius: 3, backgroundColor: 'white', padding: 2, width: "60%" }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Top Countries by Ingredient Count
                    </Typography>
                    <BarChart
                        xAxis={[{ scaleType: "band", data: countryData.map(d => d.label) }]}
                        series={[{ data: countryData.map(d => d.value), label: "Ingredients" }]}
                        height={300}
                    />
                </Box>

                <Box sx={{ borderRadius: 3, backgroundColor: 'white', padding: 2, width: "40%" }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Regional Ingredient Distribution
                    </Typography>
                    <PieChart
                        series={[
                            {
                                data: regionData.map(r => ({
                                    id: r.label,
                                    label: r.label,
                                    value: r.value,
                                })),
                            },
                        ]}
                        height={300}
                    />
                </Box>
            </Stack>

            {/* ===== Row 2: Flavor + Cuisine ===== */}
            <Stack direction="row" gap={4} sx={{ width: "100%" }}>
                <Box sx={{ borderRadius: 3, backgroundColor: 'white', padding: 2, width: "40%" }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Flavor Profile Breakdown
                    </Typography>
                    <PieChart
                        series={[
                            {
                                data: flavorData.map(f => ({
                                    id: f.label,
                                    label: f.label,
                                    value: f.value,
                                })),
                            },
                        ]}
                        height={300}
                    />
                </Box>

                <Box sx={{ borderRadius: 3, backgroundColor: 'white', padding: 2, width: "60%" }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Top Cuisines by Ingredient Count
                    </Typography>
                    <BarChart
                        xAxis={[{ scaleType: "band", data: cuisineData.map(d => d.label) }]}
                        series={[{ data: cuisineData.map(d => d.value), label: "Ingredients" }]}
                        height={300}
                    />
                </Box>
            </Stack>

            {/* ===== Row 3: Top Ingredients + Product Sources ===== */}
            <Stack direction="row" gap={4} sx={{ width: "100%" }}>
                <Box sx={{ borderRadius: 3, backgroundColor: 'white', padding: 2, width: "60%" }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Top Ingredients in Database
                    </Typography>
                    <BarChart
                        xAxis={[{ scaleType: "band", data: topIngredients.map(i => i.name) }]}
                        series={[{ data: topIngredients.map(i => i.count), label: "Count" }]}
                        height={300}
                    />
                </Box>

                <Box sx={{ borderRadius: 3, backgroundColor: 'white', padding: 2, width: "40%" }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Product Source Breakdown
                    </Typography>
                    <PieChart
                        series={[
                            {
                                data: sourceData.map(s => ({
                                    id: s.label,
                                    label: s.label,
                                    value: s.value,
                                })),
                            },
                        ]}
                        height={300}
                    />
                </Box>
            </Stack>

            {/* ===== Row 4: Growth Trend ===== */}
            <Stack direction="column" sx={{ width: "100%", borderRadius: 3, backgroundColor: 'white' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Database Growth Over Time
                </Typography>
                <LineChart
                    xAxis={[{ scaleType: "point", data: growth.products.map(g => g.date) }]}
                    series={[
                        { data: growth.ingredients.map(g => g.count), label: "Ingredients" },
                        { data: growth.products.map(g => g.count), label: "Products" },
                        { data: growth.mappings.map(g => g.count), label: "Mappings" },
                    ]}
                    height={350}
                />
            </Stack>
        </Stack>
    );
}
