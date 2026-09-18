"""Prepares the image assets that ship with the project.

1. Extra seed angles: each seeded car has one real stock photo
   (`<category>_<n>_1.jpg`); the configurator is built around several angles, so
   a mirrored view and a front-end crop are derived from it. They are demo
   stand-ins — a real listing gets real photos per angle, uploaded in
   Admin -> Cars -> Edit -> Car Photos.

2. Logo: trims the black padding off `logorent/halabilogo.jpeg` and writes a
   transparent PNG plus a square mark for the favicon.

Pillow is not a runtime dependency, so run this in a throwaway container:

    docker run --rm -v "<repo>:/work" python:3.12-slim \
      sh -c "pip install --quiet pillow && python /work/backend/scripts/prepare_assets.py /work"
"""

import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageOps


def build_angles(folder: Path) -> None:
    sources = sorted(folder.glob("*_1.jpg"))
    if not sources:
        print(f"! no source photos in {folder}")
        return

    for source in sources:
        stem = source.stem[: -len("_1")]
        with Image.open(source) as image:
            image = image.convert("RGB")

            ImageOps.mirror(image).save(folder / f"{stem}_side.jpg", quality=88, optimize=True)

            width, height = image.size
            crop = image.crop((int(width * 0.42), int(height * 0.24), width, int(height * 0.92)))
            ImageEnhance.Contrast(crop).enhance(1.04).save(
                folder / f"{stem}_detail.jpg", quality=88, optimize=True
            )
        print(f"  {source.name} -> {stem}_side.jpg, {stem}_detail.jpg")


def _trim_black(image: Image.Image) -> Image.Image:
    """Crops the flat black border the logo file is padded with."""
    grey = image.convert("L")
    background = Image.new("L", grey.size, 0)
    diff = ImageChops.difference(grey, background)
    box = diff.point(lambda value: 255 if value > 24 else 0).getbbox()
    return image.crop(box) if box else image


def build_logo(source: Path, public: Path) -> None:
    if not source.exists():
        print(f"! logo not found at {source}")
        return

    with Image.open(source) as image:
        logo = _trim_black(image.convert("RGB"))

        # The artwork is drawn on black; dropping that black to transparent lets
        # the logo sit on any dark surface without a visible box around it.
        rgba = logo.convert("RGBA")
        pixels = rgba.load()
        for y in range(rgba.height):
            for x in range(rgba.width):
                r, g, b, _ = pixels[x, y]
                alpha = max(r, g, b)
                # Keep the colour but make near-black fully transparent.
                pixels[x, y] = (r, g, b, 0 if alpha < 18 else min(255, int(alpha * 1.6)))

        public.mkdir(parents=True, exist_ok=True)
        wide = rgba.copy()
        wide.thumbnail((900, 320), Image.LANCZOS)
        wide.save(public / "logo.png", optimize=True)
        print(f"  logo.png {wide.size}")

        # Light-theme variant: the white half of the wordmark would disappear on
        # a white page, so the near-white pixels are darkened to near-black. The
        # gold is left exactly as it is.
        light = wide.copy()
        light_pixels = light.load()
        for y in range(light.height):
            for x in range(light.width):
                r, g, b, a = light_pixels[x, y]
                if a == 0:
                    continue
                # Gold has a strong red-over-blue bias; neutral pixels do not.
                if r - b < 40:
                    light_pixels[x, y] = (18, 18, 20, a)
        light.save(public / "logo-light.png", optimize=True)
        print(f"  logo-light.png {light.size}")

        # Square mark for the favicon / app icon: the car silhouette sits in the
        # upper half of the artwork, so centre the whole lockup on black.
        side = max(rgba.width, rgba.height)
        mark = Image.new("RGB", (side, side), (10, 10, 11))
        mark.paste(rgba, ((side - rgba.width) // 2, (side - rgba.height) // 2), rgba)
        mark = mark.resize((512, 512), Image.LANCZOS)
        mark.save(public / "logo-mark.png", optimize=True)
        icon = mark.resize((64, 64), Image.LANCZOS)
        icon.save(public / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
        print("  logo-mark.png 512x512, favicon.ico")


if __name__ == "__main__":
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    print("Seed angles:")
    build_angles(root / "backend" / "app" / "static" / "images" / "cars")
    print("Logo:")
    build_logo(root / "logorent" / "halabilogo.jpeg", root / "frontend" / "public")
