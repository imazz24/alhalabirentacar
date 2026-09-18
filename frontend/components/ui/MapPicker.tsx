"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Minus, Plus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** Web-Mercator helpers — the same maths every slippy map uses. */
const TILE = 256;

function lonToX(lon: number, zoom: number) {
  return ((lon + 180) / 360) * Math.pow(2, zoom) * TILE;
}
function latToY(lat: number, zoom: number) {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom) * TILE
  );
}
function xToLon(x: number, zoom: number) {
  return (x / (Math.pow(2, zoom) * TILE)) * 360 - 180;
}
function yToLat(y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * y) / (Math.pow(2, zoom) * TILE);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export interface PickedPoint {
  latitude: number;
  longitude: number;
  label: string;
}

interface MapPickerProps {
  open: boolean;
  title?: string;
  /** Where to centre the map when it opens. Defaults to Beirut. */
  initial?: { latitude: number; longitude: number } | null;
  onCancel: () => void;
  onConfirm: (point: PickedPoint) => void;
}

const BEIRUT = { latitude: 33.8938, longitude: 35.5018 };
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

/**
 * A small slippy map built from OpenStreetMap raster tiles.
 *
 * The project cannot pull a mapping library from npm, and a plain map embed
 * cannot report back where someone clicked — so the tiles are laid out by hand.
 * Drag to pan, use the buttons to zoom; the crosshair in the middle is the
 * point being picked, which keeps it accurate on touch screens too.
 */
export default function MapPicker({ open, title, initial, onCancel, onConfirm }: MapPickerProps) {
  const { t } = useI18n();
  const start = initial ?? BEIRUT;
  const [zoom, setZoom] = useState(14);
  const [centre, setCentre] = useState(start);
  const [label, setLabel] = useState("");
  const [locating, setLocating] = useState(false);
  const [size, setSize] = useState({ width: 640, height: 380 });

  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setCentre(initial ?? BEIRUT);
    setZoom(initial ? 16 : 13);
  }, [open, initial]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: frame.clientWidth, height: frame.clientHeight });
    });
    observer.observe(frame);
    setSize({ width: frame.clientWidth, height: frame.clientHeight });
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { x: event.clientX, y: event.clientY, lat: centre.latitude, lon: centre.longitude };
    },
    [centre],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      const x = lonToX(drag.lon, zoom) - dx;
      const y = latToY(drag.lat, zoom) - dy;
      setCentre({ latitude: yToLat(y, zoom), longitude: xToLon(x, zoom) });
    },
    [zoom],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCentre({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setZoom(16);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  if (!open) return null;

  // Which tiles cover the viewport, given the centre.
  const scale = Math.pow(2, zoom);
  const centreX = lonToX(centre.longitude, zoom);
  const centreY = latToY(centre.latitude, zoom);
  const left = centreX - size.width / 2;
  const top = centreY - size.height / 2;
  const firstCol = Math.floor(left / TILE);
  const firstRow = Math.floor(top / TILE);
  const cols = Math.ceil(size.width / TILE) + 1;
  const rows = Math.ceil(size.height / TILE) + 1;

  const tiles: { key: string; src: string; x: number; y: number }[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tileX = firstCol + col;
      const tileY = firstRow + row;
      if (tileY < 0 || tileY >= scale) continue;
      const wrappedX = ((tileX % scale) + scale) % scale;
      tiles.push({
        key: `${zoom}/${tileX}/${tileY}`,
        src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
        x: tileX * TILE - left,
        y: tileY * TILE - top,
      });
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink">
            <MapPin className="h-4 w-4 text-accent" /> {title ?? t("admin.map.pickTitle")}
          </h2>
          <button onClick={onCancel} aria-label={t("admin.map.close")} className="rounded-lg p-1.5 text-slate-400 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative h-[380px] w-full cursor-grab touch-none overflow-hidden bg-surface-2 active:cursor-grabbing"
        >
          {tiles.map((tile) => (
            // eslint-disable-next-line @next/next/no-img-element -- map tiles are external and unoptimisable
            <img
              key={tile.key}
              src={tile.src}
              alt=""
              draggable={false}
              width={TILE}
              height={TILE}
              className="pointer-events-none absolute select-none"
              style={{ left: tile.x, top: tile.y }}
            />
          ))}

          {/* Crosshair: whatever sits under it is the chosen point. */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
            <MapPin className="h-9 w-9 drop-shadow-lg" style={{ color: "#d8ab55" }} strokeWidth={2.5} />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70" />

          <div className="absolute right-3 top-3 flex flex-col gap-1.5">
            <button
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
              aria-label={t("admin.map.zoomIn")}
              className="rounded-lg bg-black/70 p-2 text-white backdrop-blur transition hover:bg-black/85"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
              aria-label={t("admin.map.zoomOut")}
              className="rounded-lg bg-black/70 p-2 text-white backdrop-blur transition hover:bg-black/85"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={locate}
              aria-label={t("admin.map.locate")}
              className="rounded-lg bg-black/70 p-2 text-white backdrop-blur transition hover:bg-black/85"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            </button>
          </div>

          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
            ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              OpenStreetMap
            </a>{" "}
            contributors
          </span>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div>
            <label className="label" htmlFor="map-label">
              {t("admin.map.nameSpot")}
            </label>
            <input
              id="map-label"
              className="input"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={t("admin.map.namePlaceholder")}
              maxLength={120}
            />
          </div>

          <p className="text-xs text-slate-400">
            {t("admin.map.coords", {
              lat: centre.latitude.toFixed(5),
              lon: centre.longitude.toFixed(5),
            })}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={() =>
                onConfirm({ latitude: centre.latitude, longitude: centre.longitude, label: label.trim() })
              }
              className="btn-accent flex-1"
            >
              {t("admin.map.confirm")}
            </button>
            <button onClick={onCancel} className="btn-outline flex-1">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
