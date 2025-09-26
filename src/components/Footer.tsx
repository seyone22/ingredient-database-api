import Image from "next/image";
import styles from "./Footer.module.css";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <a
                style={{ marginBottom: "12px" }}
                href="https://nextjs.org"
                target="_blank"
                rel="noopener noreferrer"
            >
                Powered by{" "}
                <Image
                    aria-hidden
                    src="/next.svg"
                    alt="Next.js Logo"
                    width={72}
                    height={16}
                />
            </a>
            <p>© {new Date().getFullYear()} FoodRepo by Seyone Gunasingham</p>
        </footer>
    );
}
