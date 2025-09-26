import styles from "./NavBar.module.css";

export default function NavBar() {
    return (
        <nav className={styles.nav}>
            <a href={'/'}>
                <h2 className={styles.logo}>
                    <span className={styles.textPrimary}>Food</span>Repo
                </h2>
            </a>
            <ul className={styles.navLinks}>
                <li><a href="/explore">Documentation</a></li>
                <li><a href="/contribute">Contribute</a></li>
                <li><a href="/about">About</a></li>
            </ul>
        </nav>
    );
}
