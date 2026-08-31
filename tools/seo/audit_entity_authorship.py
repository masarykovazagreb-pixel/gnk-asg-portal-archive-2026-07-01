#!/usr/bin/env python3
"""Audit generated public HTML/JS for potentially false Person authorship signals.

Read-only by design. The audit is intentionally conservative: it reports pages that
emit a Nermin Sefic/Sefić Person author signal without an explicit authorship cue in
the same document, and scripts that contain both the entity name and schema-author
construction. Use --strict in CI once the current baseline has been reviewed.

This does not infer INDEXED/LIVE status and does not modify public content.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

NAMES = ("Nermin Sefić", "Nermin Sefic", "Sefić Nermin", "Sefic Nermin")
HTML_SUFFIXES = {".html", ".htm"}
SCRIPT_SUFFIXES = {".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"}
IGNORE_PARTS = {".git", "node_modules", "vendor", "dist-cache", ".next", ".cache"}

AUTHOR_META_RE = re.compile(
    r'<meta[^>]+name=["\']author["\'][^>]+content=["\']([^"\']+)["\']', re.I
)
REL_AUTHOR_RE = re.compile(r'<a[^>]+rel=["\'][^"\']*author[^"\']*["\'][^>]*>', re.I)
VISIBLE_AUTHOR_RE = re.compile(r'\b(?:autor|author)\s*:\s*(?:Nermin\s+Sefi(?:ć|c)|Sefi(?:ć|c)\s+Nermin)\b', re.I)
PROFILE_TYPE_RE = re.compile(r'"@type"\s*:\s*"(?:ProfilePage|Person)"', re.I)
AUTHOR_SCHEMA_RE = re.compile(r'"author"\s*:\s*(?:\{|\[)', re.I)
PERSON_SCHEMA_RE = re.compile(r'"@type"\s*:\s*"Person"', re.I)
SCRIPT_AUTHOR_RE = re.compile(r'\bauthor\b|["\']author["\']', re.I)


def iter_candidates(root: Path):
    for path in root.rglob("*"):
        if not path.is_file() or any(part in IGNORE_PARTS for part in path.parts):
            continue
        if path.suffix.lower() in HTML_SUFFIXES | SCRIPT_SUFFIXES:
            yield path


def explicit_html_authorship(text: str) -> bool:
    for match in AUTHOR_META_RE.finditer(text):
        if any(name.casefold() in match.group(1).casefold() for name in NAMES):
            return True
    return bool(REL_AUTHOR_RE.search(text) or VISIBLE_AUTHOR_RE.search(text) or PROFILE_TYPE_RE.search(text))


def has_nermin(text: str) -> bool:
    folded = text.casefold()
    return any(name.casefold() in folded for name in NAMES)


def audit_html(path: Path, text: str) -> list[dict]:
    findings = []
    if not has_nermin(text):
        return findings
    has_person_author = AUTHOR_SCHEMA_RE.search(text) and PERSON_SCHEMA_RE.search(text)
    if has_person_author and not explicit_html_authorship(text):
        findings.append({
            "severity": "error",
            "rule": "person-author-without-explicit-authorship",
            "path": str(path),
            "detail": "Person author signal names Nermin Sefic/Sefić but no explicit author/profile cue was found in the document.",
        })
    return findings


def audit_script(path: Path, text: str) -> list[dict]:
    findings = []
    if not has_nermin(text) or not SCRIPT_AUTHOR_RE.search(text):
        return findings
    # This is a review signal rather than proof of a defect. It catches generator/runtime
    # code capable of globally injecting Person authorship so reviewers can verify that
    # page truth is used as the activation condition.
    findings.append({
        "severity": "review",
        "rule": "script-nermin-author-construction",
        "path": str(path),
        "detail": "Script contains Nermin Sefic/Sefić plus author construction; verify author activation is page-truth conditional, never global.",
    })
    return findings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".", help="repository/build root to audit")
    parser.add_argument("--strict", action="store_true", help="exit non-zero on error-severity findings")
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    findings: list[dict] = []
    scanned = 0
    for path in iter_candidates(root):
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        scanned += 1
        rel = path.relative_to(root)
        if path.suffix.lower() in HTML_SUFFIXES:
            findings.extend(audit_html(rel, text))
        else:
            findings.extend(audit_script(rel, text))

    summary = {
        "scanned_files": scanned,
        "errors": sum(f["severity"] == "error" for f in findings),
        "review": sum(f["severity"] == "review" for f in findings),
        "findings": findings,
    }
    if args.json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    else:
        print(f"authorship-audit scanned={scanned} errors={summary['errors']} review={summary['review']}")
        for finding in findings:
            print(f"[{finding['severity'].upper()}] {finding['rule']} {finding['path']}: {finding['detail']}")

    return 1 if args.strict and summary["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
