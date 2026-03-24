// app/admin/page.tsx
"use client";

import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import AdminDashboard from "@/components/adminDashboard/AdminDashboard";

export default function AdminPage() {
    return (
        <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
            <NavBar />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Overview of database statistics, coverage, and data health.</p>
                </div>

                <AdminDashboard />
            </main>

            <Footer />
        </div>
    );
}