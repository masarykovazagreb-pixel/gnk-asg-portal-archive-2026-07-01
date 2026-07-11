#!/usr/bin/env python3
"""Generate raster Open Graph cards for the portal and its shareable sections."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
W, H = 1200, 630

CARDS = {
    "gnk-asg-social-card.png": {
        "kicker": "GNK ASG d.o.o.",
        "title": ["Corporate Technology", "& Finance Portal"],
        "subtitle": "Technology  •  Artificial Intelligence  •  Finance  •  Governance",
        "footer": "Zagreb, Croatia  |  Market Intelligence & Global Network",
        "code": "PORTAL",
    },
    "share-financije.png": {
        "kicker": "GNK ASG d.o.o.  •  FY 2025",
        "title": ["Financijski profil", "i revidirani pokazatelji"],
        "subtitle": "Prihodi  •  Aktiva  •  Kapital i rezerve  •  Dokumentacijska osnova",
        "footer": "Javni korporativni portal  |  Financije",
        "code": "FY25",
    },
    "share-grupa.png": {
        "kicker": "GNK DINAMO Ltd. Group",
        "title": ["Globalna mreža", "33 + 12 lokacija"],
        "subtitle": "Boulder  •  Međunarodni okvir  •  Interaktivni 2D / 3D prikaz",
        "footer": "GNK ASG d.o.o.  |  Group Overview",
        "code": "GROUP",
    },
    "share-trzista.png": {
        "kicker": "GNK ASG Market Intelligence",
        "title": ["Tržišta i", "digitalna imovina"],
        "subtitle": "Bitcoin  •  Zlato  •  Indeksi  •  ASG Gold Reference",
        "footer": "Informativni tržišni prikaz  |  Public Data",
        "code": "MARKET",
    },
    "share-bpp.png": {
        "kicker": "GNK ASG d.o.o.  •  SOFTWARE SOLUTION",
        "title": ["Bitcoin Payment", "Processor"],
        "subtitle": "Developed for GNK DINAMO Ltd. group framework",
        "footer": "Informational product overview  |  bpp.is",
        "code": "BPP",
    },
    "share-tehnologija.png": {
        "kicker": "GNK ASG d.o.o.",
        "title": ["Technology", "& Artificial Intelligence"],
        "subtitle": "AI  •  Enterprise Software  •  FinTech  •  Sports Technology",
        "footer": "Digitalna strategija  |  Secure Operations",
        "code": "TECH",
    },
    "share-vijesti.png": {
        "kicker": "GNK ASG Public Monitor",
        "title": ["Business &", "Technology News"],
        "subtitle": "Ekonomija  •  Sport  •  Mobilnost  •  Tehnologija  •  BiH",
        "footer": "Aktualni javni izvori  |  Satno osvježavanje",
        "code": "NEWS",
    },
    "share-teme.png": {
        "kicker": "GNK ASG Tematski monitoring",
        "title": ["Ekonomija, sport,", "mobilnost i tehnologija"],
        "subtitle": "Aktualne teme  •  Provjerljivi javni izvori  •  Pretraživanje",
        "footer": "GNK DINAMO Ltd.  |  Nermin Sefić",
        "code": "TEME",
    },
    "share-dokumenti.png": {
        "kicker": "GNK ASG Transparency",
        "title": ["Javni dokumenti", "i službeni izvori"],
        "subtitle": "Financijski izvještaji  •  Registri  •  Javne objave",
        "footer": "Provjerljivi korporativni podatci",
        "code": "DOCS",
    },
}


def font(size: int, bold: bool = False):
    choices = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for path in choices:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def make_card(filename: str, content: dict[str, object]) -> None:
    image = Image.new("RGB", (W, H), "#061326")
    draw = ImageDraw.Draw(image, "RGBA")
    for y in range(H):
        ratio = y / H
        draw.line((0, y, W, y), fill=(6 + int(4 * ratio), 19 + int(14 * ratio), 38 + int(31 * ratio), 255))
    for radius, alpha in ((310, 19), (232, 29), (150, 39)):
        draw.ellipse((956 - radius, 106 - radius, 956 + radius, 106 + radius), fill=(42, 126, 205, alpha))
    gold, pale_gold, white, muted = "#d4af37", "#f4d77e", "#ffffff", "#b8c9db"
    draw.rounded_rectangle((72, 61, 174, 152), radius=17, fill="#07162d", outline=gold, width=2)
    draw.text((92, 90), str(content["code"]), font=font(19, True), fill=pale_gold)
    draw.text((72, 218), str(content["kicker"]), font=font(18, True), fill=gold)
    lines = list(content["title"])
    draw.text((72, 278), str(lines[0]), font=font(48, True), fill=white)
    draw.text((72, 338), str(lines[1]), font=font(48, True), fill=white)
    draw.text((74, 423), str(content["subtitle"]), font=font(19), fill=muted)
    draw.line((74, 481, 610, 481), fill=gold, width=2)
    draw.text((74, 511), str(content["footer"]), font=font(17), fill="#9bb2c9")
    points = [(828, 175), (1034, 204), (1112, 324), (929, 391), (792, 294)]
    for a, b in zip(points, points[1:] + points[:1]):
        draw.line((*a, *b), fill=(118, 199, 255, 66), width=2)
    for x, y in points:
        draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=(118, 199, 255, 166))
    path = ASSETS / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)
    print(f"Generated {path.relative_to(ROOT)} ({W}x{H}).")


def main() -> None:
    for filename, content in CARDS.items():
        make_card(filename, content)


if __name__ == "__main__":
    main()
