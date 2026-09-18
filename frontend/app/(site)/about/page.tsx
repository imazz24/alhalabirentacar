import Link from "next/link";
import { Car, ShieldCheck, Users, Wallet } from "lucide-react";
import { getPublicSettings } from "@/services/settings";
import { getServerLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";

export async function generateMetadata() {
  const locale = await getServerLocale();
  return { title: translate(locale, "about.meta") };
}

export default async function AboutPage() {
  const locale = await getServerLocale();
  const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);

  let settings;
  try {
    settings = await getPublicSettings();
  } catch {
    settings = null;
  }
  const company = settings?.company_name ?? "Al Halabi Rent";

  return (
    <div className="container-site py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-dark">{t("about.kicker")}</p>
        <h1 className="mt-2 text-4xl font-extrabold text-ink">{company}</h1>
        <p className="mt-5 leading-relaxed text-slate-600">
          {t("about.text")}
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: <Car className="h-6 w-6" />, titleKey: "about.modernFleet", textKey: "about.modernFleetText" },
          { icon: <Wallet className="h-6 w-6" />, titleKey: "about.fairPricing", textKey: "about.fairPricingText" },
          { icon: <ShieldCheck className="h-6 w-6" />, titleKey: "about.confirmedBooking", textKey: "about.confirmedBookingText" },
          { icon: <Users className="h-6 w-6" />, titleKey: "about.expertSupport", textKey: "about.expertSupportText" },
        ].map((item) => (
          <div key={item.titleKey} className="card p-6 text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-dark">
              {item.icon}
            </span>
            <h3 className="mt-4 text-base font-bold text-ink">{t(item.titleKey)}</h3>
            <p className="mt-2 text-sm text-slate-500">{t(item.textKey)}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-14 max-w-3xl rounded-3xl bg-primary p-10 text-center text-white">
        <h2 className="text-2xl font-extrabold">{t("about.ctaTitle")}</h2>
        <p className="mt-2 text-slate-300">{t("about.ctaText")}</p>
        <Link href="/cars" className="btn-accent mt-6">
          {t("about.browseCars")}
        </Link>
      </div>
    </div>
  );
}