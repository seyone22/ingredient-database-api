"use client";

import { Suspense } from "react";
import Navbar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import Loader from "@/components/loader/Loader";
import SearchContent from "./SearchContent";
import styles from "./page.module.css";

export default function SearchPage() {
    return (
        <div className={styles.page}>
            <Navbar />

            <main className={styles.main}>
                <Suspense fallback={<Loader />}>
                    <SearchContent />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
