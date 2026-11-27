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
from urllib.parse import urljoin, urlsplit, unquote
from html.parser import HTMLParser

KORIJEN = "apps/portal"
BAZA = "https://gnk-asg.hr"
IZLAZ = os.path.join(KORIJEN, "image-sitemap.xml")

NOINDEX = re.compile(r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex', re.I)
IMG = re.compile(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', re.I)
ALT = re.compile(r'alt=["\']([^"\']*)["\']', re.I)
OG = re.compile(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', re.I)
CSS_VEZA = re.compile(r'<link[^>]+href=["\']([^"\']+\.css[^"\']*)["\']', re.I)
CSS_SLIKA = re.compile(r'url\(["\']?([^"\')]+\.(?:webp|jpg|jpeg|png|svg))["\']?\)', re.I)
NASTAVAK = re.compile(r'\.(webp|jpe?g|png|svg|avif|gif)(\?|$)', re.I)

NAJMANJE = 3000
PRESKOCI = ("favicon", "sprite", "spacer", "pixel", "tracking")


def adresa_stranice(putanja):
    rel = putanja[len(KORIJEN):]
    if rel.endswith("/index.html"):
        rel = rel[: -len("index.html")]
    return BAZA + rel


# Only public, same-origin canonical landing pages belong in this sitemap.
PRIVATE = frozenset(("admin", "admin-center", "control", "automation-status",
    "webmail", "mail-studio", "campaign-mailer", "email-status", "worker-ops",
    "operator-dashboard", "digital-headquarters", "media-registration-admin",
    "podijeli", "api"))


def public_path(url):
    try:
        u = urlsplit(url)
        path = unquote(u.path)
        segments = [x.lower() for x in path.split("/") if x]
        return (u.scheme == "https" and u.netloc == urlsplit(BAZA).netloc
                and not any(x in PRIVATE or x in (".", "..") for x in segments)
                and "\\" not in path)
    except ValueError:
        return False


class HeadSignals(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.noindex = False
        self.canonicals = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta" and (a.get("name") or "").lower() in ("robots", "googlebot", "googlebot-image", "bingbot"):
            if re.search(r"\b(?:noindex|none|noimageindex)\b", a.get("content") or "", re.I):
                self.noindex = True
        if tag == "link" and "canonical" in (a.get("rel") or "").lower().split():
            self.canonicals.append(a.get("href") or "")


def eligible_page(url, text):
    if not public_path(url):
        return False
    head = re.split(r"</head\s*>", text, maxsplit=1, flags=re.I)[0]
    signals = HeadSignals()
    signals.feed(head)
    if signals.noindex:
        return False
    # Skip aliases rather than asking crawlers to index the same content twice.
    return not signals.canonicals or (len(signals.canonicals) == 1
        and bool(signals.canonicals[0])
        and urljoin(url, signals.canonicals[0]) == url)


def apsolutna(izvor, temelj):
    izvor = html.unescape(izvor.strip())
    if not izvor or izvor.startswith(("data:", "blob:", "mailto:", "//")):
        return None
    url = urljoin(temelj, izvor)
    if not public_path(url) or not NASTAVAK.search(url):
        return None
    return url


def lokalna(url):
    if not public_path(url):
        return ""
    root = os.path.realpath(KORIJEN)
    put = os.path.realpath(os.path.join(root, unquote(urlsplit(url).path).lstrip("/")))
    return put if os.path.commonpath((root, put)) == root else ""


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
        stranica = adresa_stranice(put)
        if not eligible_page(stranica, sadrzaj):
            continue
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
            if not public_path(css_url):
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
        redci.append(f"  <url><loc>{html.escape(stranica)}</loc>")
        for url, opis in po_stranici[stranica]:
            redci.append(
                f"    <image:image><image:loc>{html.escape(url)}</image:loc></image:image>"
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
