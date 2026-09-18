"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import type { Car } from "@/types";
import { adminUpdateCar } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import { formatPrice } from "@/lib/format";
import { toast } from "@/components/ui/toast-store";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

/**
 * Daily rate, editable straight from the fleet table — the price is the field
 * the owner touches most, and walking into the full car form for it is friction.
 */
export default function InlinePrice({ car, onSaved }: { car: Car; onSaved: (car: Car) => void }) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(car.daily_price));
  const [saving, setSaving] = useState(false);

  async function save() {
    const price = Number(value);
    if (!(price > 0)) {
      toast.error(t("admin.inlinePrice.error"));
      return;
    }
    if (price === car.daily_price) {
      setEditing(false);
      return;
    }

    const token = getAdminToken();
    if (!token) return;
    setSaving(true);
    try {
      onSaved(await adminUpdateCar(car.id, { daily_price: price }, token));
      toast.success(t("admin.inlinePrice.saved", { name: car.name, price: formatPrice(price, "$", locale) }));
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
          setValue(String(car.daily_price));
          setEditing(true);
        }}
        title={t("admin.inlinePrice.edit")}
        className="group inline-flex items-center gap-1.5 font-semibold text-ink transition hover:text-accent"
      >
        {formatPrice(car.daily_price, "$", locale)}/day
        <Pencil className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min="1"
        step="1"
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") setEditing(false);
        }}
        aria-label={t("admin.inlinePrice.edit")}
        className="input w-24 py-1.5! text-sm"
      />
      <button onClick={save} disabled={saving} aria-label={t("common.save")} className="rounded-lg p-1.5 text-accent hover:bg-accent/10">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button onClick={() => setEditing(false)} aria-label={t("common.cancel")} className="rounded-lg p-1.5 text-slate-400 hover:text-ink">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
