"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Copy, Loader2, MapPin, MessageCircle, Share2, XCircle, Flag, Play, Ban } from "lucide-react";
import { adminGetBooking, adminUpdateBooking } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { Booking } from "@/types";
import { BookingStatusBadge } from "@/components/ui/Badges";
import { LoadingSpinner, EmptyState } from "@/components/admin/ui";
import { formatDateTime, formatPrice } from "@/lib/format";
import { toast } from "@/components/ui/toast-store";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

interface BookingDetailProps {
  params: Promise<{ id: string }>;
}

const STATUS_ACTIONS = [
  { status: "CONFIRMED", key: "admin.bookings.confirm", icon: <CheckCircle2 className="h-4 w-4" />, style: "btn bg-emerald-600! text-white! hover:bg-emerald-700!" },
  { status: "RESERVED", key: "admin.bookings.reserve", icon: <Flag className="h-4 w-4" />, style: "btn bg-blue-600! text-white! hover:bg-blue-700!" },
  { status: "ACTIVE", key: "admin.bookings.markActive", icon: <Play className="h-4 w-4" />, style: "btn bg-violet-600! text-white! hover:bg-violet-700!" },
  { status: "COMPLETED", key: "admin.bookings.complete", icon: <Flag className="h-4 w-4" />, style: "btn bg-slate-700! text-white! hover:bg-slate-800!" },
  { status: "CANCELLED", key: "admin.bookings.cancel", icon: <Ban className="h-4 w-4" />, style: "btn-outline text-red-600!" },
  { status: "REJECTED", key: "admin.bookings.reject", icon: <XCircle className="h-4 w-4" />, style: "btn-outline text-red-600!" },
];

export default function BookingDetailPage({ params }: BookingDetailProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { id } = await params;
        const token = getAdminToken();
        if (!token) {
          router.replace("/admin/login");
          return;
        }
        const data = await adminGetBooking(Number(id), token);
        if (!cancelled) {
          setBooking(data);
          setFinalPrice(data.final_price != null ? String(data.final_price) : String(data.estimated_price));
          setAdminNotes(data.admin_notes ?? "");
        }
      } catch (err) {
        showErrorToast(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  async function changeStatus(status: string) {
    const token = getAdminToken();
    if (!booking || !token) return;
    setUpdating(status);
    try {
      const updated = await adminUpdateBooking(booking.id, { status }, token);
      setBooking(updated);
      toast.success(t("admin.bookings.statusToast", { status: t(`status.${status.toLowerCase()}`) }));
    } catch (err) {
      showErrorToast(err);
    } finally {
      setUpdating(null);
    }
  }

  async function savePrice() {
    const token = getAdminToken();
    if (!booking || !token) return;
    const price = Number(finalPrice);
    if (!price || price <= 0) {
      toast.error(t("admin.bookings.priceError"));
      return;
    }
    setUpdating("price");
    try {
      const updated = await adminUpdateBooking(booking.id, { final_price: price }, token);
      setBooking(updated);
      toast.success(t("admin.bookings.priceSaved"));
    } catch (err) {
      showErrorToast(err);
    } finally {
      setUpdating(null);
    }
  }

  async function saveNotes() {
    const token = getAdminToken();
    if (!booking || !token) return;
    setUpdating("notes");
    try {
      const updated = await adminUpdateBooking(booking.id, { admin_notes: adminNotes }, token);
      setBooking(updated);
      toast.success(t("admin.bookings.notesSaved"));
    } catch (err) {
      showErrorToast(err);
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!booking) return <EmptyState title={t("errors.bookingNotFound")} />;

  const customerNumber = booking.customer_phone.replace(/[^\d]/g, "");
  const whatsappUrl = `https://wa.me/${customerNumber}?text=${encodeURIComponent(
    t("admin.bookings.whatsappText", { name: booking.customer_full_name, car: booking.car_name }),
  )}`;

  const mapLink = (latitude?: number | null, longitude?: number | null) =>
    typeof latitude === "number" && typeof longitude === "number"
      ? `\n${"https://www.google.com/maps?q="}${latitude},${longitude}`
      : "";

  // Everything a driver or a colleague needs, ready to forward to any contact.
  const shareText = [
    `🔖 ${booking.booking_reference}`,
    `🚗 ${booking.car_name}`,
    "",
    `👤 ${booking.customer_full_name}`,
    `📱 ${booking.customer_phone}`,
    booking.customer_email ? `📧 ${booking.customer_email}` : "",
    "",
    `📅 ${t("admin.bookings.pickup")}: ${formatDateTime(booking.pickup_datetime, locale)}`,
    `📍 ${booking.pickup_location_name}${mapLink(booking.pickup_latitude, booking.pickup_longitude)}`,
    "",
    `📅 ${t("admin.bookings.return")}: ${formatDateTime(booking.return_datetime, locale)}`,
    `📍 ${booking.return_location_name}${mapLink(booking.return_latitude, booking.return_longitude)}`,
    "",
    `⏱ ${t("admin.bookings.days", { days: booking.rental_days })}`,
    `💰 ${formatPrice(booking.final_price ?? booking.estimated_price, "$", locale)}`,
    booking.customer_notes ? `\n💬 ${booking.customer_notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div>
      <Link href="/admin/bookings" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> {t("admin.bookings.back")}
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-extrabold text-ink">{booking.booking_reference}</h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{t("admin.bookings.created", { when: formatDateTime(booking.created_at, locale) })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_ACTIONS.map((action) => (
            <button
              key={action.status}
              disabled={updating !== null || booking.status === action.status}
              onClick={() => changeStatus(action.status)}
              className={`${action.style} py-2! text-xs ${booking.status === action.status ? "opacity-50" : ""}`}
            >
              {updating === action.status ? <Loader2 className="h-4 w-4 animate-spin" /> : action.icon}
              {t(action.key)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left: booking info */}
        <div className="space-y-6 xl:col-span-2">
          <section className="card p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink">{t("admin.bookings.rentalDetails")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem label={t("admin.bookings.car")} value={booking.car_name} />
              <InfoItem label={t("admin.bookings.duration")} value={t("admin.bookings.days", { days: booking.rental_days })} />
              <PlaceItem
                label={t("admin.bookings.pickup")}
                when={formatDateTime(booking.pickup_datetime, locale)}
                place={booking.pickup_location_name}
                latitude={booking.pickup_latitude}
                longitude={booking.pickup_longitude}
                openOnMapLabel={t("admin.bookings.openOnMap")}
              />
              <PlaceItem
                label={t("admin.bookings.return")}
                when={formatDateTime(booking.return_datetime, locale)}
                place={booking.return_location_name}
                latitude={booking.return_latitude}
                longitude={booking.return_longitude}
                openOnMapLabel={t("admin.bookings.openOnMap")}
              />
              <InfoItem label={t("admin.bookings.estimatedPrice")} value={formatPrice(booking.estimated_price, "$", locale)} />
              <InfoItem label={t("admin.bookings.finalPrice")} value={booking.final_price != null ? formatPrice(booking.final_price, "$", locale) : t("admin.bookings.notSet")} strong />
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink">{t("admin.bookings.customerInfo")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem label={t("admin.bookings.fullName")} value={booking.customer_full_name} />
              <InfoItem label={t("admin.bookings.phone")} value={booking.customer_phone} />
              <InfoItem label={t("admin.bookings.email")} value={booking.customer_email || t("common.notProvided")} />
            </div>
            {booking.customer_notes && (
              <div className="mt-5 rounded-xl bg-accent/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-accent-dark">{t("admin.bookings.customerNotes")}</p>
                <p className="mt-1 text-sm text-slate-700">{booking.customer_notes}</p>
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink">{t("admin.bookings.adminActions")}</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label">{t("admin.bookings.finalPriceField")}</label>
                <div className="flex gap-2">
                  <input type="number" step="0.01" className="input" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} />
                  <button onClick={savePrice} disabled={updating !== null} className="btn-outline shrink-0">
                    {updating === "price" ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">{t("admin.bookings.internalNotes")}</label>
                <div className="flex gap-2">
                  <input type="text" className="input" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder={t("admin.bookings.notesPlaceholder")} />
                  <button onClick={saveNotes} disabled={updating !== null} className="btn-outline shrink-0">
                    {updating === "notes" ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
                  </button>
                </div>
              </div>
            </div>
            {booking.admin_notes && (
              <p className="mt-4 rounded-lg bg-surface p-3 text-sm text-slate-600"> {booking.admin_notes}</p>
            )}
          </section>
        </div>

        {/* Right: customer messaging */}
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink">{t("admin.bookings.contact")}</h2>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn w-full bg-emerald-500! text-white! hover:bg-emerald-600!">
              <MessageCircle className="h-4 w-4" /> {t("admin.bookings.whatsapp")}
            </a>
            <a href={`tel:${booking.customer_phone}`} className="btn-outline mt-2 w-full">
              {t("admin.bookings.call", { phone: booking.customer_phone })}
            </a>

            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent mt-2 w-full"
              title={t("admin.bookings.shareTitle")}
            >
              <Share2 className="h-4 w-4" /> {t("admin.bookings.share")}
            </a>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareText);
                  toast.success(t("admin.bookings.copied"));
                } catch {
                  toast.error(t("admin.bookings.copyFailed"));
                }
              }}
              className="btn-outline mt-2 w-full"
            >
              <Copy className="h-4 w-4" /> {t("admin.bookings.copy")}
            </button>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink">{t("admin.bookings.timeline")}</h2>
            <div className="space-y-3 text-sm">
              <TimelineRow label={t("admin.bookings.timelineCreated")} value={formatDateTime(booking.created_at, locale)} first />
              <TimelineRow label={t("admin.bookings.timelineUpdated")} value={formatDateTime(booking.updated_at, locale)} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * One end of the rental. When the spot has coordinates — an office the owner
 * placed on the map, or a pin the customer dropped — it opens straight in Maps.
 */
function PlaceItem({
  label,
  when,
  place,
  latitude,
  longitude,
  openOnMapLabel,
}: {
  label: string;
  when: string;
  place: string;
  latitude?: number | null;
  longitude?: number | null;
  openOnMapLabel: string;
}) {
  const hasPoint = typeof latitude === "number" && typeof longitude === "number";

  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-ink">
        {when} ··· {place}
      </p>
      {hasPoint && (
        <a
          href={`https://www.google.com/maps?q=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
        >
          <MapPin className="h-3.5 w-3.5" />
          {openOnMapLabel}
          <span className="font-mono font-normal text-slate-500">
            {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
          </span>
        </a>
      )}
    </div>
  );
}

function InfoItem({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-0.5 ${strong ? "text-lg font-extrabold text-accent-dark" : "font-semibold text-ink"}`}>{value}</p>
    </div>
  );
}

function TimelineRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${first ? "" : "border-t border-line pt-3"}`}>
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
