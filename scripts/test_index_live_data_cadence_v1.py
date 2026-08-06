#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/refresh-index-live-data.yml"
NORMALIZER = ROOT / "scripts/normalize_index_live_data_cadence.py"
DATA = ROOT / "apps/portal/data"
EXPECTED_CRON = "cron: '5 7,15 * * *'"
EXPECTED_LABEL = "twice daily around 09:05 and 17:05 Europe/Zagreb"
BANNED_LABEL = "scheduled every fifteen minutes"


def fail(message: str) -> None:
    raise SystemExit(f"index cadence contract failed: {message}")


def main() -> int:
    workflow = WORKFLOW.read_text(encoding="utf-8")
    normalizer = NORMALIZER.read_text(encoding="utf-8")

    if workflow.count(EXPECTED_CRON) != 1:
        fail("workflow must contain exactly one twice-daily UTC cron")
    if "cron: '5 * * * *'" in workflow:
        fail("hourly schedule is still present")
    if "python scripts/normalize_index_live_data_cadence.py" not in workflow:
        fail("workflow does not normalize public cadence metadata")
    if EXPECTED_LABEL not in normalizer:
        fail("normalizer does not expose the approved public cadence label")

    checked = 0
    for name in ("market.json", "market_indices.json", "fast_market_status.json"):
        path = DATA / name
        payload = json.loads(path.read_text(encoding="utf-8"))
        cadence = str(payload.get("cadence", ""))
        if cadence != EXPECTED_LABEL:
            fail(f"{name} cadence is not normalized: {cadence!r}")
        if BANNED_LABEL in path.read_text(encoding="utf-8"):
            fail(f"{name} still contains the banned cadence label")
        checked += 1

    print(json.dumps({"ok": True, "cron": EXPECTED_CRON, "cadence": EXPECTED_LABEL, "files_checked": checked}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
