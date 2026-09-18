import { cookies } from "next/headers";
import { COOKIE_NAME, LOCALE_DIRS, normalizeLocale, type Locale } from "./i18n/messages";

/**
 * Reads the language from the `alhalabi_locale` cookie (set by the client-side
 * LanguageSwitcher). Falls back to the default locale. Must be awaited.
 */
export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(COOKIE_NAME)?.value);
}

/**
 * Blocking snippet that applies the saved language and its reading direction
 * before the first paint, so the page never flashes the wrong language/rtl.
 *
 * The server injects the cookie-resolved locale as `defaultLocale`; visitors
 * without a cookie keep it. Visitors who already picked a language have a
 * localStorage copy that takes priority, and a `?lang=xx` query param pins a
 * language for shareable links. Injected from the root layout.
 */
export function localeInitScript(defaultLocale: Locale): string {
  const dir = LOCALE_DIRS;
  return `(function(){try{var q=new URLSearchParams(location.search).get("lang");
var raw=(q&&(q==="en"||q==="fr"||q==="ar"))?q:(localStorage.getItem(${JSON.stringify(
    "alhalabi-locale",
  )})||${JSON.stringify(defaultLocale)});
if(raw==="en"||raw==="fr"||raw==="ar"){document.documentElement.lang=raw;
document.documentElement.dir=${JSON.stringify(dir)}[raw]||"ltr"}}catch(e){}})();`;
}