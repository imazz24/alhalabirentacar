"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { adminListReports, adminDeleteReport } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { RentalReport } from "@/types";
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/components/ui/toast-store";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 10;

export default function AdminReportsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [reports, setReports] = useState<RentalReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchPage() {
    const token = getAdminToken();
    if (!token) return;
    try {
      const result = await adminListReports({ page, page_size: PAGE_SIZE, search: search || undefined }, token);
      setReports(result.items);
      setTotal(result.total);
    } catch (err) {
      showErrorToast(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAdminToken();
      if (!token) return;
      try {
        const result = await adminListReports({ page, page_size: PAGE_SIZE, search: search || undefined }, token);
        if (!cancelled) {
          setReports(result.items);
          setTotal(result.total);
        }
      } catch (err) {
        if (!cancelled) showErrorToast(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, search]);

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const token = getAdminToken();
    if (!token) return;
    if (!window.confirm(t("admin.reports.deleteConfirm"))) return;
    try {
      await adminDeleteReport(id, token);
      toast.success(t("admin.reports.deleted"));
      await fetchPage();
    } catch (err) {
      showErrorToast(err);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title={t("admin.titles.reports")}
        subtitle={t("admin.reports.subtitle")}
        action={
          <Link href="/admin/reports/new" className="btn-accent flex items-center gap-2 py-2.5 text-sm">
            <Plus className="h-4 w-4" />
            {t("admin.reports.new")}
          </Link>
        }
      />

      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input w-full pl-9"
            placeholder={t("admin.reports.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : reports.length === 0 ? (
        <EmptyState
          title={t("admin.reports.empty")}
          text={t("admin.reports.emptyText")}
          action={
            <Link href="/admin/reports/new" className="btn-accent py-2.5 text-sm">
              {t("admin.reports.new")}
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">No.</th>
                <th className="px-4 py-3 text-left">Nr.</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">{t("admin.reports.client")}</th>
                <th className="px-4 py-3 text-left">{t("admin.reports.phone")}</th>
                <th className="px-4 py-3 text-left">{t("admin.reports.created")}</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-line last:border-0 hover:bg-surface-2/40">
                  <td className="px-4 py-3 font-semibold text-ink">
                    <button onClick={() => router.push(`/admin/reports/${report.id}`)} className="hover:text-accent">
                      {report.report_no}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{report.nr}</td>
                  <td className="px-4 py-3 text-slate-600">{report.report_date}</td>
                  <td className="px-4 py-3 text-ink">{report.client_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{report.client_phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(report.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/admin/reports/${report.id}`)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-surface-2 hover:text-ink"
                        aria-label="View"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(report.id, e)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}