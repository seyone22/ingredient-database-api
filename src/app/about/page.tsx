import Image from "next/image";
import styles from "./page.module.css";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export default function About() {
    return (
        <div className={styles.page}>
            <NavBar />

            <main className={styles.main}>
                <h1 className={styles.title}>
                    <span className={styles.textPrimary}>Food</span>Repo
                </h1>

                <p className={styles.description}>
                    FoodRepo aggregates detailed ingredient data and relationships to help
                    cooks, developers, and researchers understand the origins, flavors, and
                    cultural context of ingredients.
                </p>

                <p className={styles.statement}>
                    All data is provided <strong>freely</strong> for anyone to use.
                    Feel free to explore, integrate, or expand upon it.
                </p>

                <div className={styles.contact}>
                    <a href="https://github.com/seyone22" target="_blank" rel="noopener noreferrer">
                        <Image src="/github.svg" alt="GitHub" width={24} height={24} />
                        <span>GitHub</span>
                    </a>
                    <a href="mailto:s.g.seyone@proton.me">
                        <Image src="/email.svg" alt="Email" width={24} height={24} />
                        <span>Email</span>
                    </a>
                </div>
            </main>

            <Footer />
        </div>
    );
}
