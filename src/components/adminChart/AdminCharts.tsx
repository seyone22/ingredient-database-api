"use client";

import { useMemo } from "react";
import { DatabaseStats } from "@/services/metaService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Line, LineChart, Cell } from "recharts";

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

// Generates a proper shadcn ChartConfig object from flat data
const generatePieConfig = (data: { label: string; value: number }[]) => {
    const config: ChartConfig = {};
    data.forEach((item, index) => {
        // Map the label to a standard var(--chart-N) color
        config[item.label] = {
            label: item.label,
            color: `hsl(var(--chart-${(index % 5) + 1}))`,
        };
    });
    return config;
};

// Formats data for Recharts, assigning a distinct fill color based on the config
const formatChartData = (obj: Record<string, number>) =>
    Object.entries(obj)
        .map(([key, value]) => ({ label: key, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .map((item, index) => ({
            ...item,
            fill: `hsl(var(--chart-${(index % 5) + 1}))`, // Recharts uses this for pie slices
        }));

export default function AdminCharts({
                                        countries,
                                        cuisines,
                                        regions,
                                        flavorProfiles,
                                        productsBySource,
                                        topIngredients,
                                        growth,
                                    }: AdminChartsProps) {
    // 1. Format the data
    const countryData = formatChartData(countries.byCountry);
    const cuisineData = formatChartData(cuisines.byCuisine);
    const regionData = formatChartData(regions.byRegion);
    const flavorData = formatChartData(flavorProfiles.byFlavor);
    const sourceData = formatChartData(productsBySource);
    const topIngData = topIngredients.map((i, index) => ({
        label: i.name,
        value: i.count,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`
    }));

    // 2. Generate configurations so tooltips and legends know what colors to use
    const barConfig = { value: { label: "Count", color: "hsl(var(--primary))" } } satisfies ChartConfig;
    const regionConfig = generatePieConfig(regionData);
    const flavorConfig = generatePieConfig(flavorData);
    const sourceConfig = generatePieConfig(sourceData);

    const growthConfig = {
        ingredients: { label: "Ingredients", color: "hsl(var(--chart-1))" },
        products: { label: "Products", color: "hsl(var(--chart-2))" },
        mappings: { label: "Mappings", color: "hsl(var(--chart-3))" },
    } satisfies ChartConfig;

    // 3. Merge line chart data
    const mergedGrowthData = useMemo(() => {
        return growth.products.map(p => {
            const date = p.date;
            const ingCount = growth.ingredients.find(i => i.date === date)?.count || 0;
            const mapCount = growth.mappings.find(m => m.date === date)?.count || 0;
            return { date, products: p.count, ingredients: ingCount, mappings: mapCount };
        });
    }, [growth]);

    return (
        <div className="flex flex-col gap-6 mt-8">
            {/* ===== Row 1: Country + Region ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Top Countries</CardTitle>
                        <CardDescription>Highest ingredient origin counts</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={barConfig} className="h-[300px] w-full">
                            <BarChart data={countryData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                {/* Use CSS var for primary color if fill isn't provided in data */}
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Regional Distribution</CardTitle>
                        <CardDescription>Ingredient origins by broad region</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-0">
                        <ChartContainer config={regionConfig} className="mx-auto aspect-square h-[300px] w-full">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <Pie data={regionData} dataKey="value" nameKey="label" innerRadius={60} strokeWidth={2}>
                                    {regionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent className="-translate-y-2 flex-wrap gap-2" />} />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            {/* ===== Row 2: Flavor + Cuisine ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Flavor Profiles</CardTitle>
                        <CardDescription>Breakdown by primary taste characteristics</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-0">
                        <ChartContainer config={flavorConfig} className="mx-auto aspect-square h-[300px] w-full">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <Pie data={flavorData} dataKey="value" nameKey="label" innerRadius={60} strokeWidth={2}>
                                    {flavorData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent className="-translate-y-2 flex-wrap gap-2" />} />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Top Cuisines</CardTitle>
                        <CardDescription>Most commonly associated culinary styles</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={barConfig} className="h-[300px] w-full">
                            <BarChart data={cuisineData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            {/* ===== Row 3: Top Ingredients + Product Sources ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Top Ingredients</CardTitle>
                        <CardDescription>Most utilized ingredients in the database</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={barConfig} className="h-[300px] w-full">
                            <BarChart data={topIngData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Product Sources</CardTitle>
                        <CardDescription>Origin distribution of mapped products</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-0">
                        <ChartContainer config={sourceConfig} className="mx-auto aspect-square h-[300px] w-full">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <Pie data={sourceData} dataKey="value" nameKey="label" innerRadius={60} strokeWidth={2}>
                                    {sourceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent className="-translate-y-2 flex-wrap gap-2" />} />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            {/* ===== Row 4: Growth Trend ===== */}
            <Card>
                <CardHeader>
                    <CardTitle>Database Growth Over Time</CardTitle>
                    <CardDescription>Tracking cumulative additions across core metrics</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={growthConfig} className="h-[400px] w-full">
                        <LineChart data={mergedGrowthData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                            />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Line type="monotone" dataKey="ingredients" stroke="var(--color-ingredients)" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="products" stroke="var(--color-products)" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="mappings" stroke="var(--color-mappings)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}