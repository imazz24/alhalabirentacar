"use client";

import { Check } from "lucide-react";

export interface PaintOption {
  name: string;
  hex: string;
}

/** Exterior paints offered by the configurator. */
export const PAINT_OPTIONS: PaintOption[] = [
  { name: "Pearl White", hex: "#eef1f5" },
  { name: "Glacier Silver", hex: "#c2c8d0" },
  { name: "Graphite", hex: "#454b52" },
  { name: "Matte Black", hex: "#1b1e23" },
  { name: "Deep Navy", hex: "#1c2b52" },
  { name: "Midnight Blue", hex: "#2743cc" },
  { name: "Cherry Red", hex: "#a01524" },
  { name: "Emerald", hex: "#1e4d3b" },
  { name: "Champagne Gold", hex: "#c7a45c" },
  { name: "Sunset Orange", hex: "#e2601a" },
];

/** Swatches that need a dark tick instead of a white one. */
function needsDarkTick(hex: string): boolean {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}

export function PaintSwatch({
  option,
  selected,
  onSelect,
}: {
  option: PaintOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={option.name}
      aria-label={`Choose paint ${option.name}`}
      aria-pressed={selected}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
        selected
          ? "scale-110 border-white ring-2 ring-accent ring-offset-2 ring-offset-white"
          : "border-line hover:scale-105"
      }`}
      style={{ backgroundColor: option.hex }}
    >
      {selected && <Check className="h-4 w-4" style={{ color: needsDarkTick(option.hex) ? "#0b1220" : "#ffffff" }} />}
    </button>
  );
}
