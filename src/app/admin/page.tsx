"use client";
import styles from "../page.module.css";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import AdminDashboard from "@/components/adminDashboard/AdminDashboard";


export default function AdminPage() {
    return (
        <div className={styles.page}>
            <NavBar />
            <main className={styles.main}>
                <AdminDashboard />
            </main>
            <Footer />
        </div>
    );
}
