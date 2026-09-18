"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, Palette, Star, Trash2, Upload } from "lucide-react";
import type { Car, CarImage } from "@/types";
import { PAINT_OPTIONS } from "@/components/site/car-paint";
import {
  adminDeleteCarImage,
  adminSetMainImage,
  adminUpdateCarImage,
  adminUploadCarImage,
} from "@/services/admin";
import { getCar, getCarsMeta } from "@/services/cars";
import { getAdminToken } from "@/lib/admin-auth";
import { toast } from "@/components/ui/toast-store";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

const FALLBACK_ANGLES = ["Front", "Front Angle", "Side", "Rear Angle", "Rear", "Top", "Interior", "Detail"];

/** "Original colour" — a photo that is not tied to one specific paint. */
const NO_COLOUR = "";

interface CarImageManagerProps {
  car: Car;
  onChange: (car: Car) => void;
}

/**
 * Photo library for one car: upload a shot per angle, and optionally tag a
 * shot with the paint colour it was taken in. The customer-facing configurator
 * shows those tagged photos directly instead of tinting the default set.
 */
export default function CarImageManager({ car, onChange }: CarImageManagerProps) {
  const { t } = useI18n();
  const [angles, setAngles] = useState<string[]>(FALLBACK_ANGLES);
  const [uploadAngle, setUploadAngle] = useState("Front Angle");
  const [uploadColour, setUploadColour] = useState(NO_COLOUR);
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [savingImageId, setSavingImageId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCarsMeta()
      .then((meta) => {
        if (!cancelled && meta.image_angles?.length) setAngles(meta.image_angles);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const images = useMemo(
    () =>
      [...car.images].sort(
        (a, b) => Number(b.is_main) - Number(a.is_main) || a.sort_order - b.sort_order,
      ),
    [car.images],
  );

  const colourOf = (hex: string) => PAINT_OPTIONS.find((option) => option.hex.toLowerCase() === hex.toLowerCase());

  async function handleUpload(file: File, isMain: boolean) {
    const token = getAdminToken();
    if (!token) return;
    const paint = uploadColour ? colourOf(uploadColour) : undefined;
    setUploading(true);
    try {
      const updated = await adminUploadCarImage(
        car.id,
        file,
        isMain,
        { angle: uploadAngle, colorName: paint?.name ?? null, colorHex: paint?.hex ?? null },
        token,
      );
      onChange(updated);
      toast.success(
        paint
          ? t("admin.images.photoAddedColour", { angle: uploadAngle, colour: paint.name })
          : t("admin.images.photoAdded", { angle: uploadAngle }),
      );
    } catch (err) {
      showErrorToast(err);
    } finally {
      setUploading(false);
      setFileInputKey((key) => key + 1);
    }
  }

  async function handleRetag(image: CarImage, payload: { angle?: string; color_hex?: string | null }) {
    const token = getAdminToken();
    if (!token) return;
    setSavingImageId(image.id);
    try {
      const colourFields =
        payload.color_hex === undefined
          ? {}
          : payload.color_hex
            ? { color_hex: payload.color_hex, color_name: colourOf(payload.color_hex)?.name ?? payload.color_hex }
            : { color_hex: null, color_name: null };
      onChange(await adminUpdateCarImage(car.id, image.id, { ...payload, ...colourFields }, token));
    } catch (err) {
      showErrorToast(err);
    } finally {
      setSavingImageId(null);
    }
  }

  async function handleDelete(imageId: number) {
    const token = getAdminToken();
    if (!token) return;
    try {
      await adminDeleteCarImage(imageId, token);
      onChange(await getCar(car.id));
      toast.success(t("admin.images.removed"));
    } catch (err) {
      showErrorToast(err);
    }
  }

  async function handleSetMain(imageId: number) {
    const token = getAdminToken();
    if (!token) return;
    try {
      onChange(await adminSetMainImage(car.id, imageId, token));
      toast.success(t("admin.images.updated"));
    } catch (err) {
      showErrorToast(err);
    }
  }

  return (
    <section className="card p-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink">{t("admin.images.photos")}</h2>
      </div>
      <p className="mb-5 text-xs text-slate-500">{t("admin.images.hint")}</p>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl bg-surface p-4">
        <div>
          <label className="label" htmlFor="upload-angle">
            {t("admin.images.angle")}
          </label>
          <select
            id="upload-angle"
            className="input"
            value={uploadAngle}
            onChange={(event) => setUploadAngle(event.target.value)}
          >
            {angles.map((angle) => (
              <option key={angle} value={angle}>
                {angle}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="upload-colour">
            {t("admin.images.colour")}
          </label>
          <select
            id="upload-colour"
            className="input"
            value={uploadColour}
            onChange={(event) => setUploadColour(event.target.value)}
          >
            <option value={NO_COLOUR}>{t("admin.images.anyColour")}</option>
            {PAINT_OPTIONS.map((option) => (
              <option key={option.hex} value={option.hex}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <label className="btn-outline cursor-pointer py-2! text-sm">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {t("admin.images.upload")}
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleUpload(file, images.length === 0);
            }}
          />
        </label>
      </div>

      {images.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">{t("admin.images.empty")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <div key={image.id} className="overflow-hidden rounded-2xl border border-line">
              <div className="relative aspect-[16/11] bg-surface">
                <Image src={image.image_url} alt={`${car.name} — ${image.angle}`} fill sizes="280px" className="object-cover" />
                <div className="absolute right-0 top-0 flex gap-1 p-2">
                  {!image.is_main && (
                    <button
                      onClick={() => handleSetMain(image.id)}
                      title={t("admin.images.setMain")}
                      className="rounded-lg bg-black/70 p-1.5 text-slate-600 shadow transition hover:text-accent-dark"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(image.id)}
                    title={t("admin.images.deletePhoto")}
                    className="rounded-lg bg-black/70 p-1.5 text-slate-600 shadow transition hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {image.is_main && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    {t("admin.images.main")}
                  </span>
                )}
                {image.color_hex && (
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-ink">
                    <span className="h-2.5 w-2.5 rounded-full border border-line" style={{ backgroundColor: image.color_hex }} />
                    {image.color_name}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 p-3">
                <select
                  className="input py-1.5! text-xs"
                  value={image.angle}
                  aria-label={t("admin.images.angle")}
                  onChange={(event) => handleRetag(image, { angle: event.target.value })}
                >
                  {angles.map((angle) => (
                    <option key={angle} value={angle}>
                      {angle}
                    </option>
                  ))}
                </select>

                <select
                  className="input py-1.5! text-xs"
                  value={image.color_hex ?? NO_COLOUR}
                  aria-label={t("admin.images.colour")}
                  onChange={(event) => handleRetag(image, { color_hex: event.target.value || null })}
                >
                  <option value={NO_COLOUR}>{t("admin.images.originalAny")}</option>
                  {PAINT_OPTIONS.map((option) => (
                    <option key={option.hex} value={option.hex}>
                      {option.name}
                    </option>
                  ))}
                </select>

                {savingImageId === image.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <Palette className="h-4 w-4 text-slate-300" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
