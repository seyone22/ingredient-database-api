import { Suspense } from "react";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import IngredientSearch from "@/components/IngredientSearch";

export default function Home() {
    return (
        <div>
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