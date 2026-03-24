// components/adminDashboard/AdminDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { DatabaseStats } from "@/services/metaService";
import AdminCharts from "@/components/adminChart/AdminCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Database,
    Package,
    Link as LinkIcon,
    Percent,
    AlertCircle,
    Globe,
    Utensils,
    MapPin,
    Sparkles
} from "lucide-react";

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

    // Skeleton loader for smooth transitions
    if (loading) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-96 w-full rounded-xl mt-8" />
            </div>
        );
    }

    if (error || !stats) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error || "No data available."}</AlertDescription>
            </Alert>
        );
    }

    const mappingCoverage = stats.mappingCoverage?.toFixed(1);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500">

            {/* ====== Top Stat Cards ====== */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Ingredients</CardTitle>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalIngredients.toLocaleString()}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalProducts.toLocaleString()}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Mapped Products</CardTitle>
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalMappedProducts.toLocaleString()}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Mapping Coverage</CardTitle>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-primary">{mappingCoverage}%</div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* ====== Data Completeness ====== */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Data Completeness Alerts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-destructive/5 border-destructive/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-destructive">Missing Country</CardTitle>
                            <Globe className="h-4 w-4 text-destructive/70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">
                                {stats.dataCompleteness.missingCountry.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-destructive/5 border-destructive/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-destructive">Missing Cuisine</CardTitle>
                            <Utensils className="h-4 w-4 text-destructive/70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">
                                {stats.dataCompleteness.missingCuisine.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-destructive/5 border-destructive/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-destructive">Missing Region</CardTitle>
                            <MapPin className="h-4 w-4 text-destructive/70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">
                                {stats.dataCompleteness.missingRegion.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-destructive/5 border-destructive/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-destructive">Missing Flavor</CardTitle>
                            <Sparkles className="h-4 w-4 text-destructive/70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">
                                {stats.dataCompleteness.missingFlavor.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

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
        </div>
    );
}