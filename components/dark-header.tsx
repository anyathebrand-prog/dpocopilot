"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import "./dark-header.css";

const NAV: [string, string][] = [["/", "Home"], ["/#product", "Product"], ["/pricing", "Pricing"], ["/pilot", "Contact"]];

/** Dark-site header shared by the home and pricing pages: logo, white nav pill, Sign in, and the mobile sheet menu. */
export function DarkHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const current = (href: string) => (href === path ? "page" : undefined);

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => innerWidth > 720 && setOpen(false);
    addEventListener("keydown", onKey);
    addEventListener("resize", onResize);
    return () => { removeEventListener("keydown", onKey); removeEventListener("resize", onResize); document.body.classList.remove("menu-open"); };
  }, [open]);

  return (
    <>
      {/* Inter (UI) and BubbledotICG-FinePos (dot-matrix). React hoists these into <head>. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" precedence="default" />
      <link rel="stylesheet" href="https://db.onlinewebfonts.com/c/8cb707a9b8a73f8a7403336b861c3074?family=BubbledotICG-FinePos" precedence="default" />

      <header className="vh-header">
        <Link href="/" className="vh-logo" aria-label="DPO Copilot home">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static PNG, no optimisation needed */}
          <img src="/logo.png" alt="" width={601} height={162} />
        </Link>
        <nav className="vh-nav" aria-label="Site">
          {NAV.map(([href, label]) => <Link key={label} href={href} aria-current={current(href)}>{label}</Link>)}
        </nav>
        <Link href="/sign-in" className="vh-signin">Sign in</Link>
        <button type="button" className={`vh-burger ${open ? "is-open" : ""}`} aria-expanded={open} aria-controls="vh-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
      </header>

      <div className="vh-overlay" hidden={!open} onClick={() => setOpen(false)} />
      <nav id="vh-menu" className="vh-menu" hidden={!open} aria-label="Menu">
        {NAV.map(([href, label], i) => (
          <Link key={label} href={href} style={{ "--i": i } as CSSProperties} aria-current={current(href)} onClick={() => setOpen(false)}>{label}</Link>
        ))}
        <Link href="/sign-in" className="vh-menu-signin" style={{ "--i": NAV.length } as CSSProperties} onClick={() => setOpen(false)}>Sign in</Link>
      </nav>
    </>
  );
}
