import { Mail, MapPin, MessageCircle, Phone, Clock } from "lucide-react";
import { getPublicSettings } from "@/services/settings";
import { getServerLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";

export async function generateMetadata() {
  const locale = await getServerLocale();
  return { title: translate(locale, "contact.meta") };
}

export default async function ContactPage() {
  const locale = await getServerLocale();
  const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);

  let settings;
  try {
    settings = await getPublicSettings();
  } catch {
    settings = null;
  }

  const fallback = {
    phone_number: "+961 70 858 510",
    email: "info@alhalabirent.com",
    address: "Beirut, Lebanon",
    whatsapp_number: "96170858510",
    working_hours: "Mon - Sat: 9:00 AM - 6:00 PM",
  };
  const data = settings ?? fallback;

  const contactMethods = [
    { icon: <Phone className="h-5 w-5" />, label: t("contact.phone"), value: data.phone_number, href: `tel:${data.phone_number}` },
    { icon: <Mail className="h-5 w-5" />, label: t("contact.email"), value: data.email, href: `mailto:${data.email}` },
    { icon: <MapPin className="h-5 w-5" />, label: t("contact.address"), value: data.address, href: undefined },
    { icon: <Clock className="h-5 w-5" />, label: t("contact.workingHours"), value: data.working_hours, href: undefined },
  ];

  return (
    <div className="container-site py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-dark">{t("contact.kicker")}</p>
        <h1 className="mt-2 text-4xl font-extrabold text-ink">{t("contact.title")}</h1>
        <p className="mt-5 leading-relaxed text-slate-600">
          {t("contact.subtitle")}
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
        {contactMethods.map((method) => (
          <div key={method.label} className="card p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/5 text-ink">
              {method.icon}
            </span>
            <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-ink">{method.label}</h3>
            {method.href ? (
              <a href={method.href} className="mt-1 block font-semibold text-slate-700 hover:text-accent-dark">
                {method.value}
              </a>
            ) : (
              <p className="mt-1 font-semibold text-slate-700">{method.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-xl">
        <a
          href={`https://wa.me/${data.whatsapp_number}?text=${encodeURIComponent(t("contact.waMessage"))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-accent w-full py-4! text-base"
        >
          <MessageCircle className="h-5 w-5" /> {t("contact.waLabel")}
        </a>
      </div>
    </div>
  );
}