"use client";

import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { RentalReportData, ReportAdditionalDriver } from "@/types";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

const DRIVERS_BLANK: ReportAdditionalDriver = {
  driver_name: "",
  license_no: "",
  expiry_date: "",
  issue_date: "",
  issue_place: "",
};

export const defaultReportData: RentalReportData = {
  date: new Date().toISOString().slice(0, 10),
  rental_type: "SelfService",
  guarantee_name: "",
  renter: {
    renters_name: "",
    mothers_name: "",
    fathers_name: "",
    nationality: "",
    birth_date: "",
    birth_place: "",
    phone: "",
    local_address: "",
    driving_license_no: "",
    license_issue_date: "",
    license_issue_place: "",
    license_expiry_date: "",
  },
  additional_drivers: [],
  vehicle: {
    plate_no: "",
    model: "",
    car_type: "",
    color: "",
    manufacture_year: "",
    frame_no: "",
    engine_no: "",
  },
  delivery: {
    in: { desc: "IN", km: "", date: "", time: "" },
    out: { desc: "OUT", km: "", date: "", time: "" },
  },
  charges: {
    days: "",
    rent_per_day: "",
    total_rent: "",
    vat: "15",
    total: "",
    prepayment: "",
    balance: "",
    deposit: "",
    payment_method: "Cash",
  },
  signatures: { renter_signature: "", company_signature: "" },
};

function updateNested<T>(obj: T, path: (string | number)[], value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  const base = obj as Record<string, unknown>;
  return { ...base, [head]: updateNested((base[head as string] as Record<string, unknown>) ?? (typeof rest[0] === "number" ? [] : {}), rest, value) } as T;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="label">{children}</label>;
}

function Input({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  className,
  type = "text",
}: {
  value: string;
  onChange?: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: string;
}) {
  return (
    <input
      className={`input bg-transparent ${className ?? ""}`}
      type={type}
      value={value}
      onChange={onchange.bind(null)}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
  function onchange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange?.(e.target.value);
  }
}

function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <select className="input bg-transparent" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export default function ReportForm({
  initialData,
  onSubmit,
  submitting = false,
}: {
  initialData?: RentalReportData | null;
  onSubmit: (data: RentalReportData) => Promise<void>;
  submitting?: boolean;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<RentalReportData>(() => initialData ?? { ...defaultReportData });
  const [drivers, setDrivers] = useState<ReportAdditionalDriver[]>(initialData?.additional_drivers ?? []);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function setField(path: (string | number)[], value: string) {
    setData((prev) => updateNested(prev, path, value));
    setError(null);
    setSuccess(false);
  }

  function recalcCharges() {
    setData((prev) => {
      const ch = prev.charges;
      const days = parseFloat(ch.days) || 0;
      const rentPerDay = parseFloat(ch.rent_per_day) || 0;
      const vatPercent = parseFloat(ch.vat) || 0;
      const prepayment = parseFloat(ch.prepayment) || 0;
      const totalRent = +(days * rentPerDay).toFixed(2);
      const vat = +(totalRent * vatPercent / 100).toFixed(2);
      const total = +(totalRent + vat).toFixed(2);
      const balance = +(total - prepayment).toFixed(2);
      return {
        ...prev,
        charges: {
          ...ch,
          total_rent: totalRent ? String(totalRent) : "",
          vat: vat ? String(vat) : "",
          total: total ? String(total) : "",
          balance: total ? String(balance) : "",
        },
      };
    });
  }

  function addDriver() {
    setDrivers((prev) => [...prev, { ...DRIVERS_BLANK }]);
  }
  function removeDriver(i: number) {
    setDrivers((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateDriver(i: number, field: keyof ReportAdditionalDriver, value: string) {
    setDrivers((prev) => prev.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));
  }

  async function handleSubmit() {
    try {
      setError(null);
      await onSubmit({ ...data, additional_drivers: drivers });
      setSuccess(true);
    } catch (err) {
      showErrorToast(err);
      setError(err instanceof Error ? err.message : t("admin.reports.required"));
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
          {t("admin.reports.saved")}
        </div>
      )}

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">Agreement</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Agreement Date</Label>
            <Input type="date" value={data.date} onChange={(v) => setField(["date"], v)} />
          </div>
          <div>
            <Label>Rental Type</Label>
            <div className="flex flex-wrap gap-6 pt-2">
              {["SelfService", "WithDriver"].map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="radio"
                    className="h-4 w-4 accent-accent"
                    checked={data.rental_type === type}
                    onChange={() => setField(["rental_type"], type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Guarantee Name</Label>
            <Input value={data.guarantee_name} onChange={(v) => setField(["guarantee_name"], v)} placeholder="N/A" />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">Renter</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Mothers Name</Label>
            <Input value={data.renter.mothers_name} onChange={(v) => setField(["renter", "mothers_name"], v)} />
          </div>
          <div>
            <Label>Fathers Name</Label>
            <Input value={data.renter.fathers_name} onChange={(v) => setField(["renter", "fathers_name"], v)} />
          </div>
          <div>
            <Label>Renters Name</Label>
            <Input value={data.renter.renters_name} onChange={(v) => setField(["renter", "renters_name"], v)} />
          </div>
          <div>
            <Label>Nationality</Label>
            <Input value={data.renter.nationality} onChange={(v) => setField(["renter", "nationality"], v)} />
          </div>
          <div>
            <Label>Date of Birth</Label>
            <Input type="date" value={data.renter.birth_date} onChange={(v) => setField(["renter", "birth_date"], v)} />
          </div>
          <div>
            <Label>Place of Birth</Label>
            <Input value={data.renter.birth_place} onChange={(v) => setField(["renter", "birth_place"], v)} />
          </div>
          <div>
            <Label>Phone No.</Label>
            <Input value={data.renter.phone} onChange={(v) => setField(["renter", "phone"], v)} placeholder="+961…" />
          </div>
          <div>
            <Label>Local Address</Label>
            <Input value={data.renter.local_address} onChange={(v) => setField(["renter", "local_address"], v)} />
          </div>
          <div>
            <Label>Driving License No.</Label>
            <Input value={data.renter.driving_license_no} onChange={(v) => setField(["renter", "driving_license_no"], v)} />
          </div>
          <div>
            <Label>License Issue Place</Label>
            <Input value={data.renter.license_issue_place} onChange={(v) => setField(["renter", "license_issue_place"], v)} />
          </div>
          <div>
            <Label>License Issue Date</Label>
            <Input type="date" value={data.renter.license_issue_date} onChange={(v) => setField(["renter", "license_issue_date"], v)} />
          </div>
          <div>
            <Label>License Expiry Date</Label>
            <Input type="date" value={data.renter.license_expiry_date} onChange={(v) => setField(["renter", "license_expiry_date"], v)} />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink">Additional Drivers</h2>
          <button type="button" onClick={addDriver} className="btn-outline px-3 py-1.5 text-xs">
            <Plus className="mr-1 inline h-3.5 w-3.5" /> Add Driver
          </button>
        </div>
        {drivers.length === 0 && <p className="text-sm text-slate-500">No additional drivers</p>}
        <div className="space-y-5">
          {drivers.map((d, i) => (
<div key={i} className="relative grid gap-5 rounded-xl border border-line bg-surface/50 p-4 sm:grid-cols-6">
              <button
                type="button"
                onClick={() => removeDriver(i)}
                className="absolute right-3 top-3 text-slate-400 hover:text-red-500"
                aria-label="Remove driver"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="sm:col-span-2">
                <Label>Driver Name</Label>
                <Input value={d.driver_name} onChange={(v) => updateDriver(i, "driver_name", v)} />
              </div>
              <div>
                <Label>DL No.</Label>
                <Input value={d.license_no} onChange={(v) => updateDriver(i, "license_no", v)} />
              </div>
              <div>
                <Label>Issue Place</Label>
                <Input value={d.issue_place} onChange={(v) => updateDriver(i, "issue_place", v)} />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={d.expiry_date} onChange={(v) => updateDriver(i, "expiry_date", v)} />
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={d.issue_date} onChange={(v) => updateDriver(i, "issue_date", v)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">Vehicle</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <Label>Plate No.</Label>
            <Input value={data.vehicle.plate_no} onChange={(v) => setField(["vehicle", "plate_no"], v)} />
          </div>
          <div>
            <Label>Model</Label>
            <Input value={data.vehicle.model} onChange={(v) => setField(["vehicle", "model"], v)} />
          </div>
          <div>
            <Label>Car Type</Label>
            <Input value={data.vehicle.car_type} onChange={(v) => setField(["vehicle", "car_type"], v)} />
          </div>
          <div>
            <Label>Color</Label>
            <Input value={data.vehicle.color} onChange={(v) => setField(["vehicle", "color"], v)} />
          </div>
          <div>
            <Label>Manufacture Year</Label>
            <Input value={data.vehicle.manufacture_year} onChange={(v) => setField(["vehicle", "manufacture_year"], v)} />
          </div>
          <div>
            <Label>Frame No.</Label>
            <Input value={data.vehicle.frame_no} onChange={(v) => setField(["vehicle", "frame_no"], v)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Engine No.</Label>
            <Input value={data.vehicle.engine_no} onChange={(v) => setField(["vehicle", "engine_no"], v)} />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">Rental Conditions – Delivery</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border border-line text-sm">
            <thead className="bg-surface-2/50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="border border-line px-3 py-2 text-left"></th>
                <th className="border border-line px-3 py-2 text-left">Km</th>
                <th className="border border-line px-3 py-2 text-left">Date</th>
                <th className="border border-line px-3 py-2 text-left">Time</th>
                <th className="border border-line px-3 py-2 text-left">Delivery</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-line px-3 py-2 font-semibold text-ink">IN</td>
                <td className="border border-line p-0"><Input className="border-0! ring-0!" value={data.delivery.in.km} onChange={(v) => setField(["delivery", "in", "km"], v)} /></td>
                <td className="border border-line p-0"><Input type="date" className="border-0! ring-0!" value={data.delivery.in.date} onChange={(v) => setField(["delivery", "in", "date"], v)} /></td>
                <td className="border border-line p-0"><Input className="border-0! ring-0!" value={data.delivery.in.time} onChange={(v) => setField(["delivery", "in", "time"], v)} placeholder="HH:MM" /></td>
                <td className="border border-line p-0"><Input className="border-0! ring-0!" value={data.delivery.in.desc} onChange={(v) => setField(["delivery", "in", "desc"], v)} /></td>
              </tr>
              <tr>
                <td className="border border-line px-3 py-2 font-semibold text-ink">OUT</td>
                <td className="border border-line p-0"><Input className="border-0! ring-0!" value={data.delivery.out.km} onChange={(v) => setField(["delivery", "out", "km"], v)} /></td>
                <td className="border border-line p-0"><Input type="date" className="border-0! ring-0!" value={data.delivery.out.date} onChange={(v) => setField(["delivery", "out", "date"], v)} /></td>
                <td className="border border-line p-0"><Input className="border-0! ring-0!" value={data.delivery.out.time} onChange={(v) => setField(["delivery", "out", "time"], v)} placeholder="HH:MM" /></td>
                <td className="border border-line p-0"><Input className="border-0! ring-0!" value={data.delivery.out.desc} onChange={(v) => setField(["delivery", "out", "desc"], v)} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">Charges</h2>
        <div className="grid gap-5 sm:grid-cols-4">
          <div>
            <Label>No. of Days</Label>
            <Input value={data.charges.days} onChange={(v) => setField(["charges", "days"], v)} onBlur={recalcCharges} />
          </div>
          <div>
            <Label>Rent / Day ($)</Label>
            <Input value={data.charges.rent_per_day} onChange={(v) => setField(["charges", "rent_per_day"], v)} onBlur={recalcCharges} />
          </div>
          <div>
            <Label>Total Rent ($)</Label>
            <Input value={data.charges.total_rent} onChange={(v) => setField(["charges", "total_rent"], v)} />
          </div>
          <div>
            <Label>VAT %</Label>
            <Input value={data.charges.vat} onChange={(v) => setField(["charges", "vat"], v)} onBlur={recalcCharges} />
          </div>
          <div>
            <Label>Total ($)</Label>
            <Input value={data.charges.total} onChange={(v) => setField(["charges", "total"], v)} />
          </div>
          <div>
            <Label>Prepayment ($)</Label>
            <Input value={data.charges.prepayment} onChange={(v) => setField(["charges", "prepayment"], v)} onBlur={recalcCharges} />
          </div>
          <div>
            <Label>Balance ($)</Label>
            <Input value={data.charges.balance} onChange={(v) => setField(["charges", "balance"], v)} />
          </div>
          <div>
            <Label>Deposit ($)</Label>
            <Input value={data.charges.deposit} onChange={(v) => setField(["charges", "deposit"], v)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Payment Method</Label>
            <Select value={data.charges.payment_method} onChange={(v) => setField(["charges", "payment_method"], v)} options={["Cash", "Card", "Bank Transfer", "Other"]} />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-ink">Signatures</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Renter Signature</Label>
            <Input value={data.signatures.renter_signature} onChange={(v) => setField(["signatures", "renter_signature"], v)} placeholder="Renter name / signature" />
          </div>
          <div>
            <Label>Company Signature</Label>
            <Input value={data.signatures.company_signature} onChange={(v) => setField(["signatures", "company_signature"], v)} placeholder="Company representative" />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-accent flex items-center gap-2 px-6 py-2.5 text-sm"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {initialData ? t("admin.reports.save") : t("admin.reports.save")}
        </button>
      </div>
    </div>
  );
}

export function ReportMetaHeader({
  reportNo,
  nr,
}: {
  reportNo: string;
  nr: string;
}) {
  return (
    <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:max-w-xl">
      <div>
        <Label>No.</Label>
        <Input value={reportNo} disabled />
      </div>
      <div>
        <Label>Nr.</Label>
        <Input value={nr} disabled />
      </div>
    </div>
  );
}
