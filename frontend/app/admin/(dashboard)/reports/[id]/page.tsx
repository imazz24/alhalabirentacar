"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileDown, Loader2, MessageCircle, Trash2 } from "lucide-react";
import { adminGetReport, adminUpdateReport, adminDeleteReport } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { RentalReport, RentalReportData } from "@/types";
import { LoadingSpinner } from "@/components/admin/ui";
import ReportForm, { ReportMetaHeader } from "@/components/admin/ReportForm";
import { toast } from "@/components/ui/toast-store";
import { showErrorToast } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function AdminReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useI18n();
  const router = useRouter();
  const [report, setReport] = useState<RentalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const phone = report?.data.renter.phone || report?.client_phone || "";
  const whatsappDigits = phone.replace(/[^\d]/g, "");

  function handleWhatsApp() {
    if (!whatsappDigits) {
      toast.error(t("admin.reports.whatsappNoNumber"));
      return;
    }
    const renterName = report?.data.renter.renters_name || report?.client_name || "";
    const total = report?.data.charges.total || "";
    const msg = `Hello${renterName ? " " + renterName : ""}, here is your car rental agreement (${report?.report_no}) from Al Halabi Rent A Car. Total: $${total}.`;
    const url = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSave(data: RentalReportData) {
    const token = getAdminToken();
    if (!report || !token) return;
    setSaving(true);
    try {
      const updated = await adminUpdateReport(
        report.id,
        {
          report_date: data.date,
          client_name: data.renter.renters_name,
          client_phone: data.renter.phone,
          data,
        },
        token,
      );
      setReport(updated);
      toast.success(t("admin.reports.saved"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const token = getAdminToken();
    if (!report || !token) return;
    if (!window.confirm(t("admin.reports.deleteConfirm"))) return;
    setDeleting(true);
    try {
      await adminDeleteReport(report.id, token);
      toast.success(t("admin.reports.deleted"));
      router.replace("/admin/reports");
    } catch (err) {
      showErrorToast(err);
      setDeleting(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!report) return null;

  return (
    <div>
      <Link href="/admin/reports" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        {t("admin.reports.back")}
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">
            {t("admin.titles.reportDetail")} · {report.report_no}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("admin.reports.created")}: {formatDateTime(report.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.open(`/admin/print/${report.id}`, "_blank", "noopener,noreferrer")}
            className="btn-outline flex items-center gap-2 py-2 text-sm"
          >
            <FileDown className="h-4 w-4" />
            {t("admin.reports.exportPdf")}
          </button>
          <button onClick={handleWhatsApp} className="btn-outline flex items-center gap-2 py-2 text-sm text-emerald-700! dark:text-emerald-400!">
            <MessageCircle className="h-4 w-4" />
            {t("admin.reports.sendWhatsApp")}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn-outline flex items-center gap-2 py-2 text-sm text-red-600!">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {t("admin.reports.delete")}
          </button>
        </div>
      </div>

      <ReportMetaHeader reportNo={report.report_no} nr={report.nr} />

      <ReportForm initialData={report.data} onSubmit={handleSave} submitting={saving} />
    </div>
  );
}