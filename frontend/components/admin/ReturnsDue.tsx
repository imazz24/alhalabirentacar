"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Loader2, MessageCircle } from "lucide-react";
import type { Booking } from "@/types";
import { adminDueReturns } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const REFRESH_MS = 120000;

/** "in 5h", "in 2 days", "3h overdue" — the operator's unit, not a timestamp. */
function describeDue(iso: string, t: (key: string, vars?: Record<string, string | number>) => string): { text: string; overdue: boolean } {
  const due = new Date(iso).getTime();
  const diffMinutes = Math.round((due - Date.now()) / 60000);
  const overdue = diffMinutes < 0;
  const minutes = Math.abs(diffMinutes);

  let amount: string;
  if (minutes < 60) amount = `${minutes} min`;
  else if (minutes < 60 * 36) amount = `${Math.round(minutes / 60)}h`;
  else amount = `${Math.round(minutes / (60 * 24))} days`;

  return { text: overdue ? t("admin.returns.overdueBy", { amount }) : t("admin.returns.dueIn", { amount }), overdue };
}

/**
 * Cars that are out with a customer and due back. Overdue rentals sit at the
 * top in red — this is the list the operator works down every morning.
 */
export default function ReturnsDue() {
  const { t, locale } = useI18n();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getAdminToken();
    if (!token) return;
    try {
      setBookings(await adminDueReturns(72, token));
    } catch {
      // The dashboard stays usable even if this panel cannot refresh.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const overdue = bookings.filter((booking) => new Date(booking.return_datetime).getTime() < Date.now());

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink">
          <CalendarClock className="h-4 w-4 text-accent" /> {t("admin.returns.title")}
        </h2>
        {overdue.length > 0 && (
          <span className="badge bg-red-500/12 text-red-400 ring-1 ring-red-500/30">
            <AlertTriangle className="h-3 w-3" /> {t("admin.returns.overdue", { count: overdue.length })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : bookings.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          {t("admin.returns.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {bookings.map((booking) => {
            const due = describeDue(booking.return_datetime, t);
            const reminder = `https://wa.me/${booking.customer_phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
              t("admin.returns.reminderText", {
                name: booking.customer_full_name,
                car: booking.car_name,
                date: formatDateTime(booking.return_datetime, locale),
                place: booking.return_location_name,
              }),
            )}`;

            return (
              <li key={booking.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/bookings/${booking.id}`}
                    className="truncate font-semibold text-ink transition hover:text-accent"
                  >
                    {booking.customer_full_name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">
                    {booking.car_name} ··· {formatDateTime(booking.return_datetime, locale)} ··· {booking.return_location_name}
                  </p>
                </div>

                <span
                  className={`badge ${
                    due.overdue
                      ? "bg-red-500/12 text-red-400 ring-1 ring-red-500/30"
                      : "bg-amber-500/12 text-amber-400 ring-1 ring-amber-500/30"
                  }`}
                >
                  {due.text}
                </span>

                <a
                  href={reminder}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t("admin.returns.remindTitle")}
                  className="btn-outline shrink-0 px-3! py-1.5! text-xs"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> {t("admin.returns.remind")}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
