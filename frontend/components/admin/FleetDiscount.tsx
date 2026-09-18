"use client";

import { useState } from "react";
import { BadgePercent, Loader2, Percent } from "lucide-react";
import { adminBulkDiscount } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import Modal from "@/components/ui/Modal";
import { toast } from "@/components/ui/toast-store";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

interface FleetDiscountProps {
  categories: string[];
  onDone: () => void;
}

/**
 * Puts the same percentage off every car (or everything in one category).
 * The discounted price is worked out from each car's list price, so a "15% off"
 * promotion stays proportional across the fleet. The original daily price is
 * kept and shown crossed out on the site.
 */
export default function FleetDiscount({ categories, onDone }: FleetDiscountProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [percent, setPercent] = useState("10");
  const [saving, setSaving] = useState(false);

  async function apply(remove: boolean) {
    const token = getAdminToken();
    if (!token) return;

    const value = Number(percent);
    if (!remove && (!Number.isFinite(value) || value < 1 || value > 90)) {
      toast.error(t("admin.fleetDiscount.error"));
      return;
    }

    setSaving(true);
    try {
      const result = await adminBulkDiscount(
        {
          category: category || undefined,
          percent: remove ? undefined : value,
          remove,
        },
        token,
      );
      toast.success(
        remove
          ? (result.updated === 1
              ? t("admin.fleetDiscount.removed", { count: result.updated })
              : t("admin.fleetDiscount.removedPlural", { count: result.updated })) +
              (result.category ? t("admin.fleetPricing.updatedCat", { category: result.category }) : "")
          : (result.updated === 1
              ? t("admin.fleetDiscount.applied", { percent: value, count: result.updated })
              : t("admin.fleetDiscount.appliedPlural", { percent: value, count: result.updated })) +
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
        <BadgePercent className="h-4 w-4" /> {t("admin.fleetDiscount.button")}
      </button>

      <Modal open={open} title={t("admin.fleetDiscount.title")} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">{t("admin.fleetPricing.applyTo")}</label>
            <select
              className="input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label={t("admin.fleetPricing.applyTo")}
            >
              <option value="">{t("admin.fleetPricing.everyCar")}</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {t("admin.fleetPricing.catOnly", { category: item })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="discount-percent">
              {t("admin.fleetDiscount.percentLabel")}
            </label>
            <div className="relative">
              <input
                id="discount-percent"
                type="number"
                min="1"
                max="90"
                step="1"
                className="input pr-10"
                value={percent}
                onChange={(event) => setPercent(event.target.value)}
              />
              <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">{t("admin.fleetDiscount.note")}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            onClick={() => apply(true)}
            disabled={saving}
            className="btn-outline py-2.5! text-sm"
            title={t("admin.fleetDiscount.remove")}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.fleetDiscount.remove")}
          </button>
          <button
            onClick={() => apply(false)}
            disabled={saving}
            className="btn-accent py-2.5! text-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.fleetDiscount.apply", { percent: percent || "…" })}
          </button>
        </div>
      </Modal>
    </>
  );
}