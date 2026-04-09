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
                setError("Failed to load statistics.");
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="p-8 space-y-8 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
                <Skeleton className="h-[500px] w-full rounded-xl" />
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error || "No data available."}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="">

            {/* ====== Overview Stats ====== */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Ingredients" value={stats.totalIngredients} icon={<Database />} />
                <StatCard title="Total Products" value={stats.totalProducts} icon={<Package />} />
                <StatCard title="Mapped Items" value={stats.totalMappedProducts} icon={<LinkIcon />} />
                <StatCard
                    title="Coverage"
                    value={`${stats.mappingCoverage.toFixed(1)}%`}
                    icon={<Percent />}
                    highlight
                />
            </section>

            {/* ====== Completeness Alerts ====== */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Data Completeness</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AlertCard label="Missing Country" value={stats.dataCompleteness.missingCountry} icon={<Globe />} />
                    <AlertCard label="Missing Cuisine" value={stats.dataCompleteness.missingCuisine} icon={<Utensils />} />
                    <AlertCard label="Missing Region" value={stats.dataCompleteness.missingRegion} icon={<MapPin />} />
                    <AlertCard label="Missing Flavor" value={stats.dataCompleteness.missingFlavor} icon={<Sparkles />} />
                </div>
            </section>

            {/* ====== Visualization Layer ====== */}
            <AdminCharts
                countries={stats.countries}
                cuisines={stats.cuisines}
                regions={stats.regions}
                flavorProfiles={stats.flavorProfiles}
                topIngredients={stats.topIngredients} // Now represents product support
                productsBySource={stats.productsBySource}
                growth={stats.growth}
            />
        </div>
    );
}

// Internal Sub-components for cleaner JSX
function StatCard({ title, value, icon, highlight }: any) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="text-muted-foreground w-4 h-4">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${highlight ? 'text-primary' : ''}`}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
            </CardContent>
        </Card>
    );
}

function AlertCard({ label, value, icon }: any) {
    return (
        <Card className="bg-destructive/5 border-destructive/10">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
                <span className="text-xs font-semibold text-destructive uppercase tracking-wider">{label}</span>
                <div className="text-destructive/60 w-4 h-4">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-destructive">{value.toLocaleString()}</div>
            </CardContent>
        </Card>
    );
}