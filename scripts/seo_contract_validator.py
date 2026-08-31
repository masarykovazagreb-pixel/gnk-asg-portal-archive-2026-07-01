#!/usr/bin/env python3
"""Fail-closed SEO contract validator for changed public HTML.

Designed for PR gating: validate only HTML files explicitly passed on the command
line, so legacy debt is not confused with a new regression. Exits non-zero on
contract failures and emits file-scoped diagnostics.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from html.parser import HTMLParser


class HeadParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self._in_title = False
        self.h1 = 0
        self.meta: list[dict[str, str]] = []
        self.links: list[dict[str, str]] = []
        self.images: list[dict[str, str]] = []
        self.jsonld: list[str] = []
        self._in_jsonld = False
        self._jsonld_buf: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        a = {str(k).lower(): (v or "") for k, v in attrs}
        tag = tag.lower()
        if tag == "title":
            self._in_title = True
        elif tag == "h1":
            self.h1 += 1
        elif tag == "meta":
            self.meta.append(a)
        elif tag == "link":
            self.links.append(a)
        elif tag == "img":
            self.images.append(a)
        elif tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self._in_jsonld = True
            self._jsonld_buf = []

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "title":
            self._in_title = False
        elif tag == "script" and self._in_jsonld:
            self.jsonld.append("".join(self._jsonld_buf).strip())
            self._in_jsonld = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
        if self._in_jsonld:
            self._jsonld_buf.append(data)


def meta_value(p: HeadParser, *, name: str | None = None, prop: str | None = None) -> str:
    for item in p.meta:
        if name and item.get("name", "").lower() == name.lower():
            return item.get("content", "").strip()
        if prop and item.get("property", "").lower() == prop.lower():
            return item.get("content", "").strip()
    return ""


def link_values(p: HeadParser, rel: str) -> list[dict[str, str]]:
    return [x for x in p.links if rel.lower() in x.get("rel", "").lower().split()]


def _iter_jsonld_nodes(value):
    if isinstance(value, dict):
        yield value
        graph = value.get("@graph")
        if isinstance(graph, list):
            for node in graph:
                if isinstance(node, dict):
                    yield node
    elif isinstance(value, list):
        for item in value:
            yield from _iter_jsonld_nodes(item)


def validate(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8", errors="strict")
    p = HeadParser()
    p.feed(text)
    errors: list[str] = []

    robots = meta_value(p, name="robots").lower()
    indexable = "noindex" not in robots
    if not indexable:
        return errors

    if not p.title.strip(): errors.append("missing <title>")
    if p.h1 != 1: errors.append(f"expected exactly one H1, found {p.h1}")
    if not meta_value(p, name="description"): errors.append("missing meta description")

    canon = link_values(p, "canonical")
    if len(canon) != 1 or not canon[0].get("href", "").strip():
        errors.append("expected exactly one non-empty canonical")

    for prop in ("og:title", "og:description", "og:image"):
        if not meta_value(p, prop=prop): errors.append(f"missing {prop}")
    if not meta_value(p, name="twitter:card"): errors.append("missing twitter:card")
    if not meta_value(p, name="twitter:image"): errors.append("missing twitter:image")

    # Image SEO: non-decorative images need contextual alt and stable intrinsic size.
    for i, img in enumerate(p.images, start=1):
        decorative = img.get("role", "").lower() == "presentation" or img.get("aria-hidden", "").lower() == "true"
        if decorative:
            continue
        if "alt" not in img or not img.get("alt", "").strip(): errors.append(f"img#{i} missing non-empty alt")
        if not img.get("width", "").isdigit() or not img.get("height", "").isdigit():
            errors.append(f"img#{i} missing numeric width/height")

    # Structured data must parse as JSON. Collect parsed nodes for truth-consistency checks.
    parsed_nodes: list[dict] = []
    if not p.jsonld:
        errors.append("missing JSON-LD")
    for i, block in enumerate(p.jsonld, start=1):
        try:
            parsed = json.loads(block)
            parsed_nodes.extend(_iter_jsonld_nodes(parsed))
        except json.JSONDecodeError as exc:
            errors.append(f"JSON-LD#{i} invalid JSON: {exc.msg}")

    # If hreflang is present, require x-default and self-consistent language set.
    hreflang = [x for x in p.links if "alternate" in x.get("rel", "").lower().split() and x.get("hreflang")]
    if hreflang:
        langs = {x.get("hreflang", "").lower() for x in hreflang}
        if "x-default" not in langs: errors.append("hreflang set missing x-default")
        if not ({"hr", "en"} <= langs): errors.append("hreflang set must include reciprocal hr and en")
        for x in hreflang:
            if not x.get("href", "").strip(): errors.append("hreflang alternate has empty href")

    # Truth gate: an organisation-signed editorial must not silently claim a person as author.
    # A person may still be linked via about/mentions/related content when genuinely relevant.
    org_signed = bool(re.search(r"(?:—|&mdash;|&#8212;)\s*GNK\s+ASG(?:\s+d\.o\.o\.)?", text, re.I))
    meta_author = meta_value(p, name="author")
    article_author = meta_value(p, prop="article:author")
    person_jsonld_authors: list[str] = []
    for node in parsed_nodes:
        node_type = node.get("@type")
        if node_type not in ("Article", "NewsArticle", "BlogPosting"):
            continue
        author = node.get("author")
        authors = author if isinstance(author, list) else [author]
        for item in authors:
            if isinstance(item, dict) and item.get("@type") == "Person" and item.get("name"):
                person_jsonld_authors.append(str(item["name"]).strip())
    if org_signed:
        if meta_author and not re.fullmatch(r"GNK\s+ASG(?:\s+d\.o\.o\.)?", meta_author, re.I):
            errors.append("organisation-signed page has conflicting meta author")
        if article_author and not re.fullmatch(r"GNK\s+ASG(?:\s+d\.o\.o\.)?", article_author, re.I):
            errors.append("organisation-signed page has conflicting article:author")
        if person_jsonld_authors:
            errors.append("organisation-signed page has Person author in Article JSON-LD")

    # Guard against accidental entity/author stuffing by catching repeated exact keyword runs.
    stuffing = re.compile(r"(?:Nermin\s+Sefi[cć]|GNK\s+ASG|GNK\s+DINAMO\s+Ltd\.?)\s*(?:[,|/·-]\s*(?:Nermin\s+Sefi[cć]|GNK\s+ASG|GNK\s+DINAMO\s+Ltd\.?)){5,}", re.I)
    if stuffing.search(text): errors.append("possible entity keyword stuffing sequence")
    return errors


def main(argv: list[str]) -> int:
    paths = [Path(x) for x in argv[1:] if x.lower().endswith((".html", ".htm")) and Path(x).is_file()]
    if not paths:
        print("SEO contract: no changed HTML files to validate")
        return 0
    failed = False
    for path in paths:
        errs = validate(path)
        if errs:
            failed = True
            for err in errs:
                print(f"::error file={path}::{err}")
        else:
            print(f"SEO contract OK: {path}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
