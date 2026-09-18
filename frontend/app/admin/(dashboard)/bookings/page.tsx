"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Search } from "lucide-react";
import { adminListBookings } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { Booking } from "@/types";
import { BookingStatusBadge } from "@/components/ui/Badges";
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from "@/components/admin/ui";
import { formatDateTime, formatPrice } from "@/lib/format";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ["PENDING", "CONFIRMED", "RESERVED", "ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"];

export default function AdminBookingsPage() {
  const { t, locale } = useI18n();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    adminListBookings({ page, page_size: PAGE_SIZE, search, status: statusFilter }, token)
      .then((result) => {
        setBookings(result.items);
        setTotal(result.total);
      })
      .catch(showErrorToast)
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title={t("admin.bookings.title")} subtitle={total === 1 ? t("admin.bookings.count", { total }) : t("admin.bookings.countPlural", { total })} />

      <div className="card mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10!"
              placeholder={t("admin.bookings.searchPlaceholder")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">{t("status.allStatuses")}</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{t(`status.${status.toLowerCase()}`)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : bookings.length === 0 ? (
        <EmptyState title={t("errors.emptyBookings")} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">{t("admin.bookings.colReference")}</th>
                  <th className="px-5 py-3.5">{t("admin.bookings.colCustomer")}</th>
                  <th className="px-5 py-3.5">{t("admin.bookings.colCar")}</th>
                  <th className="px-5 py-3.5">{t("admin.bookings.colPickup")}</th>
                  <th className="px-5 py-3.5">{t("admin.bookings.colReturn")}</th>
                  <th className="px-5 py-3.5">{t("admin.bookings.colPrice")}</th>
                  <th className="px-5 py-3.5">{t("admin.bookings.colStatus")}</th>
                  <th className="px-5 py-3.5 text-right">{t("admin.bookings.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-surface-2/60">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-ink">{booking.booking_reference}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-ink">{booking.customer_full_name}</p>
                      <p className="text-xs text-slate-500">{booking.customer_phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{booking.car_name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDateTime(booking.pickup_datetime, locale)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDateTime(booking.return_datetime, locale)}</td>
                    <td className="px-5 py-3.5 font-semibold text-ink">{formatPrice(booking.final_price ?? booking.estimated_price, "$", locale)}</td>
                    <td className="px-5 py-3.5"><BookingStatusBadge status={booking.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end">
                        <Link href={`/admin/bookings/${booking.id}`} className="rounded-lg p-2 text-slate-500 transition hover:bg-primary/5 hover:text-accent" title={t("admin.bookings.viewDetails")}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
