"use client";

import {
  ArrowDownToLine,
  BarChart3,
  Database,
  LayoutDashboard,
  Link2,
  Package,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
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
    { href: "/admin/quality", label: "Quality", icon: ShieldCheck },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/mapper", label: "Mapper", icon: Link2 },
    { href: "/admin/product", label: "Products", icon: Package },
    { href: "/admin/ingest", label: "Ingest", icon: ArrowDownToLine },
  ];

  const publicLinks = [
    { href: "/recipe-pricing", label: "Recipe Pricing" },
    { href: "/documentation", label: "Documentation" },
    { href: "/contribute", label: "Contribute" },
    { href: "/about", label: "About" },
    { href: "/admin", label: "Stats" },
  ];

  return (
    <header className={styles.navHeader}>
      <nav
        className={cn(
          styles.navContainer,
          isAdminPage ? "max-w-7xl" : "max-w-5xl",
        )}
      >
        <div className="flex items-center gap-3">
          <Link href={"/"} className={styles.logoLink}>
            <h2 className={styles.logo}>
              <span className={styles.textPrimary}>Food</span>Repo
            </h2>
          </Link>
        </div>

        <button
          type="button"
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

        <ul
          className={`${styles.navLinks} ${isOpen ? styles.navLinksOpen : ""}`}
        >
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
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                      )}
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
                  className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 px-2.5 py-1.5 rounded-lg transition-all"
                >
                  Docs
                </Link>
              </li>
            </>
          ) : (
            publicLinks.map((link) => {
              const isActive = pathname === link.href;
              const isExternal = link.href.startsWith("http");
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 inline-block",
                      isActive
                        ? "text-foreground font-semibold bg-muted/80 shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </nav>
    </header>
  );
}
