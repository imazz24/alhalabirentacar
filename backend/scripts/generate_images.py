"""Generates simple SVG placeholder images for seeded cars."""

import argparse
import re
from pathlib import Path

PAIR = [
    ("Toyota Corolla", "Sedan", "#1e3a8a"),
    ("Toyota Camry", "Sedan", "#0f766e"),
    ("Hyundai Elantra", "Economy", "#b45309"),
    ("Kia Sportage", "SUV", "#7c3aed"),
    ("Hyundai Tucson", "SUV", "#0e7490"),
    ("BMW X5", "Luxury", "#0f172a"),
    ("Audi A4", "Luxury", "#334155"),
    ("Mercedes-Benz C200", "Luxury", "#111827"),
    ("Ford Mustang", "Sports", "#9f1239"),
    ("Porsche Boxster", "Sports", "#be185d"),
    ("Toyota Hiace", "Van", "#4d7c0f"),
    ("Renault Trafic", "Van", "#a16207"),
    ("Volkswagen Golf", "Economy", "#0369a1"),
    ("Nissan Pathfinder", "SUV", "#6d28d9"),
]

CATEGORY_ICON = {
    "Sedan": "🚗",
    "Economy": "🚙",
    "SUV": "🚙",
    "Luxury": "🏎️",
    "Sports": "🏎️",
    "Van": "🚐",
}


def svg_for(name: str, category: str, color: str, variant: int) -> str:
    bg2 = color
    bg1 = "#ffffff"
    icon = CATEGORY_ICON.get(category, "🚗")
    label = re.sub(r"[^a-zA-Z0-9 ]", "", name).replace(" ", "\u00a0")
    variant_badge = f"{variant}"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg1}"/>
      <stop offset="100%" stop-color="{bg2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="750" fill="url(#g)"/>
  <circle cx="150" cy="120" r="180" fill="#ffffff" opacity="0.08"/>
  <circle cx="1050" cy="620" r="240" fill="#000000" opacity="0.06"/>
  <text x="600" y="330" font-size="220" text-anchor="middle">{icon}</text>
  <rect x="250" y="500" rx="18" width="700" height="120" fill="#ffffff" opacity="0.92"/>
  <text x="600" y="572" font-size="44" font-family="Arial, Helvetica, sans-serif" font-weight="bold" fill="#0f172a" text-anchor="middle">{label}</text>
  <text x="600" y="640" font-size="30" font-family="Arial, Helvetica, sans-serif" fill="#475569" text-anchor="middle">{category} · {variant_badge}</text>
</svg>"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="app/static/images/cars", help="output directory")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    for idx, (name, category, color) in enumerate(PAIR, start=1):
        for variant in (1, 2):
            target = out_dir / f"{category.lower()}_{idx}_{variant}.svg"
            data = svg_for(name, category, color, variant)
            target.write_text(data, encoding="utf-8")
    print(f"Generated {len(PAIR) * 2} placeholder images in {out_dir}")


if __name__ == "__main__":
    main()