"use client";

import { Moon, Sun } from "lucide-react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "alhalabi-theme";

/**
 * Blocking snippet that applies the saved skin before the first paint, so the
 * site never flashes black on a light-theme visitor (or the other way round).
 * `?theme=light` / `?theme=dark` pins a skin, which makes a link shareable and
 * the two skins testable. Injected from the root layout.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};
var q=new URLSearchParams(location.search).get("theme");
if(q==="light"||q==="dark"){localStorage.setItem(k,q)}
if((q||localStorage.getItem(k))==="light"){document.documentElement.dataset.theme="light"}}catch(e){}})();`;

/**
 * Flips between the black/gold and white/black/gold skins.
 *
 * The current skin lives on `<html data-theme>` and nowhere else: both icons are
 * rendered and CSS decides which one is visible. That keeps the button free of
 * React state, so the server-rendered markup is correct whichever skin the
 * visitor had saved.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next: Theme = root.dataset.theme === "light" ? "dark" : "light";
    if (next === "light") root.dataset.theme = "light";
    else delete root.dataset.theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing: the choice just will not stick.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between the dark and light theme"
      title="Switch theme"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line text-accent transition hover:border-accent/60 hover:bg-surface-2 ${className}`}
    >
      <Sun className="theme-dark-only h-4 w-4" aria-hidden />
      <Moon className="theme-light-only h-4 w-4" aria-hidden />
    </button>
  );
}
