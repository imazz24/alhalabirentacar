import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/components/site/ThemeToggle";
import { I18nProvider } from "@/lib/i18n";
import { getServerLocale, localeInitScript } from "@/lib/i18n-server";
import { LOCALE_DIRS } from "@/lib/i18n/messages";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Al Halabi Rent | Car Rental in Lebanon",
    template: "%s",
  },
  description:
    "Professional car rental in Lebanon. Browse our fleet, select your dates and request your car quickly and easily.",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/logo-mark.png", type: "image/png", sizes: "512x512" }],
    apple: "/logo-mark.png",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getServerLocale();
  return (
    <html
      lang={locale}
      dir={LOCALE_DIRS[locale]}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Applies the saved skin before first paint — no flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Applies the saved language and direction before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: localeInitScript(locale) }} />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}