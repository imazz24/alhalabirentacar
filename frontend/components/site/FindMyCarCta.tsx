"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { COMPANY_PHONE, COMPANY_WHATSAPP } from "./company-info";

function whatsappHref(message: string) {
  return `https://wa.me/${COMPANY_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/**
 * Shown wherever a customer might come up empty: no search results, a car that
 * is already taken for their dates, or simply the end of the fleet list. The
 * fleet changes constantly, so the honest answer is always "talk to us".
 */
export default function FindMyCarCta({
  title,
  text,
  message,
  compact = false,
}: {
  title?: string;
  text?: string;
  message?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("cars.emptyTitle");
  const resolvedText = text ?? t("cars.emptyCtaText");
  const resolvedMessage = message ?? t("cars.emptyMessage");

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-accent/25 bg-primary ${
        compact ? "p-6" : "p-8 sm:p-12"
      }`}
    >
      {/* Warm gold wash in the corner, the only decoration on the band. */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <span className="rule-gold mb-4 block" aria-hidden />
          <h2 className={`font-extrabold tracking-tight text-white ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
            {resolvedTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">{resolvedText}</p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:flex-row md:flex-col lg:flex-row">
          <a
            href={whatsappHref(resolvedMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-accent whitespace-nowrap"
          >
            <MessageCircle className="h-4 w-4" /> {t("common.chatWhatsApp")}
          </a>
          <a
            href={`tel:+${COMPANY_WHATSAPP}`}
            className="btn whitespace-nowrap border border-white/20 bg-white/5 text-white transition hover:border-accent/60 hover:text-accent"
          >
            <Phone className="h-4 w-4" /> {COMPANY_PHONE}
          </a>
          <Link
            href="/contact"
            className="btn whitespace-nowrap border border-white/20 bg-transparent text-white/80 transition hover:text-accent"
          >
            {t("common.contactUs")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}