"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminCreateReport } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { RentalReportData } from "@/types";
import ReportForm, { defaultReportData } from "@/components/admin/ReportForm";
import { PageHeader } from "@/components/admin/ui";
import { useI18n } from "@/lib/i18n";

export default function AdminReportNewPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(data: RentalReportData) {
    const token = getAdminToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    setSubmitting(true);
    try {
      const created = await adminCreateReport(
        {
          report_date: data.date,
          client_name: data.renter.renters_name,
          client_phone: data.renter.phone,
          data,
        },
        token,
      );
      router.push(`/admin/reports/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Link href="/admin/reports" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        {t("admin.reports.back")}
      </Link>

      <PageHeader title={t("admin.titles.reportNew")} subtitle={t("admin.reports.required")} />

      <ReportForm initialData={defaultReportData} onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}