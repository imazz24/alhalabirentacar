"use client";

import { useI18n } from "@/lib/i18n";
import type { CarStatus, BookingStatus } from "@/types";

const CAR_STATUS_STYLES: Record<CarStatus, string> = {
  AVAILABLE: "bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/30",
  RESERVED: "bg-amber-500/12 text-amber-400 ring-1 ring-amber-500/30",
  RENTED: "bg-sky-500/12 text-sky-400 ring-1 ring-sky-500/30",
  MAINTENANCE: "bg-orange-500/12 text-orange-400 ring-1 ring-orange-500/30",
  INACTIVE: "bg-white/5 text-slate-400 ring-1 ring-line",
};

const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-amber-500/12 text-amber-400 ring-1 ring-amber-500/30",
  CONFIRMED: "bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/30",
  RESERVED: "bg-sky-500/12 text-sky-400 ring-1 ring-sky-500/30",
  ACTIVE: "bg-violet-500/12 text-violet-400 ring-1 ring-violet-500/30",
  COMPLETED: "bg-white/5 text-slate-400 ring-1 ring-line",
  CANCELLED: "bg-red-500/12 text-red-400 ring-1 ring-red-500/30",
  REJECTED: "bg-rose-500/12 text-rose-400 ring-1 ring-rose-500/30",
};

export function CarStatusBadge({ status }: { status: CarStatus }) {
  const { t } = useI18n();
  return (
    <span className={`badge ${CAR_STATUS_STYLES[status] ?? CAR_STATUS_STYLES.INACTIVE}`}>
      {t(`status.${status.toLowerCase()}`)}
    </span>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useI18n();
  return (
    <span className={`badge ${BOOKING_STATUS_STYLES[status] ?? BOOKING_STATUS_STYLES.PENDING}`}>
      {t(`status.${status.toLowerCase()}`)}
    </span>
  );
}
