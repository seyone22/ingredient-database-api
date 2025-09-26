import styles from "./SearchBar.module.css";

export default function SearchBar() {
    return (
        <form className={styles.search}>
            <input
                type="text"
                placeholder="Search ingredients..."
                aria-label="Search ingredients"
            />
            <button type="submit">Search</button>
        </form>
    );
}
