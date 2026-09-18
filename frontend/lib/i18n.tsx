"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, useState } from "react";
import { Globe } from "lucide-react";
import {
  COOKIE_NAME,
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_DIRS,
  LOCALE_NAMES,
  STORAGE_KEY,
  translate,
  type Locale,
} from "@/lib/i18n/messages";

type I18nContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLanguage: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function subscribeToStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function readSavedLocale(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const fallback = initialLocale ?? DEFAULT_LOCALE;

  const locale = useSyncExternalStore(
    subscribeToStorage,
    () => {
      const saved = readSavedLocale();
      return saved && LOCALES.includes(saved as Locale) ? (saved as Locale) : fallback;
    },
    () => fallback,
  );

  const setLanguage = useCallback((next: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing: keep in-page only.
    }
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = LOCALE_DIRS[next];
    window.location.reload();
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: LOCALE_DIRS[locale],
      setLanguage,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

/**
 * Language dropdown. Picking a language persists it (localStorage + cookie)
 * and reloads the page so server-rendered copy matches on the next paint.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        title="Language"
        className={`inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-2.5 text-sm font-semibold text-ink transition hover:border-accent/60 hover:bg-surface-2 ${className}`}
      >
        <Globe className="h-4 w-4 text-accent" aria-hidden />
        <span className="hidden sm:inline">{LOCALE_NAMES[locale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-40 rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
          {LOCALES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-surface-2 ${
                locale === lang ? "text-accent" : "text-slate-500"
              }`}
            >
              {LOCALE_NAMES[lang]}
              {locale === lang && <span className="text-xs">●</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}