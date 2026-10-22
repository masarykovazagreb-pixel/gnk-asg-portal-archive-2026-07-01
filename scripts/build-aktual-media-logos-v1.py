#!/usr/bin/env python3
"""
AKTUAL MEDIA — generator logotipa.

Zašto generator, a ne pet ručno nacrtanih datoteka: svako izdanje mora imati
vlastiti znak u istoj familiji. Kad se doda deveto izdanje, pokrene se ovaj
skript i ono dobije logo bez crtanja.

Stil (preuzet s odobrenog rješenja):
  • podloga krem #F4F1E8
  • prvi dio imena navy #19233B
  • drugi dio imena crveno #D9384D
  • iznad, razmaknuto: kicker (npr. SVJETSKO IZDANJE)
  • ispod, kurzivni serif: tagline (npr. Vijesti · kontekst · izvori)

SVG je pravi vektor: slova su obrisi (nema ovisnosti o fontu na poslužitelju,
nema razlike između preglednika), pa se isti znak vidi svugdje.

Pokretanje:
  python3 scripts/build-aktual-media-logos-v1.py            # sve
  python3 scripts/build-aktual-media-logos-v1.py --check    # samo provjeri
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORTAL = ROOT / "apps" / "portal"
ASSETS = PORTAL / "assets" / "brand"

CREAM = "#F4F1E8"
NAVY = "#19233B"
RED = "#D9384D"
MUTED = "#5A6478"

W = 1200          # platno
H = 345
CAP = 176         # visina velikih slova
WORD_W = 1076     # koliko smije zauzeti wordmark

# Ime se dijeli na dva dijela koja nose dvije boje. "AKTUAL" je uvijek navy,
# drugi dio je uvijek crven — to je prepoznatljivost, ne stilizacija.
LOGOS = [
    # --- matični brend, dva jezika -------------------------------------
    dict(slug="aktual-media-hr", left="AKTUAL", right="MEDIA",
         kicker="SVJETSKO · IZDANJE", tagline="Vijesti · kontekst · izvori",
         lang="hr", title="AKTUAL MEDIA — svjetsko izdanje",
         desc="Znak AKTUAL MEDIA: navy AKTUAL, crvena MEDIA, natpis svjetsko izdanje i slogan Vijesti · kontekst · izvori."),
    dict(slug="aktual-media-en", left="AKTUAL", right="MEDIA",
         kicker="WORLD · EDITION", tagline="News · context · sources",
         lang="en", title="AKTUAL MEDIA — world edition",
         desc="AKTUAL MEDIA mark: navy AKTUAL, red MEDIA, world edition kicker and the tagline News · context · sources."),
    # --- osam gradskih kanala ------------------------------------------
    dict(slug="kanal-zagreb", left="KANAL", right="ZAGREB",
         kicker="AKTUAL · MEDIA · HRVATSKA", tagline="Deset provjerljivih tekstova dnevno",
         lang="hr", title="AKTUAL MEDIA KANAL ZAGREB", outlet="kanal/zagreb/",
         desc="Znak izdanja AKTUAL MEDIA KANAL ZAGREB."),
    dict(slug="kanal-beograd", left="KANAL", right="BEOGRAD",
         kicker="AKTUAL · MEDIA · SRBIJA", tagline="Deset proverljivih tekstova dnevno",
         lang="sr", title="AKTUAL MEDIA KANAL BEOGRAD", outlet="kanal/beograd/",
         desc="Znak izdanja AKTUAL MEDIA KANAL BEOGRAD."),
    dict(slug="kanal-sarajevo", left="KANAL", right="SARAJEVO",
         kicker="AKTUAL · MEDIA · BIH", tagline="Deset provjerljivih tekstova dnevno",
         lang="bs", title="AKTUAL MEDIA KANAL SARAJEVO", outlet="kanal/sarajevo/",
         desc="Znak izdanja AKTUAL MEDIA KANAL SARAJEVO."),
    dict(slug="kanal-budimpesta", left="KANAL", right="BUDAPEST",
         kicker="AKTUAL · MEDIA · MAGYARORSZÁG", tagline="Napi tíz ellenőrzött szöveg",
         lang="hu", title="AKTUAL MEDIA KANAL BUDAPEST", outlet="kanal/budimpesta/",
         desc="A budapesti AKTUAL MEDIA kiadás jele."),
    dict(slug="kanal-ljubljana", left="KANAL", right="LJUBLJANA",
         kicker="AKTUAL · MEDIA · SLOVENIJA", tagline="Deset preverjenih besedil dnevno",
         lang="sl", title="AKTUAL MEDIA KANAL LJUBLJANA", outlet="kanal/ljubljana/",
         desc="Znak izdaje AKTUAL MEDIA KANAL LJUBLJANA."),
    dict(slug="kanal-rim", left="KANAL", right="ROMA",
         kicker="AKTUAL · MEDIA · ITALIA", tagline="Dieci testi verificati al giorno",
         lang="it", title="AKTUAL MEDIA KANAL ROMA", outlet="kanal/rim/",
         desc="Marchio dell'edizione AKTUAL MEDIA KANAL ROMA."),
    dict(slug="kanal-sofija", left="KANAL", right="SOFIJA",
         kicker="AKTUAL · MEDIA · БЪЛГАРИЯ", tagline="Десет проверени текста на ден",
         lang="bg", title="AKTUAL MEDIA KANAL SOFIJA", outlet="kanal/sofija/",
         desc="Знак на изданието AKTUAL MEDIA KANAL SOFIJA."),
    dict(slug="kanal-bukurest", left="KANAL", right="BUCUREȘTI",
         kicker="AKTUAL · MEDIA · ROMÂNIA", tagline="Zece texte verificate pe zi",
         lang="ro", title="AKTUAL MEDIA KANAL BUCUREȘTI", outlet="kanal/bukurest/",
         desc="Sigla ediției AKTUAL MEDIA KANAL BUCUREȘTI."),
    # --- devet globalnih izdanja (pet kontinenata) ----------------------
    # Znak je uvijek latinica: ime izdanja i slogan moraju se pročitati na
    # svakom uređaju, a generirani SVG nosi obrise slova iz DejaVu fonta.
    # Zato japansko, kinesko i arapsko izdanje ovdje nose engleski slogan —
    # to je njihov drugi jezik i dio istog ugovora o čitljivosti.
    dict(slug="kanal-nairobi", left="CHANNEL", right="NAIROBI",
         kicker="AKTUAL · MEDIA · KENYA", tagline="Ten verifiable stories a day",
         lang="en", title="AKTUAL MEDIA CHANNEL NAIROBI", outlet="kanal/nairobi/",
         desc="Mark of the AKTUAL MEDIA CHANNEL NAIROBI edition."),
    dict(slug="kanal-jakarta", left="KANAL", right="JAKARTA",
         kicker="AKTUAL · MEDIA · INDONESIA", tagline="Sepuluh tulisan terverifikasi sehari",
         lang="id", title="AKTUAL MEDIA KANAL JAKARTA", outlet="kanal/jakarta/",
         desc="Tanda edisi AKTUAL MEDIA KANAL JAKARTA."),
    dict(slug="kanal-newyork", left="CHANNEL", right="NEW YORK",
         kicker="AKTUAL · MEDIA · UNITED STATES", tagline="Ten verifiable stories a day",
         lang="en", title="AKTUAL MEDIA CHANNEL NEW YORK", outlet="kanal/newyork/",
         desc="Mark of the AKTUAL MEDIA CHANNEL NEW YORK edition."),
    dict(slug="kanal-saopaulo", left="CANAL", right="SÃO PAULO",
         kicker="AKTUAL · MEDIA · BRASIL", tagline="Dez matérias verificáveis por dia",
         lang="pt", title="AKTUAL MEDIA CANAL SÃO PAULO", outlet="kanal/saopaulo/",
         desc="Marca da edição AKTUAL MEDIA CANAL SÃO PAULO."),
    dict(slug="kanal-sydney", left="CHANNEL", right="SYDNEY",
         kicker="AKTUAL · MEDIA · AUSTRALIA", tagline="Ten verifiable stories a day",
         lang="en", title="AKTUAL MEDIA CHANNEL SYDNEY", outlet="kanal/sydney/",
         desc="Mark of the AKTUAL MEDIA CHANNEL SYDNEY edition."),
    dict(slug="kanal-singapur", left="CHANNEL", right="SINGAPUR",
         kicker="AKTUAL · MEDIA · SINGAPORE", tagline="Ten verifiable stories a day",
         lang="en", title="AKTUAL MEDIA KANAL SINGAPUR", outlet="kanal/singapur/",
         desc="Mark of the AKTUAL MEDIA KANAL SINGAPUR edition."),
    dict(slug="kanal-kairo", left="KANAL", right="KAIRO",
         kicker="AKTUAL · MEDIA · EGYPT", tagline="Ten verifiable stories a day",
         lang="ar", title="AKTUAL MEDIA KANAL KAIRO", outlet="kanal/kairo/",
         desc="Mark of the AKTUAL MEDIA KANAL KAIRO edition."),
    dict(slug="kanal-tokio", left="KANAL", right="TOKIO",
         kicker="AKTUAL · MEDIA · JAPAN", tagline="Ten verifiable stories a day",
         lang="ja", title="AKTUAL MEDIA KANAL TOKIO", outlet="kanal/tokio/",
         desc="Mark of the AKTUAL MEDIA KANAL TOKIO edition."),
    dict(slug="kanal-peking", left="KANAL", right="PEKING",
         kicker="AKTUAL · MEDIA · CHINA", tagline="Ten verifiable stories a day",
         lang="zh", title="AKTUAL MEDIA KANAL PEKING", outlet="kanal/peking/",
         desc="Mark of the AKTUAL MEDIA KANAL PEKING edition."),
    # --- devet tematskih deskova ---------------------------------------
    dict(slug="desk-sport", left="SPORT", right="DESK",
         kicker="AKTUAL · MEDIA · REGIJA", tagline="Rezultati i osvrti iz osam zemalja",
         lang="hr", title="AKTUAL MEDIA SPORT", outlet="izdanja/sport/",
         desc="Znak sportskog deska AKTUAL MEDIA."),
    dict(slug="desk-politika", left="POLITIKA", right="DESK",
         kicker="AKTUAL · MEDIA · REGIJA", tagline="Odluke, izbori i okvir poslovanja",
         lang="hr", title="AKTUAL MEDIA POLITIKA", outlet="izdanja/politika/",
         desc="Znak političkog deska AKTUAL MEDIA."),
    dict(slug="desk-biznis", left="BUSINESS", right="DESK",
         kicker="AKTUAL · MEDIA · REGIJA", tagline="Tržišta, bilance i kapital",
         lang="hr", title="AKTUAL MEDIA BUSINESS", outlet="izdanja/biznis/",
         desc="Znak business deska AKTUAL MEDIA."),
    dict(slug="desk-tehnologija", left="TEHNOLOGIJA", right="DESK",
         kicker="AKTUAL · MEDIA · REGIJA", tagline="AI, platforme i infrastruktura",
         lang="hr", title="AKTUAL MEDIA TEHNOLOGIJA", outlet="izdanja/tehnologija/",
         desc="Znak tehnološkog deska AKTUAL MEDIA."),
    dict(slug="desk-moda", left="MODA", right="DESK",
         kicker="AKTUAL · MEDIA · TJEDNIK", tagline="Stil, dizajn i brendovi regije",
         lang="hr", title="AKTUAL MEDIA MODA", outlet="izdanja/moda/",
         desc="Znak modnog deska AKTUAL MEDIA."),
    dict(slug="desk-putovanja", left="PUTOVANJA", right="DESK",
         kicker="AKTUAL · MEDIA · REGIJA", tagline="Destinacije, sezona i cijena puta",
         lang="hr", title="AKTUAL MEDIA PUTOVANJA", outlet="izdanja/putovanja/",
         desc="Znak putnog deska AKTUAL MEDIA."),
    dict(slug="desk-ljubimci", left="LJUBIMCI", right="DESK",
         kicker="AKTUAL · MEDIA · REGIJA", tagline="Udomljavanje, skrb i pravila",
         lang="hr", title="AKTUAL MEDIA LJUBIMCI", outlet="izdanja/ljubimci/",
         desc="Znak deska za ljubimce AKTUAL MEDIA."),
    dict(slug="desk-svijet", left="SVIJET", right="DESK",
         kicker="AKTUAL · MEDIA · REGIJA", tagline="Globalni okvir za lokalne odluke",
         lang="hr", title="AKTUAL MEDIA SVIJET", outlet="izdanja/svijet/",
         desc="Znak deska Svijet AKTUAL MEDIA."),
    dict(slug="desk-sigurnost", left="SIGURNOST", right="DESK",
         kicker="AKTUAL · MEDIA · REGIJA", tagline="Kibernetika i preuzimanja",
         lang="hr", title="AKTUAL MEDIA SIGURNOST", outlet="izdanja/sigurnost/",
         desc="Znak sigurnosnog deska AKTUAL MEDIA."),
]


def render_layer(text, color, pointsize, kerning, squeeze, target_h, tmp,
                 font="DejaVu-Sans-Bold", stroke="3", shear=None, cap_ref=None):
    """Jedan sloj teksta → prozirni PNG točne visine `target_h`.

    Visina se mjeri na `cap_ref` (isto ime bez zareza i kvačica), a ne na
    cijelom slogu. Bez toga rumunjsko BUCUREȘTI, kojem zarez ispod slova
    poveća okvir, ispadne manje od BEOGRADA iako su u istoj familiji.
    """
    base = [
        "convert", "-background", "none", "-fill", color,
        "-stroke", color, "-strokewidth", stroke,
        "-font", font, "-pointsize", str(pointsize),
        "-kerning", str(kerning),
    ]
    out = tmp / f"L{abs(hash((text, color, pointsize, kerning, squeeze, font)))}.png"
    subprocess.run(base + [f"label:{text}", "-resize", f"{squeeze}%x100",
                           "-trim", "+repage", str(out)], check=True)

    factor = None
    if cap_ref and cap_ref != text:
        ref = tmp / f"R{abs(hash((cap_ref, font, pointsize, squeeze)))}.png"
        subprocess.run(base + [f"label:{cap_ref}", "-resize", f"{squeeze}%x100",
                               "-trim", "+repage", str(ref)], check=True)
        _, ref_h = measure(ref)
        factor = target_h / ref_h

    if factor:
        subprocess.run(["convert", str(out), "-resize", f"{round(factor * 100, 2)}%",
                        "-trim", "+repage", str(out)], check=True)
    else:
        subprocess.run(["convert", str(out), "-resize", f"x{target_h}",
                        "-trim", "+repage", str(out)], check=True)

    if shear:
        subprocess.run(["convert", str(out), "-background", "none", "-shear", shear,
                        "-trim", "+repage", str(out)], check=True)
    return out


def measure(path):
    w, h = subprocess.run(["identify", "-format", "%w %h", str(path)],
                          check=True, capture_output=True, text=True).stdout.split()
    return int(w), int(h)


def png_to_svg(png, tmp, name):
    """Png → SVG s ugrađenom slikom (vektor obrisa nije dostupan bez potracea,
    ali SVG s ugrađenim rasterom ostaje jedan dokument i skalira se korektno
    do 3× jer je izvor renderiran na 4× ciljne veličine)."""
    import base64
    data = base64.b64encode(png.read_bytes()).decode()
    w, h = measure(png)
    return (f'<image id="{name}" x="0" y="0" width="{w}" height="{h}" '
            f'href="data:image/png;base64,{data}"/>')


def build(spec, tmp):
    """Slaže jedan logo i vraća (svg_string, webp_path)."""
    cap_ref_l = "".join(ch if ch.isascii() and ch.isalpha() else "H" for ch in spec["left"])
    cap_ref_r = "".join(ch if ch.isascii() and ch.isalpha() else "H" for ch in spec["right"])
    left = render_layer(spec["left"], NAVY, 600, -6, 56, CAP, tmp, cap_ref=cap_ref_l)
    right = render_layer(spec["right"], RED, 600, -10, 56, CAP, tmp, cap_ref=cap_ref_r)
    lw, _ = measure(left)
    rw, _ = measure(right)

    # Razmak između dvaju dijelova je stalan (44 px na 1200). Prije se
    # računao kao "ostatak do pune širine", pa su kratka imena (MODA DESK)
    # izgledala razvučeno kao da im nedostaje riječ. Dugačka imena se
    # umjesto toga cijela smanje da stanu u WORD_W.
    GAP = 44
    if lw + GAP + rw > WORD_W:
        scale = (WORD_W - GAP) / (lw + rw)
        for path in (left, right):
            subprocess.run(["convert", str(path), "-resize", f"{int(scale * 1000) / 1000 * 100}%x100",
                            "-resize", f"x{CAP}", str(path)], check=True)
        lw, _ = measure(left)
        rw, _ = measure(right)
    gap = GAP
    x0 = (W - lw - gap - rw) // 2

    kicker = render_layer(spec["kicker"], NAVY, 26, 8, 100, 15, tmp)
    # Tagline je kurzivni serif: DejaVu Serif bez podebljanja, blago nagnut.
    # Bez ovoga ispadne sans i cijeli znak izgubi ton odobrenog rješenja.
    tagline = render_layer(spec["tagline"], RED, 54, 0, 100, 30, tmp,
                           font="DejaVu-Serif", stroke="1", shear="11x0")
    kw, _ = measure(kicker)
    tw, _ = measure(tagline)

    layers = [
        (kicker, (W - kw) // 2, 44),
        (left, x0, 81),
        (right, x0 + lw + gap, 81),
        (tagline, (W - tw) // 2, 292),
    ]

    svg_parts = [f'<rect width="{W}" height="{H}" fill="{CREAM}"/>']
    cmd = ["convert", "-size", f"{W}x{H}", f"xc:{CREAM}"]
    for i, (path, x, y) in enumerate(layers):
        svg_parts.append(f'<g transform="translate({x} {y})">'
                         + png_to_svg(path, tmp, f"L{i}") + "</g>")
        cmd += ["(", str(path), ")", "-geometry", f"+{x}+{y}", "-composite"]

    out_dir = ASSETS
    out_dir.mkdir(parents=True, exist_ok=True)
    webp = out_dir / f"{spec['slug']}-1200.webp"
    cmd += ["-depth", "8", "-quality", "92", str(webp)]
    subprocess.run(cmd, check=True)

    # kvadratna varijanta za profil (avatar / favicon kontekst)
    subprocess.run(["convert", str(webp), "-resize", "512x512",
                    "-background", CREAM, "-gravity", "center", "-extent", "512x512",
                    str(out_dir / f"{spec['slug']}-512.webp")], check=True)

    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
           f'width="{W}" height="{H}" role="img" aria-labelledby="t d">'
           f'<title id="t">{spec["title"]}</title>'
           f'<desc id="d">{spec["desc"]}</desc>'
           + "".join(svg_parts) + "</svg>")
    (out_dir / f"{spec['slug']}.svg").write_text(svg, encoding="utf-8")

    # OG varijanta 1200×630 s logom na krem podlozi
    subprocess.run(["convert", str(webp), "-resize", "1040x",
                    "-background", CREAM, "-gravity", "center", "-extent", "1200x630",
                    "-depth", "8", "-quality", "90",
                    str(out_dir / f"{spec['slug']}-og.jpg")], check=True)

    return str(out_dir / f"{spec['slug']}.svg"), str(webp)


def main():
    check = "--check" in sys.argv
    manifest = {"version": "GNK_ASG_AKTUAL_MEDIA_LOGOS_V1_20261022",
                "palette": {"bg": CREAM, "primary": NAVY, "accent": RED},
                "canvas": [W, H], "logos": []}
    missing = []
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        for spec in LOGOS:
            svg = ASSETS / f"{spec['slug']}.svg"
            webp = ASSETS / f"{spec['slug']}-1200.webp"
            og = ASSETS / f"{spec['slug']}-og.jpg"
            sq = ASSETS / f"{spec['slug']}-512.webp"
            if check:
                for p in (svg, webp, og, sq):
                    if not p.exists():
                        missing.append(str(p.relative_to(ROOT)))
            else:
                build(spec, tmp)
            manifest["logos"].append({
                "slug": spec["slug"], "title": spec["title"], "lang": spec["lang"],
                "outlet": spec.get("outlet", ""),
                "svg": f"/assets/brand/{spec['slug']}.svg",
                "webp": f"/assets/brand/{spec['slug']}-1200.webp",
                "og": f"/assets/brand/{spec['slug']}-og.jpg",
                "square": f"/assets/brand/{spec['slug']}-512.webp",
                "kicker": spec["kicker"], "tagline": spec["tagline"],
            })

    data = PORTAL / "data" / "aktual-logos-v1.json"
    payload = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"

    if check:
        if missing:
            print(json.dumps({"ok": False, "missing": missing}, ensure_ascii=False))
            return 1
        current = data.read_text(encoding="utf-8") if data.exists() else ""
        if current != payload:
            print(json.dumps({"ok": False, "reason": "manifest nije osvježen"}, ensure_ascii=False))
            return 1
        print(json.dumps({"ok": True, "logos": len(manifest["logos"]),
                          "version": manifest["version"]}, ensure_ascii=False))
        return 0

    data.write_text(payload, encoding="utf-8")
    print(json.dumps({"ok": True, "logos": len(manifest["logos"]),
                      "dir": str(ASSETS.relative_to(ROOT))}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
