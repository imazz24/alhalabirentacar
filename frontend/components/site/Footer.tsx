import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { getPublicSettings } from "@/services/settings";
import type { CompanySettings } from "@/types";
import { getServerLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";

const FALLBACK_SETTINGS: CompanySettings = {
  company_name: "Al Halabi Rent",
  phone_number: "+961 70 858 510",
  email: "info@alhalabirent.com",
  address: "Beirut, Lebanon",
  whatsapp_number: "",
  working_hours: "",
  currency: "$",
  logo_url: null,
  facebook_url: null,
  instagram_url: null,
  twitter_url: null,
};

export default async function Footer() {
  const locale = await getServerLocale();
  const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);

  let settings = FALLBACK_SETTINGS;
  try {
    settings = await getPublicSettings();
  } catch {
    // fallback holds defaults if the backend is unavailable
  }

  return (
    <footer className="border-t border-line bg-primary text-slate-300">
      <div className="container-site grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          {/* The footer band is dark in both skins, so the light artwork is not needed here. */}
          <Image src="/logo.png" alt={settings.company_name} width={817} height={320} className="h-14 w-auto" />
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {t("footer.tagline")}
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">{t("footer.explore")}</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/cars" className="text-slate-400 transition hover:text-accent">{t("footer.browseCars")}</Link></li>
            <li><Link href="/loyalty" className="text-slate-400 transition hover:text-accent">{t("footer.loyalty")}</Link></li>
            <li><Link href="/about" className="text-slate-400 transition hover:text-accent">{t("footer.aboutUs")}</Link></li>
            <li><Link href="/contact" className="text-slate-400 transition hover:text-accent">{t("footer.contact")}</Link></li>
            <li><a href="/admin/login" className="text-slate-400 transition hover:text-accent">{t("footer.admin")}</a></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">{t("footer.contactTitle")}</h3>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> <a href={`tel:${settings.phone_number}`}>{settings.phone_number}</a></li>
            <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {settings.email}</li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {settings.address}</li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">{t("footer.workingHours")}</h3>
          <p className="text-sm text-slate-400">{settings.working_hours || t("footer.workingHoursFallback")}</p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col items-center justify-between gap-2 py-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {settings.company_name}. {t("footer.rights")}</p>
          <p>{t("footer.confirmedLine")}</p>
        </div>
      </div>
    </footer>
  );
}