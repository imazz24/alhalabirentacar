"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { adminGetReport } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { RentalReport } from "@/types";
import { LoadingSpinner } from "@/components/admin/ui";
import { showErrorToast } from "@/lib/errors";

function V({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={`min-h-[18px] border-b border-gray-700 ${className ?? ""}`}>{children || "\u00A0"}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wide text-gray-600">{label}</div>
      <V className="text-[11px]">{value}</V>
    </div>
  );
}

export default function AdminReportPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [report, setReport] = useState<RentalReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { id } = await params;
      const token = getAdminToken();
      if (!token) {
        router.replace("/admin/login");
        return;
      }
      try {
        const data = await adminGetReport(Number(id), token);
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) showErrorToast(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  useEffect(() => {
    if (report) {
      const timer = setTimeout(() => window.print(), 350);
      return () => clearTimeout(timer);
    }
  }, [report]);

  if (loading) return <LoadingSpinner />;
  if (!report) return null;

  const d = report.data;
  const money = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n !== 0 ? `$${n.toFixed(2)}` : (v ?? "");
  };
  const vatAmount = Number.isFinite(parseFloat(d.charges.total)) && Number.isFinite(parseFloat(d.charges.total_rent))
    ? (parseFloat(d.charges.total) - parseFloat(d.charges.total_rent)).toFixed(2)
    : "";

  const chargesRows: Array<[string, string]> = [
    ["No. of Days", d.charges.days],
    ["Rent / Day", money(d.charges.rent_per_day)],
    ["Total Rent", money(d.charges.total_rent)],
    [`V.A.T (${d.charges.vat || "15"}%)`, vatAmount ? `$${vatAmount}` : ""],
    ["Total", money(d.charges.total)],
    ["Prepayment", money(d.charges.prepayment)],
    ["Balance", money(d.charges.balance)],
    ["Deposit", money(d.charges.deposit)],
    ["Payment Method", d.charges.payment_method],
  ];

  return (
    <div className="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0">
      <style>{`@media print{@page{size:A4;margin:9mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}}`}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between print:hidden">
        <Link href={`/admin/reports/${report.id}`} className="text-sm font-medium text-slate-600 hover:text-ink">
          ← Back
        </Link>
        <button onClick={() => window.print()} className="btn-accent flex items-center gap-2 py-2 text-sm">
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </button>
      </div>

      <div className="mx-auto w-full max-w-[210mm] bg-white px-10 py-8 text-black shadow-xl print:mx-0 print:max-w-none print:shadow-none">
        {/* Letterhead */}
        <div className="flex items-start justify-between border-b-4 border-[#D8AB55] pb-4">
          <div className="w-40 text-[9px] leading-tight">
            <p className="font-bold text-[#9A7B2F]">VAT Stamp</p>
            <div className="mt-1 h-10 w-24 rounded border-2 border-dashed border-[#D8AB55]" />
          </div>
          <div className="flex flex-col items-center text-center">
            <Image src="/halabilogo.jpeg" alt="Al Halabi Rent" width={90} height={70} className="h-[70px] w-auto object-contain" unoptimized />
            <h1 className="mt-1 text-lg font-extrabold uppercase tracking-wider text-black">AL HALABI RENT A CAR</h1>
            <p className="text-[11px] italic text-[#9A7B2F]">For your Leisure Rent With Pleasure</p>
          </div>
          <div className="w-40 text-right text-[9px] leading-tight text-gray-600">
            <p>Beirut-Hamra-Al Halabi Street</p>
            <p>Tel 0096170444022</p>
            <p>Fax 0096125555022</p>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-3 flex items-center gap-8 text-[11px] font-semibold">
          <p><span className="font-bold">No.</span> {report.report_no}</p>
          <p><span className="font-bold">Nr.</span> {report.nr}</p>
          <p><span className="font-bold">Date:</span> {d.date || report.report_date}</p>
        </div>

        <h2 className="mx-auto mt-4 inline-block w-full border-b-2 border-[#D8AB55] pb-1 text-center text-base font-extrabold uppercase tracking-widest text-[#9A7B2F]">
          Car Rental Agreement
        </h2>

        {/* Rental type */}
        <div className="mt-4 flex flex-wrap items-center gap-8 text-[11px]">
          <span className="font-bold">Rental Type:</span>
          <label className="flex items-center gap-1">
            <input type="radio" readOnly checked={d.rental_type === "SelfService"} className="h-3 w-3" /> SelfService
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" readOnly checked={d.rental_type === "WithDriver"} className="h-3 w-3" /> WithDriver
          </label>
          <span className="ml-auto"><span className="font-bold">Guarantee Name:</span> {d.guarantee_name || "N/A"}</span>
        </div>

        {/* RENTER */}
        <Section title="Renter">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
            <Field label="Mother's Name" value={d.renter.mothers_name} />
            <Field label="Father's Name" value={d.renter.fathers_name} />
            <Field label="Renter's Name" value={d.renter.renters_name} />
            <Field label="Nationality" value={d.renter.nationality} />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-gray-600">Date of Birth</div>
              <V className="text-[11px]">{d.renter.birth_date ? `${d.renter.birth_date} - ${d.renter.birth_place || ""}` : ""}</V>
            </div>
            <Field label="Place of Birth" value={d.renter.birth_place} />
            <Field label="Phone No." value={d.renter.phone} />
            <Field label="Local Address" value={d.renter.local_address} />
            <Field label="Driving License No." value={d.renter.driving_license_no} />
            <Field label="Expiry Date" value={d.renter.license_expiry_date} />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-gray-600">Date &amp; Place of Issue</div>
              <V className="text-[11px]">{d.renter.license_issue_date ? `${d.renter.license_issue_date} - ${d.renter.license_issue_place || ""}` : ""}</V>
            </div>
          </div>
        </Section>

        {/* Additional drivers */}
        {(d.additional_drivers ?? []).length > 0 && (
          <Section title="Additional Drivers">
            <div className="space-y-2">
              {d.additional_drivers.map((drv, i) => (
                <div key={i} className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
                  <Field label="Driver's Name" value={drv.driver_name} />
                  <Field label="Driving License No." value={drv.license_no} />
                  <Field label="Expiry Date" value={drv.expiry_date} />
                  <Field label="Date &amp; Place of Issue" value={[drv.issue_date, drv.issue_place].filter(Boolean).join(" - ")} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* VEHICLE */}
        <Section title="Vehicle">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
            <Field label="Plate No." value={d.vehicle.plate_no} />
            <Field label="Model" value={d.vehicle.model} />
            <Field label="Car Type" value={d.vehicle.car_type} />
            <Field label="Color" value={d.vehicle.color} />
            <Field label="Manufacture Year" value={d.vehicle.manufacture_year} />
            <Field label="Frame No." value={d.vehicle.frame_no} />
            <Field label="Engine No." value={d.vehicle.engine_no} />
          </div>
        </Section>

        {/* Delivery */}
        <Section title="Rental Conditions – Delivery">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#FBF3E4] text-[10px]">
                <th className="border border-black px-2 py-1 text-left">Description</th>
                <th className="border border-black px-2 py-1 text-left">Km</th>
                <th className="border border-black px-2 py-1 text-left">Date</th>
                <th className="border border-black px-2 py-1 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {[d.delivery.in, d.delivery.out].map((row, i) => (
                <tr key={i}>
                  <td className="border border-black px-2 py-1 font-bold">{row.desc || (i === 0 ? "IN" : "OUT")}</td>
                  <td className="border border-black px-2 py-1">{row.km}</td>
                  <td className="border border-black px-2 py-1">{row.date}</td>
                  <td className="border border-black px-2 py-1">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px]">Damage legend: <b>X</b> = Dent, <b>=</b> = Scratch</p>
        </Section>

        {/* Charges */}
        <Section title="Charges">
          <div className="grid grid-cols-2 gap-x-10 gap-y-1 sm:grid-cols-3">
            {chargesRows.map(([label, value], i) => (
              <div key={i} className="flex items-baseline justify-between gap-2 border-b border-dotted border-gray-400 pb-0.5">
                <span className="font-semibold text-gray-700">{label}</span>
                <span className="text-[11px]">{value}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Acceptance */}
        <p className="mt-6 text-center text-[11px] font-semibold italic">
          I accept the terms and conditions stated on this page and overleaf.
        </p>

        {/* Signatures */}
        <div className="mt-6 grid grid-cols-2 gap-10">
          <div>
            <V className="h-5 border-b-2 border-black" />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide">Signature</p>
            {d.signatures.renter_signature && <p className="text-[10px] italic">({d.signatures.renter_signature})</p>}
          </div>
          <div>
            <V className="h-5 border-b-2 border-black" />
            <p className="mt-1 text-right text-[10px] font-bold uppercase tracking-wide">Signature</p>
            {d.signatures.company_signature && <p className="text-right text-[10px] italic">({d.signatures.company_signature})</p>}
          </div>
        </div>

        <p className="mt-6 border-t-2 border-[#D8AB55] pt-2 text-center text-[10px] font-semibold text-gray-800">
          In case of accident the renter pays the sum of 85% from the car&apos;s value
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 overflow-hidden rounded border border-gray-300 text-[11px]">
      <div className="section-head flex items-center gap-2 border-b border-[#D8AB55] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-black">
        <span className="inline-block h-3 w-1 rounded-sm bg-[#D8AB55]" />
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}