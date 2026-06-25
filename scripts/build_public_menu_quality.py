#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MENU = ROOT / "apps" / "portal" / "assets" / "public-menu-final-v9.js"
QUALITY = ROOT / "apps" / "portal" / "assets" / "public-quality-client-v1.js"
STABILITY = ROOT / "apps" / "portal" / "assets" / "public-data-stability-v1.js"
MARKER = "__GNK_ASG_PUBLIC_QUALITY_CLIENT_V1__"


def main() -> None:
    menu = MENU.read_text(encoding="utf-8")
    if MARKER in menu:
        return
    additions = []
    for source in (QUALITY, STABILITY):
        if source.is_file():
            additions.append(source.read_text(encoding="utf-8").strip())
    if additions:
        MENU.write_text(menu.rstrip() + "\n\n" + "\n\n".join(additions) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
