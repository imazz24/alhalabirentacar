"use client";

import { useState } from "react";
import { MapPin, Pencil } from "lucide-react";
import type { Location } from "@/types";
import MapPicker, { type PickedPoint } from "@/components/ui/MapPicker";
import { useI18n } from "@/lib/i18n";

/** Sentinel select value meaning "somewhere else, on the map". */
export const CUSTOM_LOCATION = "custom";

export interface LocationChoice {
  /** An office id as a string, "custom", or "" when nothing is chosen yet. */
  value: string;
  point: PickedPoint | null;
}

export function locationLabel(
  choice: LocationChoice,
  locations: Location[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (choice.value === CUSTOM_LOCATION) {
    if (!choice.point) return "";
    return choice.point.label || t("booking.mapPoint", { latitude: choice.point.latitude.toFixed(4), longitude: choice.point.longitude.toFixed(4) });
  }
  return locations.find((location) => String(location.id) === choice.value)?.name ?? "";
}

export function isChoiceComplete(choice: LocationChoice): boolean {
  if (choice.value === CUSTOM_LOCATION) return choice.point !== null;
  return choice.value !== "";
}

interface LocationFieldProps {
  label: string;
  locations: Location[];
  choice: LocationChoice;
  onChange: (choice: LocationChoice) => void;
}

/**
 * Office picker with an escape hatch: choosing "Other" opens a map, and the
 * dropped pin travels with the booking so the team knows exactly where to meet
 * the customer.
 */
export default function LocationField({ label, locations, choice, onChange }: LocationFieldProps) {
  const { t } = useI18n();
  const [mapOpen, setMapOpen] = useState(false);

  function handleSelect(value: string) {
    if (value === CUSTOM_LOCATION) {
      setMapOpen(true);
      return;
    }
    onChange({ value, point: null });
  }

  return (
    <div>
      <label className="label flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5 text-accent" /> {label}
      </label>

      <select className="input" value={choice.value} onChange={(event) => handleSelect(event.target.value)}>
        <option value="">{t("searchBar.selectLocation")}</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
        <option value={CUSTOM_LOCATION}>{t("booking.other")}</option>
      </select>

      {choice.value === CUSTOM_LOCATION && choice.point && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate text-ink">{locationLabel(choice, locations, t)}</span>
          <span className="hidden font-mono text-slate-500 sm:inline">
            {choice.point.latitude.toFixed(4)}, {choice.point.longitude.toFixed(4)}
          </span>
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent hover:underline"
          >
            <Pencil className="h-3 w-3" /> {t("booking.location.change")}
          </button>
        </div>
      )}

      <MapPicker
        open={mapOpen}
        title={label}
        initial={choice.point}
        onCancel={() => {
          setMapOpen(false);
          // Selecting "Other" and then backing out should not leave the field
          // sitting on an option with no pin behind it.
          if (!choice.point) onChange({ value: "", point: null });
        }}
        onConfirm={(point) => {
          setMapOpen(false);
          onChange({ value: CUSTOM_LOCATION, point });
        }}
      />
    </div>
  );
}
