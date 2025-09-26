import NavBar from "../components/navbar/NavBar";
import SearchBar from "../components/searchbar/SearchBar";
import Footer from "../components/footer/Footer";
import styles from "./page.module.css";

export default function Home() {
    return (
        <div className={styles.page}>
            <NavBar />

            <main className={styles.main}>
                <h1 className={styles.title}>
                    <span className={styles.textPrimary}>Food</span>Repo
                </h1>
                <p className={styles.subtitle}>
                    FoodRepo aggregates food ingredient data and relationships to help
                    people and developers understand what they're cooking with.
                </p>

                <SearchBar />
            </main>

            <Footer />
        </div>
    );
}
