"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  Link2,
  Package,
  ArrowDownToLine,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import styles from "./NavBar.module.css";

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const isAdminPage = pathname?.startsWith("/admin");

  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/all", label: "All Ingredients", icon: Database },
    { href: "/admin/quality", label: "Data Quality", icon: ShieldCheck },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/mapper", label: "Product Mapper", icon: Link2 },
    { href: "/admin/product", label: "Products Catalog", icon: Package },
    { href: "/admin/ingest", label: "Ingest Pipeline", icon: ArrowDownToLine },
  ];

  const publicLinks = [
    { href: "/documentation", label: "Documentation" },
    { href: "/contribute", label: "Contribute" },
    { href: "/about", label: "About" },
    { href: "/admin", label: "Admin Panel" },
  ];

  return (
    <nav className={styles.nav}>
      <div className="flex items-center gap-3">
        <Link href={"/"} className={styles.logoLink}>
          <h2 className={styles.logo}>
            <span className={styles.textPrimary}>Food</span>Repo
          </h2>
        </Link>
        {isAdminPage && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <ShieldAlert className="w-3 h-3" /> Admin Area
          </span>
        )}
      </div>

      <button
        className={styles.hamburger}
        onClick={toggleMenu}
        aria-label="Toggle navigation menu"
      >
        <div
          className={`${styles.line} ${isOpen ? styles.line1Open : ""}`}
        ></div>
        <div
          className={`${styles.line} ${isOpen ? styles.line2Open : ""}`}
        ></div>
        <div
          className={`${styles.line} ${isOpen ? styles.line3Open : ""}`}
        ></div>
      </button>

      <ul className={`${styles.navLinks} ${isOpen ? styles.navLinksOpen : ""}`}>
        {isAdminPage ? (
          <>
            {adminLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname?.startsWith(link.href);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              );
            })}
            <li className="hidden md:block h-4 w-px bg-border my-auto mx-1" />
            <li>
              <Link
                href="/documentation"
                onClick={() => setIsOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                Docs
              </Link>
            </li>
          </>
        ) : (
          publicLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={() => setIsOpen(false)}>
                {link.label}
              </Link>
            </li>
          ))
        )}
      </ul>
    </nav>
  );
}
