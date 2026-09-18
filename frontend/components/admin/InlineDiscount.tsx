"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Percent, X } from "lucide-react";
import type { Car } from "@/types";
import { adminUpdateCar } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import { formatPrice } from "@/lib/format";
import { toast } from "@/components/ui/toast-store";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

/** The price a percantage off produces. */
function discountedPrice(daily: number, percent: number | null): number {
  if (percent == null || !(percent > 0)) return daily;
  return Math.round(daily * (1 - percent / 100) * 100) / 100;
}

/**
 * Promotional daily rate, edited by percentage straight from the fleet table.
 * Typing "10" turns a $60 car into a $54 car automatically; clearing the field
 * removes the discount and the site goes back to the daily price.
 */
export default function InlineDiscount({ car, onSaved }: { car: Car; onSaved: (car: Car) => void }) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const active =
    car.discount_daily_price != null && car.discount_daily_price > 0 && car.discount_daily_price < car.daily_price;
  const percentOf = active ? Math.round((1 - car.discount_daily_price! / car.daily_price) * 100) : 0;

  const rawPercent = Number(value);
  const computed = editing
    ? discountedPrice(car.daily_price, Number.isFinite(rawPercent) ? rawPercent : null)
    : null;

  async function save() {
    const raw = value.trim();

    if (raw === "") {
      const token = getAdminToken();
      if (!token) return;
      if (!active) {
        setEditing(false);
        return;
      }
      setSaving(true);
      try {
        onSaved(await adminUpdateCar(car.id, { discount_daily_price: null }, token));
        toast.success(t("admin.inlineDiscount.removed", { name: car.name }));
        setEditing(false);
      } catch (err) {
        showErrorToast(err);
      } finally {
        setSaving(false);
      }
      return;
    }

    const percent = Number(raw);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 90) {
      toast.error(t("admin.inlineDiscount.error"));
      return;
    }

    const price = discountedPrice(car.daily_price, percent);
    const token = getAdminToken();
    if (!token) return;

    setSaving(true);
    try {
      onSaved(await adminUpdateCar(car.id, { discount_daily_price: price }, token));
      toast.success(
        t("admin.inlineDiscount.saved", {
          name: car.name,
          percent,
          price: formatPrice(price, "$", locale),
        }),
      );
      setEditing(false);
    } catch (err) {
      showErrorToast(err);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setValue(active ? String(percentOf) : "");
          setEditing(true);
        }}
        title={active ? t("admin.inlineDiscount.edit") : t("admin.inlineDiscount.set")}
        className="group inline-flex items-center gap-1.5 transition hover:text-accent"
      >
        {active ? (
          <>
            <span className="text-slate-400 line-through">{formatPrice(car.daily_price, "$", locale)}</span>
            <span className="font-semibold text-accent">{formatPrice(car.discount_daily_price!, "$", locale)}</span>
            <span className="badge bg-accent/10 text-accent">−{percentOf}%</span>
          </>
        ) : (
          <span className="text-slate-500">—</span>
        )}
        <Pencil className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="relative">
        <input
          type="number"
          min="1"
          max="90"
          step="1"
          autoFocus
          placeholder="10"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
            if (event.key === "Escape") setEditing(false);
          }}
          aria-label={active ? t("admin.inlineDiscount.edit") : t("admin.inlineDiscount.set")}
          className="input w-20 py-1.5! pr-7! text-sm"
        />
        <Percent className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>
      <span className="text-xs text-slate-500">
        {t("admin.inlineDiscount.now")} <strong className="text-accent">{formatPrice(computed ?? car.daily_price, "$", locale)}</strong>
      </span>
      <button onClick={save} disabled={saving} aria-label={t("common.save")} className="rounded-lg p-1.5 text-accent hover:bg-accent/10">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button onClick={() => setEditing(false)} aria-label={t("common.cancel")} className="rounded-lg p-1.5 text-slate-400 hover:text-ink">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}