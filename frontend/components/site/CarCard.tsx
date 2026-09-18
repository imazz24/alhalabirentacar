"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Fuel, Gauge, Users } from "lucide-react";
import type { Car } from "@/types";
import { formatPrice } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/**
 * Premium automotive listing card: full-bleed photo, gold category rule, specs
 * on a single line, price set as a figure rather than a badge. Availability is
 * deliberately not shown — the team confirms it when they answer the request.
 */
export default function CarCard({ car }: { car: Car }) {
  const { t } = useI18n();
  const image = car.images.find((img) => img.is_main) ?? car.images[0];
  const hasDiscount =
    car.discount_daily_price != null && car.discount_daily_price > 0 && car.discount_daily_price < car.daily_price;
  const price = hasDiscount ? car.discount_daily_price! : car.daily_price;
  const savePercent = hasDiscount ? Math.round((1 - car.discount_daily_price! / car.daily_price) * 100) : 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition duration-300 hover:-translate-y-1 hover:border-accent/50">
      <Link href={`/cars/${car.id}`} className="relative block aspect-[16/10] overflow-hidden bg-surface-2">
        {image ? (
          <Image
            src={image.image_url}
            alt={car.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-slate-500">——</div>
        )}

        {/* Gradient keeps the caption legible over any photo. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent backdrop-blur">
          {car.category}
        </span>

        {hasDiscount && (
          <span className="absolute right-4 top-4 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary shadow-lg">
            −{savePercent}%
          </span>
        )}

        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold leading-tight text-white drop-shadow">
              {car.brand} {car.model}
            </h3>
            <p className="text-xs font-medium tracking-wide text-white/70">{car.year}</p>
          </div>
          <p className="shrink-0 text-right">
            {hasDiscount && (
              <span className="mb-0.5 mr-1.5 text-sm font-semibold text-white/60 line-through">{formatPrice(car.daily_price)}</span>
            )}
            <span className="block text-xl font-extrabold leading-none text-accent">{formatPrice(price)}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">{t("cars.card.perDay")}</span>
          </p>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-accent/70" /> {car.passengers} {t("cars.card.seats")}
          </span>
          <span className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-accent/70" /> {car.transmission}
          </span>
          <span className="flex items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5 text-accent/70" /> {car.fuel_type}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <Link href={`/cars/${car.id}`} className="btn-outline flex-1 py-2! text-xs">
            {t("cars.card.viewDetails")}
          </Link>
          <Link href={`/booking/${car.id}`} className="btn-accent flex-1 py-2! text-xs">
            {t("cars.card.reserve")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
