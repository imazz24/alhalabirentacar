"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarCheck,
  Car,
  ChevronDown,
  FileText,
  Gift,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Settings,
  Users,
} from "lucide-react";
import { getAdminToken, getStoredAdmin, clearAuth } from "@/lib/admin-auth";
import { Toaster } from "@/components/ui/Toaster";
import ThemeToggle from "@/components/site/ThemeToggle";
import NewBookingAlert from "./NewBookingAlert";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

const NAV_ITEMS = [
  { href: "/admin", label: "admin.nav.dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: "/admin/cars", label: "admin.nav.cars", icon: <Car className="h-5 w-5" /> },
  { href: "/admin/bookings", label: "admin.nav.bookings", icon: <CalendarCheck className="h-5 w-5" /> },
  { href: "/admin/customers", label: "admin.nav.customers", icon: <Users className="h-5 w-5" /> },
  { href: "/admin/loyalty", label: "admin.nav.loyalty", icon: <Gift className="h-5 w-5" /> },
  { href: "/admin/locations", label: "admin.nav.locations", icon: <MapPin className="h-5 w-5" /> },
  { href: "/admin/reports", label: "admin.nav.reports", icon: <FileText className="h-5 w-5" /> },
  { href: "/admin/settings", label: "admin.nav.settings", icon: <Settings className="h-5 w-5" /> },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin": "admin.titles.dashboard",
  "/admin/cars": "admin.titles.cars",
  "/admin/cars/new": "admin.titles.carNew",
  "/admin/bookings": "admin.titles.bookings",
  "/admin/customers": "admin.titles.customers",
  "/admin/loyalty": "admin.titles.loyalty",
  "/admin/locations": "admin.titles.locations",
  "/admin/reports": "admin.titles.reports",
  "/admin/reports/new": "admin.titles.reportNew",
  "/admin/settings": "admin.titles.settings",
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/admin/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-accent border-t-transparent" />
      </div>
    );
  }

  const user = getStoredAdmin();
  const adminName = typeof user?.full_name === "string" ? user.full_name : t("common.administrator");
  const current = t(PAGE_TITLES[pathname] ?? "admin.shell.portal");

  function handleLogout() {
    clearAuth();
    router.replace("/admin/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-primary text-slate-300">
      <div className="px-6 pb-5 pt-6">
        <Link href="/" className="group inline-block" aria-label={t("nav.homeAria")}>
          <Image
            src="/halabilogo.jpeg"
            alt="Al Halabi Rent"
            width={1500}
            height={1163}
            priority
            className="h-12 w-auto transition group-hover:opacity-90"
          />
        </Link>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {t("admin.shell.portal")}
        </p>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
                active
                  ? "border-accent/40 bg-accent/10 text-accent font-semibold shadow-[inset_0_0_0_1px_rgba(216,171,85,0.25)]"
                  : "border-transparent text-slate-300 hover:border-accent/25 hover:bg-white/5 hover:text-accent"
              }`}
            >
              {item.icon}
              {t(item.label)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="px-2 pb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          {t("admin.shell.skin")}
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-5 w-5" />
          {t("admin.shell.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface lg:flex">
      <Toaster />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 lg:pl-64">
        {/* Top bar */}
        <header className="surface-blur sticky top-0 z-30 border-b border-line">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button className="rounded-lg p-2 text-ink hover:bg-surface-2 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label={t("admin.shell.openMenu")}>
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-bold text-ink">{current}</h1>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              <NewBookingAlert />
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-surface-2"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-accent">
                    {adminName.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden text-sm font-semibold text-ink sm:block">{adminName}</span>
                  <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-12 w-48 rounded-2xl border border-line bg-surface p-2 shadow-xl">
                    <div className="px-3 py-2">
                      <p className="text-sm font-bold text-ink">{adminName}</p>
                      <p className="truncate text-xs text-slate-500">{typeof user?.email === "string" ? user.email : ""}</p>
                    </div>
                    <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50">
                      <LogOut className="h-4 w-4" /> {t("admin.shell.logout")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}