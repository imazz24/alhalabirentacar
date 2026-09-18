import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, Fuel, MessageCircle, Snowflake, Users, DoorOpen, Boxes, Settings2, BadgePercent } from "lucide-react";
import { getCar, getSimilarCars } from "@/services/cars";
import { effectiveDailyPrice, formatPrice } from "@/lib/format";
import CarVisuals from "@/components/site/CarVisuals";
import CarCard from "@/components/site/CarCard";
import FindMyCarCta from "@/components/site/FindMyCarCta";
import { COMPANY_WHATSAPP } from "@/components/site/company-info";
import { getServerLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getServerLocale();
  const { id } = await params;
  try {
    const car = await getCar(Number(id));
    return { title: `${car.name} - ${car.year} | Al Halabi Rent` };
  } catch {
    return { title: translate(locale, "car.descriptionTitle") + " | Al Halabi Rent" };
  }
}

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getServerLocale();
  const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);
  const { id } = await params;
  const carId = Number(id);

  let car;
  try {
    car = await getCar(carId);
  } catch {
    notFound();
  }

  const similar = await getSimilarCars(carId, 4);

  const hasDiscount =
    car.discount_daily_price != null && car.discount_daily_price > 0 && car.discount_daily_price < car.daily_price;
  const daily = effectiveDailyPrice(car);
  const savePercent = hasDiscount ? Math.round((1 - car.discount_daily_price! / car.daily_price) * 100) : 0;

  const specs = [
    { label: t("car.spec.year"), value: String(car.year), icon: <CalendarCheck className="h-4 w-4" /> },
    { label: t("car.spec.transmission"), value: car.transmission, icon: <Settings2 className="h-4 w-4" /> },
    { label: t("car.spec.fuelType"), value: car.fuel_type, icon: <Fuel className="h-4 w-4" /> },
    { label: t("car.spec.passengers"), value: String(car.passengers), icon: <Users className="h-4 w-4" /> },
    { label: t("car.spec.doors"), value: String(car.doors), icon: <DoorOpen className="h-4 w-4" /> },
    { label: t("car.spec.luggage"), value: String(car.luggage_capacity) + " " + t("common.bags"), icon: <Boxes className="h-4 w-4" /> },
    { label: t("car.spec.ac"), value: car.has_air_conditioning ? "Yes" : "No", icon: <Snowflake className="h-4 w-4" /> },
  ];

  return (
    <div className="container-site py-10">
      <Link href="/cars" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> {t("car.backToCars")}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <CarVisuals car={car} />
          <div className="mt-10">
            <h2 className="text-xl font-bold text-ink">{t("car.descriptionTitle")}</h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              {car.description || t("car.noDescription")}
            </p>
          </div>
        </div>

        <div>
          <div className="card sticky top-24 p-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">{car.category}</span>
              <h1 className="mt-1.5 text-2xl font-extrabold text-ink">{car.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{car.year}</p>
            </div>

            <div className="mt-5">
              <div className="flex items-end gap-2">
                {hasDiscount && (
                  <span className="mb-1.5 text-2xl font-bold text-slate-500 line-through">{formatPrice(car.daily_price)}</span>
                )}
                <span className="text-4xl font-extrabold text-ink">{formatPrice(daily)}</span>
                <span className="mb-1 text-sm text-slate-500">{t("common.perDay")}</span>
              </div>
              {hasDiscount && (
                <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent-dark">
                  <BadgePercent className="h-3.5 w-3.5" />
                  {t("car.saveWeek", { percent: savePercent })}
                </span>
              )}
            </div>

            {car.weekly_price && (
              <p className="mt-2 text-sm text-slate-600">
                <strong className="text-ink">{formatPrice(car.weekly_price)}</strong> {t("common.perWeek")}
              </p>
            )}
            {car.monthly_price && (
              <p className="mt-2 text-sm text-slate-600">
                <strong className="text-ink">{formatPrice(car.monthly_price)}</strong> {t("common.perMonth")}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-5">
              {specs.map((spec) => (
                <div key={spec.label} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5">
                  <span className="text-accent-dark">{spec.icon}</span>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-400">{spec.label}</p>
                    <p className="truncate text-sm font-semibold text-ink">{spec.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link href={`/booking/${car.id}`} className="btn-accent mt-6 w-full">
              <CalendarCheck className="h-4 w-4" /> {t("car.requestThisCar")}
            </Link>
            <a
              href={`https://wa.me/${COMPANY_WHATSAPP}?text=${encodeURIComponent(
                t("car.askMessage", { company: "Al Halabi Rent", name: car.name, year: String(car.year) }),
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline mt-2.5 w-full"
            >
              <MessageCircle className="h-4 w-4" /> {t("car.askAboutCar")}
            </a>

            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              {t("car.priceNote")}
            </p>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section id="similar-cars" className="scroll-mt-24 mt-16">
          <h2 className="mb-6 text-2xl font-extrabold text-ink">{t("car.similarTitle")}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-16">
        <FindMyCarCta
          title={t("car.ctaTitle")}
          text={t("car.ctaText")}
          message={t("car.ctaMessage", { name: car.name })}
        />
      </div>
    </div>
  );
}