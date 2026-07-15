#!/usr/bin/env python3
"""Compatibility bridge for publication index synchronization.

The production workflow historically invokes this path. If a newer publication
index generator exists, this script delegates to it. Otherwise it validates that
the canonical HR/EN publication landing pages are already present, so deployment
cannot silently continue with missing public indexes.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPT_DIR = Path(__file__).resolve().parent
SELF = Path(__file__).resolve()

CANDIDATE_PATTERNS = (
    "*publication*index*.py",
    "*editorial*index*.py",
    "*public*index*.py",
)

REQUIRED_INDEXES = (
    "apps/portal/objave/index.html",
    "apps/portal/analize/index.html",
    "apps/portal/komentari/index.html",
    "apps/portal/en/publications/index.html",
    "apps/portal/en/analyses/index.html",
    "apps/portal/en/commentary/index.html",
)


def find_delegate() -> Path | None:
    seen: set[Path] = set()
    for pattern in CANDIDATE_PATTERNS:
        for path in sorted(SCRIPT_DIR.glob(pattern)):
            resolved = path.resolve()
            if resolved == SELF or resolved in seen or not path.is_file():
                continue
            seen.add(resolved)
            return path
    return None


def validate_existing_indexes() -> None:
    missing = [path for path in REQUIRED_INDEXES if not (ROOT / path).is_file()]
    if missing:
        formatted = "\n".join(f" - {path}" for path in missing)
        raise SystemExit(
            "Publication index synchronization cannot continue. "
            f"Missing canonical public indexes:\n{formatted}"
        )
    print("Publication indexes already exist; compatibility validation passed.")


def main() -> int:
    delegate = find_delegate()
    if delegate is not None:
        print(f"Delegating publication index synchronization to {delegate.relative_to(ROOT)}")
        completed = subprocess.run([sys.executable, str(delegate)], cwd=ROOT, check=False)
        return completed.returncode
    validate_existing_indexes()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
