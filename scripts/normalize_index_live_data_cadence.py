#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "apps/portal/data"
CADENCE = "six times daily, approximately every four hours"
TARGETS = (
    DATA / "market.json",
    DATA / "market_indices.json",
    DATA / "fast_market_status.json",
)


def main() -> int:
    changed = 0
    for path in TARGETS:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise SystemExit(f"cadence normalization failed: {path} is not a JSON object")
        if payload.get("cadence") != CADENCE:
            payload["cadence"] = CADENCE
            path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            changed += 1
    print(json.dumps({"ok": True, "cadence": CADENCE, "changed_files": changed}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
