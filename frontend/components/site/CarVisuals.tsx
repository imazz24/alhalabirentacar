/* eslint-disable @next/next/no-img-element -- repainted photos are data URLs, which the image optimiser cannot serve. */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Camera, Check, Loader2, Palette, Sparkles } from "lucide-react";
import type { Car, CarImage } from "@/types";
import { PAINT_OPTIONS, PaintSwatch, type PaintOption } from "./car-paint";
import { useRecoloredPhotos } from "@/lib/use-recolor";
import { isValidHex } from "@/lib/recolor";
import { useI18n } from "@/lib/i18n";

/** Order the angle chips the way a customer walks around a car. */
const ANGLE_ORDER = ["Front", "Front Angle", "Side", "Rear Angle", "Rear", "Top", "Interior", "Detail"];

function sortImages(images: CarImage[]): CarImage[] {
  return [...images].sort(
    (a, b) =>
      Number(b.is_main) - Number(a.is_main) ||
      ANGLE_ORDER.indexOf(a.angle) - ANGLE_ORDER.indexOf(b.angle) ||
      a.sort_order - b.sort_order,
  );
}

function normaliseHex(hex: string): string {
  return hex.trim().toLowerCase();
}

export default function CarVisuals({ car }: { car: Car }) {
  const { t } = useI18n();
  const allImages = useMemo(() => sortImages(car.images ?? []), [car.images]);

  /** Photos the owner uploaded for one specific paint colour, keyed by hex. */
  const ownerSets = useMemo(() => {
    const sets = new Map<string, { option: PaintOption; images: CarImage[] }>();
    allImages.forEach((image) => {
      if (!image.color_hex) return;
      const hex = normaliseHex(image.color_hex);
      const entry = sets.get(hex) ?? {
        option: { name: image.color_name || hex.toUpperCase(), hex },
        images: [],
      };
      entry.images.push(image);
      sets.set(hex, entry);
    });
    return sets;
  }, [allImages]);

  /** The default photo set: whatever colour the car was actually shot in. */
  const baseImages = useMemo(() => {
    const untagged = allImages.filter((image) => !image.color_hex);
    return untagged.length > 0 ? untagged : allImages;
  }, [allImages]);

  const [selected, setSelected] = useState<PaintOption | null>(null);
  const [customHex, setCustomHex] = useState("#1c2b52");
  const [activeIndex, setActiveIndex] = useState(0);

  /** Swatch row: the company's palette plus any colour the owner has photos of. */
  const palette = useMemo(() => {
    const options = [...PAINT_OPTIONS];
    ownerSets.forEach((entry) => {
      if (!options.some((option) => normaliseHex(option.hex) === normaliseHex(entry.option.hex))) {
        options.push(entry.option);
      }
    });
    return options;
  }, [ownerSets]);

  const ownerSet = selected ? ownerSets.get(normaliseHex(selected.hex)) : undefined;
  const displayed = ownerSet?.images.length ? sortImages(ownerSet.images) : baseImages;
  const tintHex = ownerSet?.images.length || !selected ? null : selected.hex;

  const urls = useMemo(() => displayed.map((image) => image.image_url), [displayed]);
  const { painted, working, skipped } = useRecoloredPhotos(urls, tintHex);

  if (displayed.length === 0) {
    return (
      <section aria-labelledby="car-configurator-title">
        <h2 id="car-configurator-title" className="sr-only">
          {t("car.visuals.photos")}
        </h2>
        <div className="flex aspect-[16/9] items-center justify-center rounded-3xl bg-surface text-6xl">🚗</div>
      </section>
    );
  }

  const active = displayed[Math.min(activeIndex, displayed.length - 1)];
  const srcFor = (image: CarImage) => (tintHex ? painted[image.image_url] : undefined) ?? image.image_url;
  const activeIsTinted = Boolean(tintHex) && Boolean(painted[active.image_url]);
  const activeSkipped = Boolean(tintHex) && skipped.includes(active.image_url);

  function pickCustomColour(value: string) {
    if (!isValidHex(value)) return;
    const hex = value.startsWith("#") ? value : `#${value}`;
    setCustomHex(hex);
    const known = palette.find((option) => normaliseHex(option.hex) === normaliseHex(hex));
    setSelected(known ?? { name: t("car.visuals.customColour"), hex });
  }

  return (
    <section aria-labelledby="car-configurator-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="car-configurator-title" className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {t("car.visuals.title")}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">{t("car.visuals.subtitle")}</p>
        </div>

        {displayed.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {displayed.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setActiveIndex(index)}
                aria-pressed={index === activeIndex}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  index === activeIndex ? "bg-accent text-primary shadow" : "bg-surface text-slate-500 hover:text-primary"
                }`}
              >
                {image.angle}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-surface">
        <img src={srcFor(active)} alt={`${car.name} — ${active.angle}`} className="h-full w-full object-cover" />

        <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
          <Camera className="h-3.5 w-3.5" /> {active.angle}
        </span>

        {selected && (
          <span
            className="pointer-events-none absolute bottom-3 left-4 inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
            aria-live="polite"
          >
            <span className="h-3 w-3 rounded-full border border-white/60" style={{ backgroundColor: selected.hex }} />
            {selected.name}
            {ownerSet ? (
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <Check className="h-3 w-3" /> {t("car.visuals.actualPhotos")}
              </span>
            ) : activeIsTinted ? (
              <span className="text-slate-300">{t("car.visuals.colourPreview")}</span>
            ) : null}
          </span>
        )}

        {working && (
          <span className="pointer-events-none absolute bottom-3 right-4 inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("car.visuals.applying")}
          </span>
        )}
      </div>

      {displayed.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {displayed.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setActiveIndex(index)}
              aria-label={t("car.visuals.showPhoto", { angle: image.angle })}
              className={`relative aspect-[16/10] w-28 shrink-0 overflow-hidden rounded-xl transition ${
                index === activeIndex ? "ring-2 ring-accent ring-offset-2" : "opacity-70 hover:opacity-100"
              }`}
            >
              <img src={srcFor(image)} alt={`${car.name} — ${image.angle}`} className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-[10px] font-semibold text-white">
                {image.angle}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <div className="flex shrink-0 items-center gap-2">
          <Palette className="h-4 w-4 text-accent-dark" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("car.visuals.chooseColor")}</p>
            <p className="text-sm font-bold text-ink">
              {selected ? selected.name : t("car.visuals.originalColour")}
              {selected && <span className="ml-1 text-xs font-normal text-slate-400">{selected.hex}</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-pressed={selected === null}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              selected === null ? "bg-primary text-white" : "bg-surface text-slate-500 hover:text-accent"
            }`}
          >
            {t("car.visuals.original")}
          </button>

          {palette.map((option) => (
            <PaintSwatch
              key={option.hex}
              option={option}
              selected={Boolean(selected && normaliseHex(selected.hex) === normaliseHex(option.hex))}
              onSelect={() => setSelected(option)}
            />
          ))}

          <label className="flex items-center gap-2 rounded-full bg-surface px-2 py-1" title={t("car.visuals.pickAny")}>
            <input
              type="color"
              value={customHex}
              onChange={(event) => pickCustomColour(event.target.value)}
              aria-label={t("car.visuals.pickCustom")}
              className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
            <input
              type="text"
              value={customHex}
              onChange={(event) => {
                setCustomHex(event.target.value);
                pickCustomColour(event.target.value);
              }}
              aria-label={t("car.visuals.typeColourCode")}
              placeholder="#1c2b52"
              maxLength={7}
              className="w-20 bg-transparent text-xs font-semibold text-ink outline-none"
            />
          </label>
        </div>

        <Link
          href={`/booking/${car.id}${selected ? `?color=${encodeURIComponent(selected.name)}` : ""}`}
          className="btn btn-primary ml-auto shrink-0 text-sm"
        >
          <Sparkles className="h-4 w-4" /> {selected ? t("car.visuals.requestIn", { name: selected.name }) : t("car.requestThisCar")}
        </Link>
      </div>

      <p className="mt-2 px-1 text-xs text-slate-400">
        {ownerSet
          ? t("car.visuals.ownerNote")
          : activeSkipped
            ? t("car.visuals.skippedNote")
            : t("car.visuals.tintNote")}
      </p>
    </section>
  );
}
