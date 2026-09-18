"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { searchCars, getCars } from "@/services/cars";
import type { Car, CarsMeta } from "@/types";
import CarCard from "@/components/site/CarCard";
import FindMyCarCta from "@/components/site/FindMyCarCta";
import { toLocalInputValue } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 12;

export default function CarsPageClient({ meta }: { meta: CarsMeta }) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cars, setCars] = useState<Car[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [brand, setBrand] = useState(searchParams.get("brand") ?? "");
  const [transmission, setTransmission] = useState(searchParams.get("transmission") ?? "");
  const [passengers, setPassengers] = useState(searchParams.get("passengers") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") ?? "");
  const [pickupDate, setPickupDate] = useState(searchParams.get("pickup_date") ?? "");
  const [returnDate, setReturnDate] = useState(searchParams.get("return_date") ?? "");

  useEffect(() => {
    setCategory(searchParams.get("category") ?? "");
    setBrand(searchParams.get("brand") ?? "");
    setTransmission(searchParams.get("transmission") ?? "");
    setPassengers(searchParams.get("passengers") ?? "");
    setMinPrice(searchParams.get("min_price") ?? "");
    setMaxPrice(searchParams.get("max_price") ?? "");
    setPickupDate(searchParams.get("pickup_date") ?? "");
    setReturnDate(searchParams.get("return_date") ?? "");
    setPage(1);
  }, [searchParams]);

  const buildParams = useCallback(
    (pageNumber?: number) => {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (brand) params.brand = brand;
      if (transmission) params.transmission = transmission;
      if (passengers) params.passengers = passengers;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      if (pickupDate && returnDate) {
        params.pickup_date = pickupDate;
        params.return_date = returnDate;
      }
      if (pageNumber && pageNumber > 1) params.page = String(pageNumber);
      return params;
    },
    [category, brand, transmission, passengers, minPrice, maxPrice, pickupDate, returnDate],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = buildParams(page);
    const hasDates = Boolean(params.pickup_date && params.return_date);
    const request = hasDates ? searchCars(params, page, PAGE_SIZE) : getCars(params, page, PAGE_SIZE);
    request
      .then((result) => {
        if (!cancelled) {
          setCars(result.items);
          setTotal(result.total);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCars([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildParams, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applyFilters = (newPage = 1) => {
    const params = new URLSearchParams();
    Object.entries(buildParams(newPage)).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`/cars?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/cars");
  };

  const hasActiveFilters = Boolean(category || brand || transmission || passengers || minPrice || maxPrice || (pickupDate && returnDate));

  return (
    <div className="container-site py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-dark">{t("cars.fleetLabel")}</p>
          <h1 className="mt-1 text-3xl font-extrabold text-ink">
            {hasActiveFilters ? t("cars.resultsTitle") : t("cars.browseTitle")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? t("common.loading")
              : total === 1
                ? t("cars.available", { total })
                : t("cars.availablePlural", { total })}
          </p>
        </div>
        <button onClick={() => setFiltersOpen((v) => !v)} className="btn-outline py-2.5! text-sm md:hidden">
          <SlidersHorizontal className="h-4 w-4" /> {t("cars.filterSidebar")}
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
          <div className="card sticky top-24 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink">{t("cars.filterSidebar")}</h2>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600">
                  <X className="h-3.5 w-3.5" /> {t("common.clear")}
                </button>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label className="label">{t("cars.category")}</label>
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">{t("cars.allCategories")}</option>
                  {meta.categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">{t("cars.brand")}</label>
                <select className="input" value={brand} onChange={(e) => setBrand(e.target.value)}>
                  <option value="">{t("cars.allBrands")}</option>
                  {meta.brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">{t("cars.transmission")}</label>
                <select className="input" value={transmission} onChange={(e) => setTransmission(e.target.value)}>
                  <option value="">{t("cars.anyTransmission")}</option>
                  {meta.transmissions.map((trans) => (
                    <option key={trans} value={trans}>{trans}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">{t("cars.passengers")}</label>
                <select className="input" value={passengers} onChange={(e) => setPassengers(e.target.value)}>
                  <option value="">{t("cars.anyPassengers")}</option>
                  {[2, 4, 5, 7, 9, 12].map((n) => (
                    <option key={n} value={n}>{n}{t("cars.seatsSuffix")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">{t("cars.priceRange")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="input" placeholder={t("cars.min")} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                  <input type="number" className="input" placeholder={t("cars.max")} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">{t("cars.rentalDates")}</label>
                <div className="space-y-2">
                  <input type="datetime-local" className="input" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                  <input type="datetime-local" className="input" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{t("cars.datesHint")}</p>
              </div>

              <button onClick={() => applyFilters()} className="btn-primary w-full">
                {t("cars.applyFilters")}
              </button>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div>
          {loading ? (
            <CarGridSkeleton />
          ) : cars.length === 0 ? (
            <div className="space-y-6">
              <div className="card flex flex-col items-center justify-center p-12 text-center">
                <Search className="h-10 w-10 text-accent/70" />
                <h3 className="mt-4 text-lg font-bold text-ink">{t("cars.noResultsTitle")}</h3>
                <p className="mt-1 text-sm text-slate-500">{t("cars.noResultsText")}</p>
                <button onClick={clearFilters} className="btn-outline mt-5 py-2.5! text-sm">{t("cars.clearFilters")}</button>
              </div>
              <FindMyCarCta
                title={t("cars.noResultsCtaTitle")}
                text={t("cars.emptyText")}
              />
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {cars.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => {
                      const next = page - 1;
                      setPage(next);
                      applyFilters(next);
                    }}
                    className="btn-outline px-3! py-2! disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> {t("cars.prev")}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setPage(num);
                        applyFilters(num);
                      }}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        num === page ? "bg-accent text-primary" : "text-slate-500 hover:bg-surface-2 hover:text-accent"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => {
                      const next = page + 1;
                      setPage(next);
                      applyFilters(next);
                    }}
                    className="btn-outline px-3! py-2! disabled:opacity-40"
                  >
                    {t("cars.next")} <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="mt-12">
                <FindMyCarCta />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function CarGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card animate-pulse overflow-hidden">
          <div className="aspect-[16/10] bg-slate-200" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-white/5" />
            <div className="h-9 w-full rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}