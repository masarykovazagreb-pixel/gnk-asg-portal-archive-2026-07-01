#!/usr/bin/env python3
"""Standard stamp for generated pages ("tvornica", faza 3).

Run AFTER any generator (region build, sites build, daily jobs). It makes the
publishing standard survive regeneration:

  1. visible entity line (Nermin Sefić, GNK ASG, AKTUAL MEDIA, GNK DINAMO Ltd)
     on every indexable page that lacks it;
  2. visible hashtag line (#NerminSefić #NerminSefic #AktualMedia #GNKASG
     #MrezaIzdanja) on every indexable page that lacks the owner hashtags;
  3. meta description: over-long descriptions are shortened (normalize_meta).

Idempotent: a second run changes nothing. Touches only the two lines it adds
(marked with class "gnk-attribution" / "gnk-hashtags") and meta descriptions.

Usage:
  python3 scripts/factory/apply_standard.py            # apply
  python3 scripts/factory/apply_standard.py --check    # report only, exit 1 if drift
"""
import html as htmlmod
import os
import re
import subprocess
import sys
import zlib

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
PORTAL = os.path.join(ROOT, "apps", "portal")

ENTITIES = {
    "Nermin Sefić": r"Nermin Sefi[cć]",
    "GNK ASG": r"GNK ASG",
    "AKTUAL MEDIA": r"AKTUAL MEDIA",
    "GNK DINAMO Ltd": r"GNK DINAMO Ltd",
}
OWNER_TAGS = ("#NerminSefić", "#NerminSefic")

LINE_ATTR = ('style="max-width:1050px;margin:24px auto;padding:0 20px;'
             'font:14px/1.5 Arial,sans-serif;color:#64748b"')
TAG_ATTR = ('style="max-width:1050px;margin:8px auto 24px;padding:0 20px;'
            'font:14px/1.6 Arial,sans-serif;color:#475569"')

ENTITY_LINE = {
    "hr": f'<p class="gnk-attribution" {LINE_ATTR}>Nositelj: GNK ASG d.o.o. · Izdavač: AKTUAL MEDIA d.o.o. · GNK DINAMO Ltd. · Urednik: Nermin Sefić</p>',
    "en": f'<p class="gnk-attribution" {LINE_ATTR}>Operator: GNK ASG d.o.o. · Publisher: AKTUAL MEDIA d.o.o. · GNK DINAMO Ltd. · Editor: Nermin Sefić</p>',
}
TAG_LINE = f'<p class="gnk-hashtags" {TAG_ATTR}>#NerminSefić #NerminSefic #AktualMedia #GNKASG #MrezaIzdanja</p>'

# Shared lead sentences from the network blocks (apps/satellites/lib/razmjena-v1.mjs,
# scripts/lib/prenos-v1.mjs). Same meaning, six wordings: a page gets one stable
# wording chosen by its path, so no single sentence sits on thousands of pages.
LEAD_GROUPS = [
    [
        "The newest headline from each other AKTUAL MEDIA edition. Every link opens the original domain; the edition and date are always stated.",
        "Latest headline from every other AKTUAL MEDIA edition, linked to its source. Each item names its edition and date.",
        "One fresh headline per sister edition of AKTUAL MEDIA. Links go to the original publisher, with edition and date shown.",
        "Newest items from the other AKTUAL MEDIA editions. Each link leads to the source site; edition and date are stated.",
        "Fresh stories from the sister editions of AKTUAL MEDIA, each linking back to the original site with its date.",
        "What the other AKTUAL MEDIA editions published most recently. Every headline opens at the source, with edition and date.",
    ],
    [
        "Najsvježi naslov svakog drugog izdanja AKTUAL MEDIA. Svaka veza vodi na izvornu domenu, uz navedeno izdanje i datum.",
        "Najnoviji naslov iz svakog ostalog izdanja AKTUAL MEDIA, s vezom na izvor. Uz svaku stavku stoje izdanje i datum.",
        "Po jedan svjež naslov iz sestrinskih izdanja AKTUAL MEDIA. Veze vode izvornom izdavaču, s izdanjem i datumom.",
        "Najnovije stavke ostalih izdanja AKTUAL MEDIA. Svaka poveznica vodi na izvorno mjesto; izdanje i datum su navedeni.",
        "Svježe vijesti sestrinskih izdanja AKTUAL MEDIA, svaka s vezom na izvornu stranicu i datumom objave.",
        "Što su u posljednje vrijeme objavila ostala izdanja AKTUAL MEDIA. Svaki naslov otvara se na izvoru, s izdanjem i datumom.",
    ],
    [
        "Columns, authored texts and explainers published by AKTUAL MEDIA. Every title opens its canonical page at the source.",
        "Our own columns, authored pieces and explainers. Each title links to its canonical page at the source.",
        "Opinion pieces, authored texts and explainers from AKTUAL MEDIA. Titles open the canonical version at the source.",
        "Texts written in-house by AKTUAL MEDIA: columns and explainers. Every title leads to its canonical source page.",
        "Columns and explainers from the AKTUAL MEDIA newsroom. Each title opens the canonical page at its original source.",
        "Authored work from AKTUAL MEDIA, including columns and explainers. Titles point to the canonical page at the source.",
    ],
    [
        "Kolumne, autorski tekstovi i pojašnjenja AKTUAL MEDIA. Svaki naslov vodi na kanonsku stranicu izvornika.",
        "Vlastite kolumne, autorski radovi i pojašnjenja. Svaki naslov vodi na kanonsku stranicu na izvoru.",
        "Komentari, autorski tekstovi i objašnjenja iz AKTUAL MEDIA. Naslovi otvaraju kanonsku verziju na izvornoj stranici.",
        "Tekstovi iz vlastite redakcije: kolumne i pojašnjenja. Svaki naslov vodi na kanonsku stranicu izvora.",
        "Kolumne i pojašnjenja iz redakcije AKTUAL MEDIA. Svaki naslov otvara kanonsku stranicu izvornog članka.",
        "Autorski radovi AKTUAL MEDIA, uključujući kolumne i pojašnjenja. Naslovi vode na kanonsku stranicu izvora.",
    ],
]


def vary_leads(relpath, src):
    """Swap the shared lead sentence for this page's stable wording."""
    idx = zlib.crc32(relpath.encode("utf-8")) % 6
    for group in LEAD_GROUPS:
        original = group[0]
        if any(v in src for v in group[1:]):
            continue  # already varied on an earlier run — keep idempotent
        if src.count(original) == 1:
            src = src.replace(original, group[idx], 1)
    return src


def visible_text(src):
    body = re.sub(r"(?is)<head.*?</head>", "", src)
    body = re.sub(r"(?is)<script.*?</script>|<style.*?</style>", "", body)
    return re.sub(r"<[^>]+>", " ", body)


def iter_pages():
    for dp, _dn, fn in os.walk(PORTAL):
        if "/." in dp or "podijeli" in dp or "index.html" not in fn:
            continue
        yield os.path.join(dp, "index.html")


def stamp(path, src):
    """Return new source with missing standard lines added (or src unchanged)."""
    if "noindex" in src or src.count("</body>") != 1:
        return src
    text = visible_text(src)
    lang = "en" if os.path.relpath(path, PORTAL).startswith("en" + os.sep) else "hr"
    add = []
    if any(not re.search(p, text) for p in ENTITIES.values()) and "gnk-attribution" not in src:
        add.append(ENTITY_LINE[lang])
    if not any(t in text for t in OWNER_TAGS) and "gnk-hashtags" not in src:
        add.append(TAG_LINE)
    if not add:
        return src
    return src.replace("</body>", "\n".join(add) + "\n</body>", 1)


def main():
    check = "--check" in sys.argv
    changed = []
    for path in iter_pages():
        with open(path, encoding="utf-8", newline="") as f:
            src = f.read()
        if "noindex" in src:
            continue
        new = vary_leads(os.path.relpath(path, PORTAL), stamp(path, src))
        if new != src:
            changed.append(os.path.relpath(path, ROOT))
            if not check:
                with open(path, "w", encoding="utf-8", newline="") as f:
                    f.write(new)
    # meta descriptions: delegate to the normalizer (same rules, same results)
    cmd = [sys.executable, os.path.join(ROOT, "scripts", "factory", "normalize_meta.py")]
    if not check:
        cmd.append("--write")
    out = subprocess.run(cmd, check=True, capture_output=True, text=True).stdout.strip()
    # promotivni blok za radio (vlastiti marker, idempotentno; vidi radio_promo_v1.py)
    rcmd = [sys.executable, os.path.join(ROOT, "scripts", "factory", "radio_promo_v1.py")]
    if check:
        rcmd.append("--check")
    radio = subprocess.run(rcmd, capture_output=True, text=True)
    print(f"{'CHECK' if check else 'APPLY'}: standard lines {len(changed)} page(s); meta: {out}; radio: {radio.stdout.strip()}")
    if check and (changed or radio.returncode):
        for c in changed[:20]:
            print("  drift:", c)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
