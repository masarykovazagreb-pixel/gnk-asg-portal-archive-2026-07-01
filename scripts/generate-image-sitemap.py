#!/usr/bin/env python3
"""Foto mapa — slike vezane uz stranicu na kojoj se stvarno pojavljuju.

Trazilice foto mapu citaju kao popis "koja slika pripada kojoj stranici".
Popis svih datoteka u repozitoriju tu ne pomaze: slika koja nije ni na jednoj
stranici nema kontekst, a stranica bez navedenih slika ne dobiva nista.

Zato se prolazi kroz same stranice i iz njih vade slike:
  - <img src="...">
  - <meta property="og:image">
  - pozadinske slike iz CSS-a (background-image: url(...))
"""
from __future__ import annotations

import os
import re
import html
from urllib.parse import urljoin

KORIJEN = "apps/portal"
BAZA = "https://gnk-asg.hr"
IZLAZ = os.path.join(KORIJEN, "image-sitemap.xml")

NOINDEX = re.compile(r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex', re.I)
IMG = re.compile(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', re.I)
ALT = re.compile(r'alt=["\']([^"\']*)["\']', re.I)
OG = re.compile(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', re.I)
CSS_VEZA = re.compile(r'<link[^>]+href=["\']([^"\']+\.css[^"\']*)["\']', re.I)
CSS_SLIKA = re.compile(r'url\(["\']?([^"\')]+\.(?:webp|jpg|jpeg|png|svg))["\']?\)', re.I)
NASTAVAK = re.compile(r'\.(webp|jpe?g|png|svg)(\?|$)', re.I)

NAJMANJE = 3000
PRESKOCI = ("favicon", "sprite", "spacer", "pixel", "tracking")


def adresa_stranice(putanja):
    rel = putanja[len(KORIJEN):]
    if rel.endswith("/index.html"):
        rel = rel[: -len("index.html")]
    return BAZA + rel


def apsolutna(izvor, temelj):
    izvor = html.unescape(izvor.strip())
    if not izvor or izvor.startswith(("data:", "blob:", "mailto:", "//")):
        return None
    if not NASTAVAK.search(izvor):
        return None
    if izvor.startswith("http"):
        return izvor if izvor.startswith(BAZA) else None
    return urljoin(temelj, izvor)


def lokalna(url):
    return os.path.join(KORIJEN, url[len(BAZA):].lstrip("/").split("?")[0])


def dovoljno_velika(url):
    put = lokalna(url)
    if not os.path.exists(put):
        return False
    if any(k in put.lower() for k in PRESKOCI):
        return False
    return os.path.getsize(put) >= NAJMANJE


def slike_iz_css(css_url):
    put = lokalna(css_url)
    if not os.path.exists(put):
        return []
    try:
        return CSS_SLIKA.findall(open(put, encoding="utf-8", errors="ignore").read())
    except Exception:
        return []


def skupi():
    po_stranici = {}
    for dirpath, _dirs, files in os.walk(KORIJEN):
        if "index.html" not in files:
            continue
        put = os.path.join(dirpath, "index.html")
        try:
            sadrzaj = open(put, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        if NOINDEX.search(sadrzaj[:4000]):
            continue

        stranica = adresa_stranice(put)
        nadjene = {}

        for oznaka in IMG.finditer(sadrzaj):
            url = apsolutna(oznaka.group(1), stranica)
            if url:
                opis = ALT.search(oznaka.group(0))
                nadjene.setdefault(url, html.unescape(opis.group(1)) if opis else "")

        for m in OG.finditer(sadrzaj):
            url = apsolutna(m.group(1), stranica)
            if url:
                nadjene.setdefault(url, "")

        for m in CSS_SLIKA.finditer(sadrzaj):
            url = apsolutna(m.group(1), stranica)
            if url:
                nadjene.setdefault(url, "")

        for veza in CSS_VEZA.finditer(sadrzaj):
            css_url = urljoin(stranica, html.unescape(veza.group(1)))
            if not css_url.startswith(BAZA):
                continue
            for izvor in slike_iz_css(css_url):
                url = apsolutna(izvor, css_url)
                if url:
                    nadjene.setdefault(url, "")

        korisne = [(u, o) for u, o in nadjene.items() if dovoljno_velika(u)]
        if korisne:
            po_stranici[stranica] = sorted(korisne)[:200]
    return po_stranici


def ispisi(po_stranici):
    redci = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
        ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ]
    for stranica in sorted(po_stranici):
        redci.append(f"  <url><loc>{stranica}</loc>")
        for url, opis in po_stranici[stranica]:
            naslov = ""
            if opis.strip():
                naslov = f"<image:title>{html.escape(opis.strip())[:180]}</image:title>"
            redci.append(
                f"    <image:image><image:loc>{html.escape(url)}</image:loc>{naslov}</image:image>"
            )
        redci.append("  </url>")
    redci.append("</urlset>")
    return "\n".join(redci) + "\n"


def main():
    po_stranici = skupi()
    unosa = sum(len(v) for v in po_stranici.values())
    razlicitih = len({u for v in po_stranici.values() for u, _ in v})
    open(IZLAZ, "w", encoding="utf-8").write(ispisi(po_stranici))
    print(f"zapisano: {IZLAZ}")
    print(f"  stranica sa slikama: {len(po_stranici)}")
    print(f"  unosa slika:         {unosa}")
    print(f"  razlicitih slika:    {razlicitih}")


if __name__ == "__main__":
    main()
