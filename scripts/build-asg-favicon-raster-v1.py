#!/usr/bin/env python3
"""Regenerate existing PNG/ICO fallback icons from canonical gold ASG SVG.

Requires: python -m pip install cairosvg pillow
Default is a read-only comparison. --write updates only listed icon assets.
Run after updating apps/shared/brand/favicon.svg.
"""
import argparse
import io
from pathlib import Path

try:
    import cairosvg
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Missing dependency: python -m pip install cairosvg pillow") from exc

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "apps/shared/brand/favicon.svg"
PWA_SOURCE = ROOT / "apps/portal/assets/app-icon-192.svg"


def png(data, size):
    data = cairosvg.svg2png(bytestring=data, output_width=size, output_height=size)
    image = Image.open(io.BytesIO(data)).convert("RGBA")
    result = io.BytesIO()
    image.save(result, format="PNG", optimize=True)
    return result.getvalue()


def ico(data):
    image = Image.open(io.BytesIO(png(data, 64)))
    stream = io.BytesIO()
    image.save(stream, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    return stream.getvalue()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="write canonical generated binary assets")
    args = parser.parse_args()
    svg = SOURCE.read_bytes()
    pwa = PWA_SOURCE.read_bytes()
    favicon = ico(svg)
    targets = {
        "apps/portal/favicon.ico": favicon,
        "apps/portal/assets/favicon.ico": favicon,
        "apps/portal/app/icons/favicon.ico": favicon,
        "apps/legacy-portal/favicon.ico": favicon,
        "apps/portal/app/icons/favicon-16.png": png(svg, 16),
        "apps/portal/app/icons/favicon-32.png": png(svg, 32),
        "apps/portal/app/icons/favicon-48.png": png(svg, 48),
        "apps/portal/app/icons/apple-touch-icon.png": png(pwa, 180),
        "apps/portal/app/icons/icon-192.png": png(pwa, 192),
        "apps/portal/app/icons/icon-512.png": png(pwa, 512),
        "apps/portal/app/icons/icon-maskable-192.png": png(pwa, 192),
        "apps/portal/app/icons/icon-maskable-512.png": png(pwa, 512),
    }
    mismatches = []
    for rel, payload in targets.items():
        dest = ROOT / rel
        if not dest.exists() or dest.read_bytes() != payload:
            mismatches.append(rel)
            if args.write:
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(payload)
    print(f"ASG golden favicon raster assets: {len(targets)} total, {len(mismatches)} changed")
    for rel in mismatches:
        print("  " + rel)
    if not args.write and mismatches:
        raise SystemExit("Raster fallback assets differ from canonical SVG; run --write and commit the binary diff.")


if __name__ == "__main__":
    main()
