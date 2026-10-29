#!/usr/bin/env python3
"""Read-only portal audit ("tvornica" centar, faza 1).

Measures every indexable page under apps/portal and writes a JSON summary to
artifacts/factory/audit.json. Never modifies pages.

Checks:
  - required entities visible in body text (Nermin Sefić, GNK ASG,
    AKTUAL MEDIA, GNK DINAMO Ltd)
  - hashtags visible in body text (any #tag, owner hashtags, reversed variants)
  - meta description present and 80–160 chars
  - <title> length <= 60 chars
  - duplicated paragraphs across pages (>= 50 pages)
  - local <img> targets that do not exist on disk
  - internal <a href="/..."> targets that do not resolve
"""
import collections
import json
import os
import re
import sys
import urllib.parse

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
PORTAL = os.path.join(ROOT, "apps", "portal")
OUT = os.path.join(ROOT, "artifacts", "factory", "audit.json")

ENTITIES = {
    "nermin_sefic": r"Nermin Sefi[cć]",
    "gnk_asg": r"GNK ASG",
    "aktual_media": r"AKTUAL MEDIA",
    "gnk_dinamo_ltd": r"GNK DINAMO Ltd",
}
OWNER_TAGS = {"#NerminSefić", "#NerminSefic"}
REVERSED = {"#SeficNermin", "#SEFICNERMIN", "#SefićNermin"}


def visible_text(html):
    body = re.sub(r"(?is)<head.*?</head>", "", html)
    body = re.sub(r"(?is)<script.*?</script>|<style.*?</style>", "", body)
    return re.sub(r"<[^>]+>", " ", body)


def resolves(path_part):
    p = os.path.join(PORTAL, path_part.lstrip("/"))
    if os.path.isfile(p):
        return True
    if os.path.isdir(p) and os.path.isfile(os.path.join(p, "index.html")):
        return True
    return os.path.isfile(p + ".html")


def main():
    pages = []
    for dp, _dn, fn in os.walk(PORTAL):
        if "/." in dp or "podijeli" in dp or "index.html" not in fn:
            continue
        pages.append(os.path.join(dp, "index.html"))

    indexable = 0
    missing_entity = collections.Counter()
    tag_pages = 0
    owner_tag_pages = 0
    reversed_pages = 0
    desc = collections.Counter()
    title_long = 0
    para_pages = collections.Counter()
    broken_img = collections.Counter()
    broken_href = collections.Counter()

    for p in pages:
        with open(p, encoding="utf-8", errors="ignore") as f:
            html = f.read()
        if "noindex" in html:
            continue
        indexable += 1
        text = visible_text(html)

        for key, pat in ENTITIES.items():
            if not re.search(pat, text):
                missing_entity[key] += 1

        tags = set(re.findall(r"#[A-Za-zČĆŠŽĐčćšžđ][A-Za-zČĆŠŽĐčćšžđ0-9]+", text))
        if tags:
            tag_pages += 1
        if tags & OWNER_TAGS:
            owner_tag_pages += 1
        if tags & REVERSED:
            reversed_pages += 1

        m = re.search(r'<meta name="description" content="([^"]*)"', html)
        if not m:
            desc["missing"] += 1
        else:
            n = len(m.group(1))
            if n < 80:
                desc["short"] += 1
            elif n > 160:
                desc["long"] += 1
            else:
                desc["ok"] += 1

        t = re.search(r"<title>(.*?)</title>", html, flags=re.S)
        if t and len(t.group(1).strip()) > 60:
            title_long += 1

        seen = set()
        for para in re.findall(r"<p[^>]*>(.*?)</p>", html, flags=re.S):
            s = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", para)).strip()
            if len(s) >= 60 and s not in seen:
                seen.add(s)
                para_pages[s] += 1

        for src in set(re.findall(r'<img[^>]+src="(/[^"?#]+)', html)):
            if not os.path.isfile(os.path.join(PORTAL, urllib.parse.unquote(src).lstrip("/"))):
                broken_img[src] += 1
        for href in set(re.findall(r'<a [^>]*href="(/[^"#?]*)', html)):
            if not resolves(urllib.parse.unquote(href)):
                broken_href[href] += 1

    repeated = [(c, s) for s, c in para_pages.items() if c >= 50]
    repeated.sort(reverse=True)
    report = {
        "indexable_pages": indexable,
        "missing_entity": dict(missing_entity),
        "pages_with_any_visible_hashtag": tag_pages,
        "pages_with_owner_hashtags": owner_tag_pages,
        "pages_with_reversed_name_hashtags": reversed_pages,
        "meta_description": dict(desc),
        "title_over_60_chars": title_long,
        "repeated_paragraphs_50plus": len(repeated),
        "repeated_paragraph_occurrences": sum(c for c, _ in repeated),
        "top_repeated_paragraphs": [{"pages": c, "text": s[:160]} for c, s in repeated[:10]],
        "broken_local_images": sum(broken_img.values()),
        "broken_internal_links": sum(broken_href.values()),
        "broken_internal_link_targets": [
            {"href": h, "occurrences": n} for h, n in broken_href.most_common(20)
        ],
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
