#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COLLECTIONS = {
    "hr": {
        "directory": ROOT / "objave",
        "index": ROOT / "objave" / "index.html",
        "label": "Objavljeno",
        "open": "Otvori objavu",
        "fallback_category": "Analiza",
    },
    "en": {
        "directory": ROOT / "publications",
        "index": ROOT / "publications" / "index.html",
        "label": "Published",
        "open": "Open publication",
        "fallback_category": "Analysis",
    },
}


def read_meta(path: Path) -> dict | None:
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    match = re.search(
        r'<script\b[^>]*id=["\']publication-meta["\'][^>]*>(.*?)</script>',
        text,
        flags=re.I | re.S,
    )
    if not match:
        return None
    try:
        data = json.loads(html.unescape(match.group(1)).strip())
    except (ValueError, TypeError, json.JSONDecodeError):
        return None
    required = ("title", "description", "canonical", "image", "datePublished")
    if not all(str(data.get(key) or "").strip() for key in required):
        return None
    return data


def card(meta: dict, language: str, open_label: str, fallback_category: str) -> str:
    canonical = str(meta["canonical"])
    try:
        route = "/" + canonical.split("://", 1)[1].split("/", 1)[1]
    except (IndexError, ValueError):
        route = canonical
    if not route.endswith("/"):
        route += "/"
    image = str(meta["image"]).replace("https://www.gnk-asg.hr", "")
    category = str(meta.get("category") or fallback_category)
    published = str(meta["datePublished"])[:10]
    keywords = " ".join(str(value) for value in (meta.get("keywords") or []))
    search = html.escape(f"{meta['title']} {meta['description']} {keywords}".lower(), quote=True)
    return (
        f'<article class="card" data-generated-publication="true" '
        f'data-language="{language.upper()}" data-search="{search}">'
        f'<img src="{html.escape(image, quote=True)}" '
        f'alt="{html.escape(meta.get("imageAlt") or meta["title"], quote=True)}" '
        'loading="lazy" decoding="async">'
        '<div class="card-body">'
        f'<small>{html.escape(category)} · {published} · GNK ASG Intelligence Desk</small>'
        f'<h2><a href="{html.escape(route, quote=True)}">{html.escape(meta["title"])}</a></h2>'
        f'<p>{html.escape(meta["description"])}</p>'
        f'<a class="read" href="{html.escape(route, quote=True)}">{html.escape(open_label)} →</a>'
        '</div></article>'
    )


def sync(language: str, config: dict) -> int:
    index_path = config["index"]
    text = index_path.read_text(encoding="utf-8-sig", errors="replace")
    text = re.sub(
        r'<article class="card" data-generated-publication="true".*?</article>',
        "",
        text,
        flags=re.I | re.S,
    )

    items = []
    for path in config["directory"].glob("*/index.html"):
        meta = read_meta(path)
        if meta and str(meta.get("language") or language) == language:
            items.append(meta)
    items.sort(key=lambda item: str(item.get("datePublished") or ""), reverse=True)

    cards = "".join(
        card(meta, language, config["open"], config["fallback_category"])
        for meta in items
    )
    text = re.sub(
        r'(<section class="grid"[^>]*>)',
        lambda match: match.group(1) + cards,
        text,
        count=1,
        flags=re.I,
    )
    total = len(re.findall(r'<article class="card"\b', text, flags=re.I))
    text = re.sub(
        rf'({re.escape(config["label"])}:\s*<strong>)\d+(</strong>)',
        rf'\g<1>{total}\g<2>',
        text,
        count=1,
        flags=re.I,
    )
    index_path.write_text(text, encoding="utf-8")
    return total


def main() -> None:
    results = {language: sync(language, config) for language, config in COLLECTIONS.items()}
    print("Publication indexes synchronized:", results)


if __name__ == "__main__":
    main()
