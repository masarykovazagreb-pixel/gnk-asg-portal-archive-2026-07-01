#!/usr/bin/env python3
"""Meta normalizer ("tvornica", faza 2).

Changes ONLY the meta description family of indexable pages:
  <meta name="description">, <meta property="og:description">,
  <meta name="twitter:description">.
Body text, layers (author band, ribbon, CSS, entity lines) are not touched.

Rules:
  - description longer than MAX_LEN is cut at the last sentence end inside the
    limit, or at the last word boundary plus an ellipsis.
  - the three meta copies stay identical when they were identical before.
  - idempotent: running twice changes nothing more.

Usage:
  python3 scripts/factory/normalize_meta.py            # dry run, prints counts
  python3 scripts/factory/normalize_meta.py --write    # writes files
"""
import html
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
PORTAL = os.path.join(ROOT, "apps", "portal")
MAX_LEN = 160
MIN_LEN_AFTER_CUT = 100

SKIP_DIR_PARTS = ("podijeli",)

NAME_RE = r'<meta name="description" content="([^"]*)"'
FAMILY = [
    r'<meta name="description" content="([^"]*)"',
    r'<meta property="og:description" content="([^"]*)"',
    r'<meta name="twitter:description" content="([^"]*)"',
]


def shorten(text, limit=MAX_LEN):
    if len(text) <= limit:
        return text
    window = text[:limit]
    # Prefer the last sentence end that leaves a meaningful description.
    cut = max(window.rfind(". "), window.rfind("! "), window.rfind("? "))
    if cut >= MIN_LEN_AFTER_CUT:
        return window[: cut + 1].rstrip()
    # Otherwise cut at the last word boundary and add an ellipsis (the ellipsis
    # counts toward the limit, so the cut window is one character shorter).
    window = text[: limit - 1]
    space = window.rfind(" ")
    if space >= MIN_LEN_AFTER_CUT:
        return window[:space].rstrip(" ,;:—-") + "…"
    return window.rstrip() + "…"


MIN_LEN = 80


def process(path, write):
    """Shorten over-long descriptions. Short ones are reported for manual review.

    No text is added: auto-appended sentences were tested and rejected because
    they produce templated, repeated meta descriptions.
    """
    with open(path, encoding="utf-8", newline="") as f:
        src = f.read()
    m = re.search(FAMILY[0], src)
    if not m:
        return "missing"
    original = html.unescape(m.group(1))
    if len(original) < MIN_LEN:
        return "short_manual"
    if len(original) <= MAX_LEN:
        return "ok"
    new_attr = html.escape(shorten(original), quote=True)
    out = src
    for pat in FAMILY:
        for mm in re.finditer(pat, out):
            if html.unescape(mm.group(1)) == original:
                out = out.replace(mm.group(0), mm.group(0).replace(mm.group(1), new_attr, 1), 1)
                break
    if write and out != src:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(out)
    return "shortened"


def main():
    write = "--write" in sys.argv
    counts = {"ok": 0, "shortened": 0, "short_manual": 0, "missing": 0, "noindex": 0}
    for dp, _dn, fn in os.walk(PORTAL):
        if "/." in dp or any(p in dp for p in SKIP_DIR_PARTS) or "index.html" not in fn:
            continue
        path = os.path.join(dp, "index.html")
        with open(path, encoding="utf-8", errors="ignore") as f:
            if "noindex" in f.read():
                counts["noindex"] += 1
                continue
        counts[process(path, write)] += 1
    print(("WRITE" if write else "DRY RUN"), counts)
    return 0


if __name__ == "__main__":
    sys.exit(main())
