"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadImage, recolorCarPhoto } from "./recolor";

/** Repainted photos are expensive to produce and never change, so keep them. */
const cache = new Map<string, string>();
/** Photos whose body could not be isolated — shown untouched, never retried. */
const rejected = new Set<string>();

interface RunResult {
  hex: string | null;
  painted: Record<string, string>;
  skipped: string[];
}

export interface RecolorState {
  /** Original photo URL -> repainted data URL, for the colour asked for. */
  painted: Record<string, string>;
  /** True while photos are still being processed. */
  working: boolean;
  /** Photos that could not be repainted (shown as-is). */
  skipped: string[];
}

const EMPTY: Record<string, string> = {};
const NONE: string[] = [];

/**
 * Repaints a set of photos into `hex`, one at a time so the first (visible)
 * photo appears immediately and the thumbnails catch up. Pass `hex = null`
 * for the car's original colour.
 *
 * Results are keyed by the colour that produced them, so a colour change drops
 * the previous set on the next render instead of briefly showing stale paint.
 */
export function useRecoloredPhotos(urls: string[], hex: string | null): RecolorState {
  const key = urls.join("|");
  const list = useMemo(() => urls, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [result, setResult] = useState<RunResult>({ hex: null, painted: {}, skipped: [] });
  const runId = useRef(0);

  useEffect(() => {
    if (!hex) return;
    const run = ++runId.current;
    let cancelled = false;
    const done: Record<string, string> = {};
    const failed: string[] = [];

    (async () => {
      // Yield once so state only ever updates asynchronously, even for photos
      // that are already cached.
      await Promise.resolve();

      for (const url of list) {
        if (cancelled || run !== runId.current) return;

        const cached = cache.get(`${url}|${hex}`);
        if (cached) {
          done[url] = cached;
        } else if (rejected.has(url)) {
          failed.push(url);
        } else {
          try {
            const image = await loadImage(url);
            const painted = recolorCarPhoto(image, hex);
            if (painted) {
              cache.set(`${url}|${hex}`, painted);
              done[url] = painted;
            } else {
              rejected.add(url);
              failed.push(url);
            }
          } catch {
            rejected.add(url);
            failed.push(url);
          }
        }

        if (cancelled || run !== runId.current) return;
        setResult({ hex, painted: { ...done }, skipped: [...failed] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [list, hex]);

  const matches = result.hex === hex;
  const painted = matches ? result.painted : EMPTY;
  const skipped = matches ? result.skipped : NONE;
  const working = Boolean(hex) && list.some((url) => !painted[url] && !skipped.includes(url));

  return { painted, working, skipped };
}
