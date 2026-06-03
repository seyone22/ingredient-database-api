import { Suspense } from "react";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import IngredientSearch from "@/components/IngredientSearch";

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
            <NavBar />

            <main>
                {/* Suspense is required here because IngredientSearch uses useSearchParams */}
                <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
                    <IngredientSearch />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}