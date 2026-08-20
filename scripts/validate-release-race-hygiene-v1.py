#!/usr/bin/env python3
"""Fail closed on automatic main writers that can bypass the release fence."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
FENCE = "vars.GNK_ASG_RELEASE_FENCE != 'true'"
SERIAL_GROUP = "group: gnk-asg-main-mutation"


def source(name: str) -> str:
    return (WORKFLOWS / name).read_text(encoding="utf-8", errors="replace")


def _is_direct_git_push(line: str) -> bool:
    """Match executable git push commands, not comments/grep/echo assertions containing the text."""
    stripped = line.lstrip()
    if not stripped or stripped.startswith("#"):
        return False
    return bool(re.match(r"^git(?:\s+-\S+(?:=\S+)?)?\s+push\b", stripped))


def automatic_main_writers() -> list[str]:
    writers: list[str] = []
    for path in sorted((*WORKFLOWS.glob("*.yml"), *WORKFLOWS.glob("*.yaml"))):
        text = path.read_text(encoding="utf-8", errors="replace")
        automatic = re.search(r"(?m)^  (push|pull_request|schedule):", text)
        push_lines = [line for line in text.splitlines() if _is_direct_git_push(line)]
        non_main_targets = ("automation/", "HEAD:agent/", "github.head_ref")
        pushes_main = any(not any(marker in line for marker in non_main_targets) for line in push_lines)
        if automatic and pushes_main:
            writers.append(path.name)
    return writers


def main() -> int:
    errors: list[str] = []
    writers = automatic_main_writers()
    for name in writers:
        if FENCE not in source(name):
            errors.append(f"Automatic main writer lacks release fence: {name}")

    for name in [
        "deploy-admin-auth-v6.yml",
        "aeo-ai-visibility.yml",
        "content-queue-publish.yml",
        "editorial-scheduled-publish.yml",
        "generate-digital-workforce-newsroom-pages.yml",
        "gnk-news-refresh-v2.yml",
        "image-health-scan.yml",
        "macro-market-refresh.yml",
        "market-pulse-refresh.yml",
        "refresh-gnkc-index.yml",
        "sync-webshop-products.yml",
        "weather-refresh.yml",
        "world-monitor-refresh.yml",
    ]:
        if SERIAL_GROUP not in source(name):
            errors.append(f"Production main mutator lacks shared serialization: {name}")
    if "'gnk-asg-main-mutation'" not in source("refresh-index-live-data.yml"):
        errors.append("refresh-index-live-data.yml lacks shared writer serialization")

    for name in ["gallery-sync.yml", "public-portal-audit.yml"]:
        text = source(name)
        if re.search(r"(?m)^  (push|pull_request|schedule):", text):
            errors.append(f"{name} must remain manual-only")
        if not re.search(r"(?m)^  workflow_dispatch:", text):
            errors.append(f"{name} must retain workflow_dispatch")

    print({"version":"GNK_ASG_RELEASE_RACE_HYGIENE_V1","automaticMainWriters":writers,"releaseFenceVariable":"GNK_ASG_RELEASE_FENCE","sharedConcurrencyGroup":"gnk-asg-main-mutation","errors":errors})
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
