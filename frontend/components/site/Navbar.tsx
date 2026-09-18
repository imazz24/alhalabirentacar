"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

const NAV_LINKS = [
  { href: "/", label: "nav.home" },
  { href: "/cars", label: "nav.cars" },
  { href: "/about", label: "nav.about" },
  { href: "/contact", label: "nav.contact" },
];

export default function Navbar() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="surface-blur sticky top-0 z-50 border-b border-line">
      <div className="container-site flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center" aria-label={t("nav.homeAria")}>
          <Image
            src="/logo.png"
            alt="Al Halabi Rent"
            width={817}
            height={320}
            priority
            className="theme-dark-only h-12 w-auto sm:h-14"
          />
          <Image
            src="/logo-light.png"
            alt=""
            aria-hidden
            width={817}
            height={320}
            className="theme-light-only h-12 w-auto sm:h-14"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative text-sm font-medium tracking-wide transition ${
                pathname === link.href ? "text-accent" : "text-slate-500 hover:text-accent"
              }`}
            >
              {t(link.label)}
              {pathname === link.href && (
                <span className="absolute -bottom-2 left-0 h-px w-full bg-accent" aria-hidden />
              )}
            </Link>
          ))}

          <a
            href="tel:+96170858510"
            className="hidden items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent/60 lg:inline-flex"
          >
            <Phone className="h-4 w-4 text-accent" />
            +961 70 858 510
          </a>

          <ThemeToggle />
          <LanguageSwitcher />

          <Link href="/cars" className="btn-accent py-2!">
            {t("nav.bookNow")}
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <LanguageSwitcher />
          <button
            className="inline-flex items-center rounded-lg p-2 text-ink hover:bg-surface-2"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("nav.toggleNavigation")}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-surface pb-4 md:hidden">
          <nav className="container-site flex flex-col gap-3 pt-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-3 py-2.5 text-sm font-medium ${
                  pathname === link.href ? "bg-surface-2 text-accent" : "text-slate-500"
                }`}
              >
                {t(link.label)}
              </Link>
            ))}
            <a href="tel:+96170858510" className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink">
              <Phone className="h-4 w-4 text-accent" /> +961 70 858 510
            </a>
            <Link href="/cars" onClick={() => setOpen(false)} className="btn-accent">
              {t("nav.bookNow")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}