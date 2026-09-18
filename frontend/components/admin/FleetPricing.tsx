"use client";

import { useState } from "react";
import { Loader2, Percent, TrendingUp } from "lucide-react";
import { adminBulkPrice } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import Modal from "@/components/ui/Modal";
import { toast } from "@/components/ui/toast-store";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

type Mode = "percent" | "set";

interface FleetPricingProps {
  categories: string[];
  onDone: () => void;
}

/**
 * Re-prices the fleet in one action: a percentage move (a seasonal rise, a
 * promotion) or one flat daily rate, over every car or a single category.
 */
export default function FleetPricing({ categories, onDone }: FleetPricingProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("percent");
  const [category, setCategory] = useState("");
  const [percent, setPercent] = useState("10");
  const [price, setPrice] = useState("45");
  const [minPrice, setMinPrice] = useState("");
  const [includeLongRates, setIncludeLongRates] = useState(true);
  const [saving, setSaving] = useState(false);

  async function apply() {
    const token = getAdminToken();
    if (!token) return;

    const payload =
      mode === "percent"
        ? { percent: Number(percent) }
        : { set_price: Number(price) };

    if (mode === "percent" && !Number.isFinite(Number(percent))) {
      toast.error(t("admin.fleetPricing.percentError"));
      return;
    }
    if (mode === "set" && !(Number(price) > 0)) {
      toast.error(t("admin.fleetPricing.priceError"));
      return;
    }

    setSaving(true);
    try {
      const result = await adminBulkPrice(
        {
          ...payload,
          category: category || undefined,
          min_price: minPrice ? Number(minPrice) : undefined,
          include_weekly_monthly: includeLongRates,
        },
        token,
      );
      toast.success(
        (result.updated === 1
          ? t("admin.fleetPricing.updated", { count: result.updated })
          : t("admin.fleetPricing.updatedPlural", { count: result.updated })) +
          (result.category ? t("admin.fleetPricing.updatedCat", { category: result.category }) : ""),
      );
      setOpen(false);
      onDone();
    } catch (err) {
      showErrorToast(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-outline py-2.5! text-sm">
        <TrendingUp className="h-4 w-4" /> {t("admin.fleetPricing.button")}
      </button>

      <Modal open={open} title={t("admin.fleetPricing.title")} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">{t("admin.fleetPricing.applyTo")}</label>
            <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">{t("admin.fleetPricing.everyCar")}</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {t("admin.fleetPricing.catOnly", { category: item })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">{t("admin.fleetPricing.change")}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("percent")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  mode === "percent" ? "border-accent bg-accent/10 text-accent" : "border-line text-slate-500"
                }`}
              >
                {t("admin.fleetPricing.byPercent")}
              </button>
              <button
                type="button"
                onClick={() => setMode("set")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  mode === "set" ? "border-accent bg-accent/10 text-accent" : "border-line text-slate-500"
                }`}
              >
                {t("admin.fleetPricing.setOne")}
              </button>
            </div>
          </div>

          {mode === "percent" ? (
            <div>
              <label className="label" htmlFor="bulk-percent">
                {t("admin.fleetPricing.percentLabel")}
              </label>
              <div className="relative">
                <input
                  id="bulk-percent"
                  type="number"
                  step="1"
                  className="input pr-10"
                  value={percent}
                  onChange={(event) => setPercent(event.target.value)}
                />
                <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-amber-500"
                  checked={includeLongRates}
                  onChange={(event) => setIncludeLongRates(event.target.checked)}
                />
                <span className="text-sm text-slate-500">{t("admin.fleetPricing.moveLong")}</span>
              </label>
            </div>
          ) : (
            <div>
              <label className="label" htmlFor="bulk-price">
                {t("admin.fleetPricing.newDaily")}
              </label>
              <input
                id="bulk-price"
                type="number"
                min="1"
                step="1"
                className="input"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                {t("admin.fleetPricing.flatNote")}
              </p>
            </div>
          )}

          <div>
            <label className="label" htmlFor="bulk-floor">
              {t("admin.fleetPricing.floor")}
            </label>
            <input
              id="bulk-floor"
              type="number"
              min="1"
              step="1"
              className="input"
              placeholder="e.g. 25"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setOpen(false)} className="btn-outline py-2.5! text-sm">
            {t("common.cancel")}
          </button>
          <button onClick={apply} disabled={saving} className="btn-accent py-2.5! text-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.fleetPricing.apply")}
          </button>
        </div>
      </Modal>
    </>
  );
}
