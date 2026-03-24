"use client";

import React, { useEffect, useState } from "react";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, CheckCircle2, XCircle, Loader2, Calendar, ListFilter, AlertTriangle } from "lucide-react";
import "react-calendar-heatmap/dist/styles.css";
import { Tooltip } from "react-tooltip";
import CalendarHeatmap from 'react-calendar-heatmap';

export default function IngestDashboard() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);

    const fetchLogs = async () => {
        try {
            const res = await fetch("/api/admin/logs?type=SCRAPE_RUN&limit=50");
            const data = await res.json();
            setLogs(data.logs || []);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, []);

    // Process logs for the heatmap (last 6 months)
    const heatmapData = React.useMemo(() => {
        const counts: Record<string, number> = {};
        logs.forEach(log => {
            const date = new Date(log.startTime).toISOString().split('T')[0];
            counts[date] = (counts[date] || 0) + 1;
        });
        return Object.entries(counts).map(([date, count]) => ({ date, count }));
    }, [logs]);

    const handleManualTrigger = async () => {
        if (!confirm("Are you sure you want to trigger a manual supermarket ingest? This will spin up the scrapers.")) return;
        setIsTriggering(true);
        try {
            const res = await fetch("/api/admin/scraper/run", { method: "POST" });
            if (!res.ok) throw new Error("Trigger failed");
            alert("Scraper pipeline initiated successfully.");
            fetchLogs();
        } catch (err) {
            alert("Failed to start scraper. Check server logs.");
        } finally {
            setIsTriggering(false);
        }
    };

    const today = new Date();
    const sixMonthsAgo = new Date().setMonth(today.getMonth() - 6);

    return (
        <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
            <NavBar />
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Data Ingest Control</h1>
                        <p className="text-muted-foreground italic text-sm">"Them bitches don't know what hit em."</p>
                    </div>
                    <Button
                        size="lg"
                        onClick={handleManualTrigger}
                        disabled={isTriggering || loading}
                        className="bg-primary hover:bg-primary/90 font-bold px-8 shadow-lg"
                    >
                        {isTriggering ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5 fill-current" />}
                        Trigger Unified Ingest
                    </Button>
                </div>

                {/* Heatmap Section */}
                <Card className="bg-card shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Ingest Frequency
                        </CardTitle>
                        <CardDescription>Visualizing supermarket scrape activity over the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Added a responsive wrapper with overflow-x-auto for small screens */}
                        <div className="pt-6 pb-2 px-2 overflow-x-auto">
                            <div className="min-w-[600px] heatmap-container">
                                <CalendarHeatmap
                                    startDate={sixMonthsAgo}
                                    endDate={today}
                                    values={heatmapData}
                                    gutterSize={1.5}
                                    classForValue={(value: any) => {
                                        if (!value || value.count === 0) {
                                            return 'color-empty';
                                        }
                                        return `color-scale-${Math.min(value.count, 4)}`;
                                    }}
                                    // Cast the return object to 'any' to stop the TS error
                                    tooltipDataAttrs={(value: any): any => {
                                        const dateStr = value?.date ? new Date(value.date).toLocaleDateString() : null;
                                        return {
                                            'data-tooltip-id': 'heatmap-tooltip',
                                            'data-tooltip-content': dateStr
                                                ? `${dateStr}: ${value.count} run(s)`
                                                : 'No activity logged',
                                        };
                                    }}
                                    showMonthLabels={true}
                                />
                                <Tooltip id="heatmap-tooltip" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Log List Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4 bg-muted/20">
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ListFilter className="h-5 w-5 text-primary" />
                                Recent Events
                            </CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={fetchLogs} className="text-muted-foreground">
                            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
                        </Button>
                    </CardHeader>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="w-[200px]">Start Time</TableHead>
                                <TableHead>Source Tag</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        No ingest events found in the audit trail.
                                    </TableCell>
                                </TableRow>
                            ) : logs.map((log) => (
                                <TableRow key={log._id}>
                                    <TableCell className="font-medium whitespace-nowrap">
                                        {new Date(log.startTime).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={cn(
                                            "capitalize font-mono text-[10px]",
                                            log.tag === 'CRON_SCRAPE' ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-purple-100 text-purple-700 border-purple-200"
                                        )}>
                                            {log.tag}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {log.endTime
                                            ? `${Math.round((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000 / 60)}m`
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {log.status === 'completed' && (
                                            <div className="flex items-center text-green-600 gap-1.5 font-semibold">
                                                <CheckCircle2 className="h-4 w-4" /> Success
                                            </div>
                                        )}
                                        {log.status === 'failed' && (
                                            <div className="flex items-center text-destructive gap-1.5 font-semibold">
                                                <XCircle className="h-4 w-4" /> Failed
                                            </div>
                                        )}
                                        {log.status === 'pending' && (
                                            <div className="flex items-center text-primary gap-1.5 font-semibold">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Working...
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {log.error ? (
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                <button className={'flex justify-center items-center'} onClick={() => alert(`Error: ${log.error}\n\nStack:\n${log.stack}`)}>
                                                    <AlertTriangle className="h-4 w-4 mr-1" />&nbsp;View Error
                                                </button>
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">{log.message || "—"}</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </main>
            <Footer />
        </div>
    );
}

// Utility for class merging
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}

function RefreshCcw(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-ccw"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
    )
}