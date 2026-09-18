"use client";

import { useEffect, useState } from "react";
import { BadgePercent, Gift, Loader2, Sparkles } from "lucide-react";
import type { LoyaltyAccount } from "@/types";
import { loyaltyLookup, loyaltyRedeem } from "@/services/loyalty";
import { ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast-store";
import { normalizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const REDEEM_THRESHOLD = 1000;

interface LoyaltyPanelProps {
  /** The phone number typed in the booking form — looking it up by it. */
  phone: string;
  applyDiscount: boolean;
  onApplyDiscountChange: (value: boolean) => void;
}

type LookupState =
  | { phone: string; status: "found"; account: LoyaltyAccount }
  | { phone: string; status: "new" }
  | { phone: string; status: "error" };

/**
 * Loyalty status shown under the phone field while booking. Finds the account
 * the customer earned points on, lets them spend 1,000-point chunks on 5%-off
 * vouchers, and prepays a hint that new numbers walk away with a fresh code.
 */
export default function LoyaltyPanel({ phone, applyDiscount, onApplyDiscountChange }: LoyaltyPanelProps) {
  const { t } = useI18n();
  const [lookup, setLookup] = useState<LookupState | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const validPhone = /^[+\d][\d\s-]{7,}$/.test(normalizeDigits(phone.trim()));

  useEffect(() => {
    const normalized = normalizeDigits(phone.trim());
    if (!validPhone) return;
    const timerHandle = setTimeout(async () => {
      let next: LookupState;
      try {
        const account = await loyaltyLookup(normalized);
        next = { phone: normalized, status: "found", account };
      } catch (err) {
        next =
          err instanceof ApiError && err.status === 404
            ? { phone: normalized, status: "new" }
            : { phone: normalized, status: "error" };
      }
      setLookup(next);
    }, 450);
    return () => clearTimeout(timerHandle);
  }, [phone, validPhone]);

  const active = lookup && lookup.phone === normalizeDigits(phone.trim()) ? lookup : null;
  const status = validPhone ? (active ? active.status : "loading") : "idle";
  const account = active && active.status === "found" ? active.account : null;

  async function redeem() {
    if (!account) return;
    const normalizedPhone = normalizeDigits(phone.trim());
    setRedeeming(true);
    try {
      const updated = await loyaltyRedeem(normalizedPhone);
      setLookup({ phone: normalizedPhone, status: "found", account: updated });
      onApplyDiscountChange(true);
      toast.success(t("loyalty.panel.redeemed"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("loyalty.redeemError"));
    } finally {
      setRedeeming(false);
    }
  }

  if (status === "idle") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
        <Gift className="h-3.5 w-3.5 text-accent-dark" />
        {t("loyalty.panel.idle")}
      </p>
    );
  }

  if (status === "loading") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-dark" />
        {t("loyalty.panel.checking")}
      </p>
    );
  }

  if (status === "new") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
        <Sparkles className="h-3.5 w-3.5" />
        {t("loyalty.panel.new")}
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="mt-2 text-xs text-slate-400">
        {t("loyalty.panel.unavailable")}
      </p>
    );
  }

  if (!account) return null;

  const canRedeem = account.points_balance >= REDEEM_THRESHOLD;
  const progress = Math.min(100, Math.round((account.points_balance / REDEEM_THRESHOLD) * 100));

  return (
    <div className="mt-3 rounded-2xl border border-accent/25 bg-accent/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("loyalty.title")}</p>
          <p className="mt-0.5 font-mono text-sm font-bold tracking-wider text-accent-dark">{account.loyalty_code}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold text-ink">{account.points_balance}</p>
          <p className="text-xs text-slate-500">{t("loyalty.points")}</p>
        </div>
      </div>

      {account.pending_discounts > 0 ? (
        <div className="mt-3 rounded-xl bg-primary/95 p-3 text-white">
          <p className="flex items-center gap-1.5 text-sm font-bold text-accent">
            <BadgePercent className="h-4 w-4" />{" "}
            {account.pending_discounts === 1
              ? t("loyalty.panel.voucherReady", { count: account.pending_discounts })
              : t("loyalty.panel.voucherReadyPlural", { count: account.pending_discounts })}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            {t("loyalty.panel.spendHint")}
          </p>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-white">
            <input
              type="checkbox"
              className="h-4 w-4 accent-amber-500"
              checked={applyDiscount}
              onChange={(event) => onApplyDiscountChange(event.target.checked)}
            />
            {t("loyalty.panel.apply")}
          </label>
        </div>
      ) : canRedeem ? (
        <button
          onClick={redeem}
          disabled={redeeming}
          className="btn-accent mt-3 w-full py-2.5! text-sm"
          title={t("loyalty.panel.redeemTitle")}
        >
          {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgePercent className="h-4 w-4" />}
          {t("loyalty.redeemCta")}
        </button>
      ) : (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t("loyalty.panel.cost", { threshold: REDEEM_THRESHOLD })}</span>
            <span>{account.points_balance}/{REDEEM_THRESHOLD}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}