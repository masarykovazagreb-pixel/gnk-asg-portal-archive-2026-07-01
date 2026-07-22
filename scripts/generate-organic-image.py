#!/usr/bin/env python3
"""Generate a premium-quality organic-gradient SVG illustration for an
editorial article, matching the house 'organic-v3' visual language used
across apps/portal/assets/gallery/*-organic-v3.svg.

Usage:
    python3 scripts/generate-organic-image.py <slug> <title> <description> <output_path>

Design notes (do not simplify below this bar):
  - Two glow orbs of DIFFERENT accent colours (not one).
  - Two flowing curved lines with varying colour/opacity.
  - A thematic orbit/ellipse motif for visual richness.
  - NO baked-in text/title -- the article page's own <h1>/eyebrow already
    carries the title; baking text into the SVG only makes it harder to
    reuse/relabel and looks flat next to the real typography.
  - Colours come from a curated palette list so results stay within the
    site's established dark/vivid aesthetic instead of drifting toward
    pastel or chart-like colours.
"""
import hashlib
import math
import sys

PALETTES = [
    ("#07152f", "#3b1f73", "#0ea5a8", "#8b5cf6", "#22d3ee"),
    ("#061626", "#144f66", "#8e3f72", "#5ef0c8", "#ff9fd4"),
    ("#071d2f", "#164f55", "#7b3d3e", "#87f4b8", "#ffc46b"),
    ("#081d3a", "#1c6b8f", "#0f3d5c", "#76e6c8", "#a8d8ff"),
    ("#150b24", "#5a2a8c", "#7b1f4a", "#c084fc", "#ff9ecb"),
    ("#0b1c22", "#146b73", "#0f4a3a", "#7ee8d8", "#c9f5a8"),
    ("#1a0e10", "#8c2d3a", "#3a1a2e", "#f28ca0", "#ffd08a"),
    ("#0c1a10", "#217a4f", "#0a3d2a", "#8ef0b0", "#d9ff8a"),
    ("#1c1608", "#8c6a1c", "#4a2f0a", "#f2d675", "#ffb56b"),
    ("#0e1424", "#2d4a8c", "#1a2f5c", "#8ec2ff", "#c8e0ff"),
    ("#170f1f", "#5c3a7a", "#2f1a4a", "#c9a6f5", "#ffb8e8"),
    ("#0d1a1c", "#1c6b73", "#0a3a3d", "#7fd8e8", "#b8fff0"),
    ("#170c17", "#6b1c5c", "#3a0f2f", "#e88ed0", "#ffd8a8"),
    ("#08101f", "#2c83f3", "#173b63", "#9ed4ff", "#f2cc63"),
]


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def seeded_rng(seed, n):
    h = hashlib.sha256(seed.encode()).digest()
    vals = []
    for i in range(n):
        chunk = h[(i * 4) % 28: (i * 4) % 28 + 4] or h[:4]
        vals.append(int.from_bytes(chunk, "big") % 10000 / 10000)
    return vals


def generate_organic_svg(slug: str, title: str, description: str) -> str:
    seed_int = int(hashlib.sha256(slug.encode()).hexdigest(), 16)
    palette = PALETTES[seed_int % len(PALETTES)]
    bg0, bg1, bg2, glow_a, glow_b = palette

    r = seeded_rng(slug, 20)
    orb1_x = 300 + int(r[0] * 500)
    orb1_y = 250 + int(r[1] * 350)
    orb1_r = 240 + int(r[2] * 120)
    orb2_x = 950 + int(r[3] * 450)
    orb2_y = 300 + int(r[4] * 350)
    orb2_r = 260 + int(r[5] * 120)
    orb3_x = 600 + int(r[12] * 500)
    orb3_y = 650 + int(r[13] * 180)
    orb3_r = 150 + int(r[14] * 90)

    curve1 = (
        f"M{120 + int(r[6]*120)} {520 + int(r[7]*140)}"
        f"C{380 + int(r[8]*120)} {200 + int(r[9]*160)} {700 + int(r[10]*140)} {220 + int(r[11]*140)} "
        f"{1000 + int(r[0]*140)} {480 + int(r[1]*160)}"
        f"s{300 + int(r[2]*80)} {200 + int(r[3]*80)} {430 + int(r[4]*80)} {40 + int(r[5]*60)}"
    )
    curve2 = (
        f"M{200 + int(r[6]*160)} {280 + int(r[7]*160)}"
        f"C{500 + int(r[8]*160)} {600 + int(r[9]*160)} {860 + int(r[10]*160)} {640 + int(r[11]*160)} "
        f"{1330 + int(r[0]*80)} {260 + int(r[1]*160)}"
    )
    aurora1 = (
        f"M-50 {620 + int(r[15]*100)}"
        f"C{300 + int(r[16]*160)} {420 + int(r[17]*160)} {700 + int(r[18]*160)} {700 + int(r[19]*120)} "
        f"{1650 + int(r[15]*40)} {480 + int(r[16]*160)}"
    )

    cx, cy = 800, 450
    rot_a = 10 + int(r[2] * 25)
    rot_b = -(30 + int(r[3] * 25))
    rot_c = 60 + int(r[4] * 25)
    ry_a = 100 + int(r[15] * 40)
    ry_b = 110 + int(r[16] * 40)
    ry_c = 95 + int(r[17] * 40)

    dot_positions = [
        (cx - int(210 * math.cos(r[5] * math.pi)), cy - int(135 * math.sin(r[6] * math.pi))),
        (cx + int(230 * math.cos(r[7] * math.pi)), cy + int(150 * math.sin(r[8] * math.pi))),
    ]

    stars = seeded_rng(slug + "-stars", 42)
    star_dots = []
    for i in range(0, len(stars) - 2, 3):
        sx = int(stars[i] * 1600)
        sy = int(stars[i + 1] * 900)
        srad = 1.2 + stars[i + 2] * 1.8
        star_dots.append(f'<circle cx="{sx}" cy="{sy}" r="{srad:.1f}" fill="#fff" opacity="{0.15 + stars[i+2]*0.35:.2f}"/>')
    stars_svg = "".join(star_dots)

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" '
        f'aria-labelledby="title desc"><title id="title">{esc(title)} — GNK ASG organski gradijent</title>'
        f'<desc id="desc">{esc(description)}</desc><defs>'
        f'<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{bg0}"/>'
        f'<stop offset=".48" stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></linearGradient>'
        f'<radialGradient id="g1"><stop stop-color="{glow_a}" stop-opacity=".95"/>'
        f'<stop offset="1" stop-color="{glow_a}" stop-opacity="0"/></radialGradient>'
        f'<radialGradient id="g2"><stop stop-color="{glow_b}" stop-opacity=".9"/>'
        f'<stop offset="1" stop-color="{glow_b}" stop-opacity="0"/></radialGradient>'
        f'<radialGradient id="g3"><stop stop-color="#fff" stop-opacity=".5"/>'
        f'<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
        f'<radialGradient id="vignette" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/>'
        f'<stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient>'
        f'<filter id="blur"><feGaussianBlur stdDeviation="40"/></filter>'
        f'<filter id="blurSoft"><feGaussianBlur stdDeviation="70"/></filter></defs>'
        f'<rect width="1600" height="900" fill="url(#bg)"/>'
        f'{stars_svg}'
        f'<path d="{aurora1}" fill="none" stroke="{glow_a}" stroke-opacity=".22" stroke-width="140" filter="url(#blurSoft)"/>'
        f'<circle cx="{orb1_x}" cy="{orb1_y}" r="{orb1_r}" fill="url(#g1)" filter="url(#blur)"/>'
        f'<circle cx="{orb2_x}" cy="{orb2_y}" r="{orb2_r}" fill="url(#g2)" filter="url(#blur)"/>'
        f'<circle cx="{orb3_x}" cy="{orb3_y}" r="{orb3_r}" fill="url(#g3)" filter="url(#blur)"/>'
        f'<path d="{curve1}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="8"/>'
        f'<path d="{curve2}" fill="none" stroke="{glow_b}" stroke-opacity=".45" stroke-width="5"/>'
        f'<g fill="none" stroke="#fff" stroke-opacity=".65">'
        f'<ellipse cx="{cx}" cy="{cy}" rx="330" ry="{ry_a}" transform="rotate({rot_a} {cx} {cy})"/>'
        f'<ellipse cx="{cx}" cy="{cy}" rx="330" ry="{ry_b}" transform="rotate({rot_b} {cx} {cy})"/>'
        f'<ellipse cx="{cx}" cy="{cy}" rx="330" ry="{ry_c}" transform="rotate({rot_c} {cx} {cy})"/></g>'
        f'<circle cx="{cx}" cy="{cy}" r="34" fill="#fff"/>'
        f'<circle cx="{dot_positions[0][0]}" cy="{dot_positions[0][1]}" r="16" fill="{glow_a}"/>'
        f'<circle cx="{dot_positions[1][0]}" cy="{dot_positions[1][1]}" r="18" fill="{glow_b}"/>'
        f'<rect width="1600" height="900" fill="url(#vignette)"/></svg>'
    )


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: generate-organic-image.py <slug> <title> <description> <output_path>", file=sys.stderr)
        sys.exit(1)
    slug, title, description, output_path = sys.argv[1:5]
    svg = generate_organic_svg(slug, title, description)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg)
    print(output_path)
