"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Search, Timer } from "lucide-react";
import { toLocalInputValue } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Location } from "@/types";

interface SearchBarProps {
  locations: Location[];
  compact?: boolean;
}

function todayPlus(days: number): string {
  return toLocalInputValue(new Date(Date.now() + days * 86400000));
}

export default function SearchBar({ locations, compact = false }: SearchBarProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [pickupLoc, setPickupLoc] = useState("");
  const [pickupDate, setPickupDate] = useState(todayPlus(1));
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnLoc, setReturnLoc] = useState("");
  const [returnDate, setReturnDate] = useState(todayPlus(2));
  const [returnTime, setReturnTime] = useState("10:00");

  const activeLocations = useMemo(() => locations.filter((loc) => loc.is_active), [locations]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (pickupLoc) params.set("pickup_location", pickupLoc);
    if (returnLoc) params.set("return_location", returnLoc);
    if (pickupDate) params.set("pickup_date", `${pickupDate}T${pickupTime}:00`);
    if (returnDate) params.set("return_date", `${returnDate}T${returnTime}:00`);
    router.push(`/cars?${params.toString()}`);
  }

  const gridClass = compact
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6";

  return (
    <form
      onSubmit={handleSubmit}
      className={`grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-2xl shadow-primary/10 ${gridClass}`}
    >
      <div>
        <label className="label flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-accent-dark" /> {t("searchBar.pickupLocation")}
        </label>
        <select className="input" value={pickupLoc} onChange={(e) => setPickupLoc(e.target.value)}>
          <option value="">{t("searchBar.selectLocation")}</option>
          {activeLocations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5 text-accent-dark" /> {t("searchBar.pickupDate")}
        </label>
        <input
          type="date"
          className="input"
          value={pickupDate}
          min={todayPlus(0)}
          onChange={(e) => setPickupDate(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label flex items-center gap-1">
          <Timer className="h-3.5 w-3.5 text-accent-dark" /> {t("searchBar.pickupTime")}
        </label>
        <input type="time" className="input" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
      </div>

      <div>
        <label className="label flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-accent-dark" /> {t("searchBar.returnLocation")}
        </label>
        <select className="input" value={returnLoc} onChange={(e) => setReturnLoc(e.target.value)}>
          <option value="">{t("searchBar.selectLocation")}</option>
          {activeLocations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5 text-accent-dark" /> {t("searchBar.returnDate")}
        </label>
        <input
          type="date"
          className="input"
          value={returnDate}
          min={pickupDate}
          onChange={(e) => setReturnDate(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label flex items-center gap-1">
          <Timer className="h-3.5 w-3.5 text-accent-dark" /> {t("searchBar.returnTime")}
        </label>
        <input type="time" className="input" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} />
      </div>

      <div className={compact ? "lg:col-span-5 flex" : "sm:col-span-2 lg:col-span-3 xl:col-span-6 flex"}>
        <button type="submit" className="btn-accent w-full py-3.5!">
          <Search className="h-5 w-5" /> {t("searchBar.search")}
        </button>
      </div>
    </form>
  );
}