'use client'

import React, { useState } from "react";
import styles from "./NavBar.module.css";

export default function NavBar() {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    return (
        <nav className={styles.nav}>
            <a href={'/'} className={styles.logoLink}> {/* Added a class for potential styling */}
                <h2 className={styles.logo}>
                    <span className={styles.textPrimary}>Food</span>Repo
                </h2>
            </a>

            <button className={styles.hamburger} onClick={toggleMenu} aria-label="Toggle navigation menu">
                <div className={`${styles.line} ${isOpen ? styles.line1Open : ''}`}></div>
                <div className={`${styles.line} ${isOpen ? styles.line2Open : ''}`}></div>
                <div className={`${styles.line} ${isOpen ? styles.line3Open : ''}`}></div>
            </button>

            <ul className={
                `${styles.navLinks} ${isOpen ? styles.navLinksOpen : ''}`
            }>
                <li><a href="/documentation" onClick={toggleMenu}>Documentation</a></li>
                <li><a href="/contribute" onClick={toggleMenu}>Contribute</a></li>
                <li><a href="/about" onClick={toggleMenu}>About</a></li>
            </ul>
        </nav>
    );
}