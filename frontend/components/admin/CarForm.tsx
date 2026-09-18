"use client";

import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Percent } from "lucide-react";
import type { Car } from "@/types";
import { formatPrice } from "@/lib/format";
import { toast } from "@/components/ui/toast-store";
import { useI18n } from "@/lib/i18n";

const carSchema = z.object({
  brand: z.string().min(1, "admin.form.brandRequired"),
  model: z.string().min(1, "admin.form.modelRequired"),
  year: z.coerce.number().int().gte(1990).lte(2035),
  category: z.string().min(1, "admin.form.categoryRequired"),
  transmission: z.string().min(1, "admin.form.transmissionRequired"),
  fuel_type: z.string().min(1, "admin.form.fuelRequired"),
  passengers: z.coerce.number().int().gte(1).lte(20),
  doors: z.coerce.number().int().gte(1).lte(8),
  luggage_capacity: z.coerce.number().int().gte(0),
  has_air_conditioning: z.boolean(),
  daily_price: z.coerce.number().positive("admin.form.dailyRequired"),
  discount_percent: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce
      .number()
      .min(0.1, "admin.form.discountRange")
      .max(90, "admin.form.discountMax")
      .optional(),
  ),
  weekly_price: z
    .preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().positive().optional())
    .transform((v) => v ?? null),
  monthly_price: z
    .preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().positive().optional())
    .transform((v) => v ?? null),
  description: z.string().optional(),
  status: z.string().min(1, "admin.form.statusRequired"),
});

export interface CarFormValues {
  brand: string;
  model: string;
  year: number;
  category: string;
  transmission: string;
  fuel_type: string;
  passengers: number;
  doors: number;
  luggage_capacity: number;
  has_air_conditioning: boolean;
  daily_price: number;
  discount_percent: string | number | null;
  weekly_price: string | number | null;
  monthly_price: string | number | null;
  description: string;
  status: string;
}

export interface CarSubmitValues {
  brand: string;
  model: string;
  year: number;
  category: string;
  transmission: string;
  fuel_type: string;
  passengers: number;
  doors: number;
  luggage_capacity: number;
  has_air_conditioning: boolean;
  daily_price: number;
  discount_daily_price: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  description: string;
  status: string;
}

function toNumberOrNull(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const CATEGORIES = ["Economy", "Sedan", "SUV", "Luxury", "Sports", "Van"];
const TRANSMISSIONS = ["Automatic", "Manual"];
const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric"];
const STATUSES = ["AVAILABLE", "RESERVED", "RENTED", "MAINTENANCE", "INACTIVE"];

interface CarFormProps {
  initial?: Car;
  onSubmit: (values: CarSubmitValues) => Promise<void>;
  submittingLabel?: string;
}

export default function CarForm({ initial, onSubmit, submittingLabel }: CarFormProps) {
  const { t, locale } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const label = submittingLabel ?? t("common.save");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CarFormValues>({
    resolver: zodResolver(carSchema) as unknown as Resolver<CarFormValues>,
    defaultValues: initial
      ? {
          brand: initial.brand,
          model: initial.model,
          year: initial.year,
          category: initial.category,
          transmission: initial.transmission,
          fuel_type: initial.fuel_type,
          passengers: initial.passengers,
          doors: initial.doors,
          luggage_capacity: initial.luggage_capacity,
          has_air_conditioning: initial.has_air_conditioning,
          daily_price: initial.daily_price,
          discount_percent:
            initial.discount_daily_price != null &&
            initial.discount_daily_price > 0 &&
            initial.discount_daily_price < initial.daily_price
              ? String(Math.round((1 - initial.discount_daily_price / initial.daily_price) * 100))
              : "",
          weekly_price: initial.weekly_price ?? "",
          monthly_price: initial.monthly_price ?? "",
          description: initial.description ?? "",
          status: initial.status,
        }
      : {
          brand: "",
          model: "",
          year: new Date().getFullYear(),
          category: "Economy",
          transmission: "Automatic",
          fuel_type: "Petrol",
          passengers: 5,
          doors: 4,
          luggage_capacity: 2,
          has_air_conditioning: true,
          daily_price: 40,
          discount_percent: "",
          weekly_price: "",
          monthly_price: "",
          description: "",
          status: "AVAILABLE",
        },
  });

  const percentInput = useWatch({ control, name: "discount_percent" });
  const pricedDaily = useWatch({ control, name: "daily_price" });
  const watchedDaily = Number(pricedDaily) || 0;
  const watchedPercent = Number(percentInput);
  const discountResult =
    watchedDaily > 0 && Number.isFinite(watchedPercent) && watchedPercent > 0
      ? Math.round(watchedDaily * (1 - watchedPercent / 100) * 100) / 100
      : null;

  const errorStyles = (field: keyof CarFormValues) => (errors[field] ? "border-red-400!" : "");
  const fieldError = (field: keyof CarFormValues) =>
    errors[field] ? <p className="mt-1 text-xs font-medium text-red-600">{t(errors[field]?.message ?? "")}</p> : null;

  async function onSubmitForm(values: CarFormValues) {
    setSubmitting(true);
    try {
      const percent = Number(values.discount_percent) || 0;
      const discountDailyPrice =
        Number.isFinite(percent) && percent > 0
          ? Math.round(Number(values.daily_price) * (1 - percent / 100) * 100) / 100
          : null;
      await onSubmit({
        ...values,
        discount_daily_price: discountDailyPrice,
        weekly_price: toNumberOrNull(values.weekly_price),
        monthly_price: toNumberOrNull(values.monthly_price),
      });
      toast.success(t("admin.cars.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.cars.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-8">
      {/* Basics */}
      <section className="card p-6">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">{t("admin.form.carDetails")}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">{t("admin.form.brand")} *</label>
            <input className={`input ${errorStyles("brand")}`} placeholder="Toyota" {...register("brand")} />
            {fieldError("brand")}
          </div>
          <div>
            <label className="label">{t("admin.form.model")} *</label>
            <input className={`input ${errorStyles("model")}`} placeholder="Corolla" {...register("model")} />
            {fieldError("model")}
          </div>
          <div>
            <label className="label">{t("admin.form.year")} *</label>
            <input type="number" className={`input ${errorStyles("year")}`} {...register("year")} />
            {fieldError("year")}
          </div>
          <div>
            <label className="label">{t("admin.form.category")} *</label>
            <select className={`input ${errorStyles("category")}`} {...register("category")}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t("admin.form.transmission")} *</label>
            <select className={`input ${errorStyles("transmission")}`} {...register("transmission")}>
              {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t("admin.form.fuelType")} *</label>
            <select className={`input ${errorStyles("fuel_type")}`} {...register("fuel_type")}>
              {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t("admin.form.passengers")} *</label>
            <input type="number" className={`input ${errorStyles("passengers")}`} {...register("passengers")} />
            {fieldError("passengers")}
          </div>
          <div>
            <label className="label">{t("admin.form.doors")} *</label>
            <input type="number" className={`input ${errorStyles("doors")}`} {...register("doors")} />
            {fieldError("doors")}
          </div>
          <div>
            <label className="label">{t("admin.form.luggage")} *</label>
            <input type="number" className={`input ${errorStyles("luggage_capacity")}`} {...register("luggage_capacity")} />
            {fieldError("luggage_capacity")}
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="label">{t("admin.form.airCon")}</label>
            <label className="mt-2 flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-amber-500" {...register("has_air_conditioning")} />
              <span className="text-sm text-slate-700">{t("admin.form.hasAirCon")}</span>
            </label>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="card p-6">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">{t("admin.form.pricing")}</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label">{t("admin.form.dailyPrice")} *</label>
            <input type="number" step="0.01" className={`input ${errorStyles("daily_price")}`} placeholder="40" {...register("daily_price")} />
            {fieldError("daily_price")}
          </div>
          <div>
            <label className="label">{t("admin.form.discount")}</label>
            <div className="relative">
              <input
                type="number"
                min="0.1"
                max="90"
                step="0.1"
                className={`input pr-8 ${errorStyles("discount_percent")}`}
                placeholder={t("admin.form.noDiscount")}
                {...register("discount_percent")}
              />
              <Percent className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            {fieldError("discount_percent")}
            <p className="mt-1.5 text-xs text-slate-400">
              {discountResult != null && watchedDaily > 0 ? (
                t("admin.form.discountLive", {
                  percent: watchedPercent,
                  old: formatPrice(watchedDaily, "$", locale),
                  new: formatPrice(discountResult, "$", locale),
                })
              ) : (
                t("admin.form.discountStatic")
              )}
            </p>
          </div>
          <div>
            <label className="label">{t("admin.form.weeklyPrice")}</label>
            <input type="number" step="0.01" className="input" placeholder="250" {...register("weekly_price")} />
          </div>
          <div>
            <label className="label">{t("admin.form.monthlyPrice")}</label>
            <input type="number" step="0.01" className="input" placeholder="800" {...register("monthly_price")} />
          </div>
        </div>
      </section>

      {/* Description + Status */}
      <section className="card p-6">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">{t("admin.form.descriptionStatus")}</h2>
        <div className="grid gap-5">
          <div>
            <label className="label">{t("admin.form.description")}</label>
            <textarea className="input min-h-28 resize-y" placeholder={t("admin.form.descriptionPlaceholder")} {...register("description")} />
          </div>
          <div className="sm:max-w-xs">
            <label className="label">{t("admin.form.status")} *</label>
            <select className={`input ${errorStyles("status")}`} {...register("status")}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s.toLowerCase()}`)}</option>)}
            </select>
            {fieldError("status")}
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button type="submit" disabled={submitting} className="btn-primary px-8!">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
        </button>
      </div>
    </form>
  );
}