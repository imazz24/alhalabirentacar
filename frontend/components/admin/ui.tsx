import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function StatCard({ title, value, icon, accent = "bg-primary/5 text-ink" }: { title: string; value: ReactNode; icon: ReactNode; accent?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">{value}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingSpinner({ label = "common.loading" }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-ink" />
      <p className="mt-3 text-sm">{t(label)}</p>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center p-14 text-center">
      <span className="text-5xl">️</span>
      <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  const { t } = useI18n();
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2);
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="btn-outline px-3! py-2! text-sm disabled:opacity-40"
      >
        {t("common.prev")}
      </button>
      {visible.map((p, index) => (
        <span key={p} className="contents">
          {index > 0 && visible[index - 1] !== p - 1 && <span className="px-1 text-slate-400">”—¦</span>}
          <button
            onClick={() => onPageChange(p)}
            className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              p === page ? "bg-primary text-white" : "text-slate-600 hover:bg-surface-2"
            }`}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="btn-outline px-3! py-2! text-sm disabled:opacity-40"
      >
        {t("common.next")}
      </button>
    </div>
  );
}