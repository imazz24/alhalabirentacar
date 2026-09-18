"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, X } from "lucide-react";
import type { Booking } from "@/types";
import { adminListBookings } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";

const POLL_MS = 20000;
const SEEN_KEY = "alhalabi-last-seen-booking";
const MUTED_KEY = "alhalabi-alert-muted";

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Two-tone chime, synthesised so there is no audio file to ship or to fail to
 * load. Browsers block audio until the page has been interacted with; the admin
 * has just signed in, so by the time a booking lands the context is unlocked.
 */
function playChime() {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  const ctx = new Ctor();

  const blip = (frequency: number, start: number, duration: number) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + start);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(ctx.currentTime + start);
    oscillator.stop(ctx.currentTime + start + duration + 0.02);
  };

  blip(880, 0, 0.18);
  blip(1320, 0.16, 0.28);
  window.setTimeout(() => ctx.close().catch(() => undefined), 1200);
}

/**
 * Watches for new rental requests and tells the operator the moment one lands:
 * a chime, a banner and a badge on the bell. The last seen booking id is kept in
 * localStorage so a refresh does not replay old alerts.
 */
export default function NewBookingAlert() {
  const { t } = useI18n();
  const [muted, setMuted] = useState(false);
  const [pending, setPending] = useState<Booking[]>([]);
  const lastSeenRef = useRef(0);
  const mutedRef = useRef(false);

  useEffect(() => {
    lastSeenRef.current = readNumber(SEEN_KEY);
    const isMuted = (() => {
      try {
        return localStorage.getItem(MUTED_KEY) === "1";
      } catch {
        return false;
      }
    })();
    mutedRef.current = isMuted;
    setMuted(isMuted);
  }, []);

  const check = useCallback(async () => {
    const token = getAdminToken();
    if (!token) return;
    try {
      const { items } = await adminListBookings({ status: "PENDING", page: 1, page_size: 5 }, token);
      const fresh = items.filter((booking) => booking.id > lastSeenRef.current);
      if (fresh.length === 0) return;

      // First poll of a brand new browser: adopt the current state silently
      // instead of announcing every request ever made.
      const firstRun = lastSeenRef.current === 0;
      lastSeenRef.current = Math.max(...items.map((booking) => booking.id));
      try {
        localStorage.setItem(SEEN_KEY, String(lastSeenRef.current));
      } catch {
        // Storage blocked: alerts will repeat after a refresh, which is harmless.
      }
      if (firstRun) return;

      setPending(fresh);
      if (!mutedRef.current) playChime();
    } catch {
      // A failed poll is not worth interrupting the operator for.
    }
  }, []);

  useEffect(() => {
    check();
    const timer = window.setInterval(check, POLL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [check]);

  function toggleMute() {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    try {
      localStorage.setItem(MUTED_KEY, next ? "1" : "0");
    } catch {
      // Nothing to do — the choice just will not persist.
    }
    if (!next) playChime(); // Confirm the sound is audible when turning it back on.
  }

  return (
    <>
      <button
        onClick={toggleMute}
        aria-label={muted ? t("admin.alert.soundOn") : t("admin.alert.soundOff")}
        title={muted ? t("admin.alert.mutedTitle") : t("admin.alert.activeTitle")}
        className="relative rounded-xl p-2 text-slate-500 transition hover:bg-surface-2 hover:text-accent"
      >
        {muted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {pending.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-primary">
            {pending.length}
          </span>
        )}
      </button>

      {pending.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-accent/40 bg-surface p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-accent">
                {pending.length === 1 ? t("admin.alert.newRequests") : t("admin.alert.newRequestsPlural", { count: pending.length })}
              </p>
              <ul className="mt-2 space-y-1.5">
                {pending.slice(0, 3).map((booking) => (
                  <li key={booking.id} className="text-xs text-slate-500">
                    <Link href={`/admin/bookings/${booking.id}`} className="font-semibold text-ink hover:text-accent">
                      {booking.customer_full_name}
                    </Link>{" "}
                    — {booking.car_name}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setPending([])}
              aria-label={t("admin.alert.dismiss")}
              className="rounded-lg p-1 text-slate-400 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Link
            href="/admin/bookings?status=PENDING"
            onClick={() => setPending([])}
            className="btn-accent mt-3 w-full py-2! text-xs"
          >
            {t("admin.alert.open")}
          </Link>
        </div>
      )}
    </>
  );
}
