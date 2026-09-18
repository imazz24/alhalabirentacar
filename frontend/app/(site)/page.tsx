import Link from "next/link";
import {
  ArrowRight,
  Bus,
  CalendarCheck,
  Car,
  CarFront,
  Gem,
  MessageCircle,
  Search,
  ShieldCheck,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";
import { getCars, getCarsMeta } from "@/services/cars";
import { getLocations } from "@/services/locations";
import CarCard from "@/components/site/CarCard";
import FindMyCarCta from "@/components/site/FindMyCarCta";
import { COMPANY_WHATSAPP } from "@/components/site/company-info";
import SearchBar from "@/components/site/SearchBar";
import { effectiveDailyPrice, formatPrice } from "@/lib/format";
import { getServerLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n/messages";

export const revalidate = 60;

/** Line icons instead of emoji — the fleet tiles have to look like a showroom. */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Economy: <Car className="h-6 w-6" />,
  Sedan: <CarFront className="h-6 w-6" />,
  SUV: <Truck className="h-6 w-6" />,
  Luxury: <Gem className="h-6 w-6" />,
  Sports: <Zap className="h-6 w-6" />,
  Van: <Bus className="h-6 w-6" />,
};

export default async function HomePage() {
  const locale = await getServerLocale();
  const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);

  const [{ items: cars }, locations, meta] = await Promise.all([
    getCars({}, 1, 8),
    getLocations(),
    getCarsMeta(),
  ]);

  const cheapest = formatPrice(
    cars.length > 0 ? Math.min(...cars.map((car) => effectiveDailyPrice(car))) : 35,
  );

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="container-site relative py-20 lg:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              <ShieldCheck className="h-3.5 w-3.5" /> {t("home.trustedLabel")}
            </span>
            <span className="rule-gold mt-6 block" aria-hidden />
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {t("home.heroTitleBefore")} <span className="text-accent">{t("home.heroTitleHighlight")}</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-300">
              {t("home.heroText")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cars" className="btn-accent px-7! py-3.5!">
                <Search className="h-5 w-5" /> {t("home.browseFleet")}
              </Link>
              <a
                href={`https://wa.me/${COMPANY_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn border! border-white/20 bg-white/5 text-white backdrop-blur transition hover:border-accent/60 hover:text-accent"
              >
                <MessageCircle className="h-5 w-5" /> {t("home.talkToTeam")}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="relative z-10 -mt-10 pb-4">
        <div className="container-site">
          <SearchBar locations={locations} compact />
        </div>
      </section>

      {/* Why us */}
      <section className="py-12">
        <div className="container-site grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: <Wallet className="h-6 w-6" />,
              titleKey: "home.whyTitlePricing",
              textKey: "home.whyTextPricing",
            },
            {
              icon: <ShieldCheck className="h-6 w-6" />,
              titleKey: "home.whyTitleConfirmed",
              textKey: "home.whyTextConfirmed",
            },
            {
              icon: <CalendarCheck className="h-6 w-6" />,
              titleKey: "home.whyTitleEasy",
              textKey: "home.whyTextEasy",
            },
          ].map((item) => (
            <div key={item.titleKey} className="card p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent-dark">
                {item.icon}
              </span>
              <h3 className="mt-4 text-base font-bold text-ink">{t(item.titleKey)}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{t(item.textKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured cars */}
      <section className="py-12">
        <div className="container-site">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent-dark">{t("home.fleetLabel")}</p>
              <h2 className="mt-1 text-3xl font-extrabold text-ink">{t("home.featuredTitle")}</h2>
            </div>
            <Link href="/cars" className="btn-outline py-2.5! text-sm">
              {t("home.viewAllCars")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {cars.length === 0 ? (
            <p className="text-slate-500">{t("home.updatingFleet")}</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cars.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Popular categories */}
      <section className="bg-surface py-16">
        <div className="container-site">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-dark">{t("home.categoriesLabel")}</p>
            <h2 className="mt-1 text-3xl font-extrabold text-ink">{t("home.categoriesTitle")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {meta.categories.map((category) => (
              <Link
                key={category}
                href={`/cars?category=${encodeURIComponent(category)}`}
                className="card group flex flex-col items-center gap-3 p-6 text-center transition hover:-translate-y-1 hover:border-accent/50"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent transition group-hover:bg-accent/15">
                  {CATEGORY_ICONS[category] ?? <Car className="h-6 w-6" />}
                </span>
                <span className="text-sm font-bold tracking-wide text-ink">{category}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Closing band */}
      <section className="py-16">
        <div className="container-site">
          <FindMyCarCta
            text={t("home.findMyCarText", { brands: String(meta.brands.length), price: cheapest })}
          />
        </div>
      </section>
    </div>
  );
}