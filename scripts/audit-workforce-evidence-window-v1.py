#!/usr/bin/env python3
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / "ops" / "workforce-capability-evidence-v1.json"
ALLOWED = {"candidate","sandbox","shadow","evaluator","probation","healthy"}


def ts(value, label):
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception as exc:
        raise SystemExit(f"FAIL {label}: invalid timestamp ({exc})")


def main():
    data = json.loads(LEDGER.read_text(encoding="utf-8"))
    errors = []
    for i, rec in enumerate(data.get("records", [])):
        task = rec.get("taskClassId") or f"record[{i}]"
        state = rec.get("lifecycleState")
        if state not in ALLOWED:
            errors.append(f"{task}: invalid lifecycleState {state!r}")
            continue
        start = ts(rec.get("sampleWindowStart"), f"{task}.sampleWindowStart")
        end = ts(rec.get("sampleWindowEnd"), f"{task}.sampleWindowEnd")
        heartbeat = ts(rec.get("heartbeatAt"), f"{task}.heartbeatAt")
        queue = ts(rec.get("queueObservedAt"), f"{task}.queueObservedAt")
        if end < start:
            errors.append(f"{task}: reversed sample window")
        if not start <= heartbeat <= end:
            errors.append(f"{task}: heartbeat outside sample window")
        if not start <= queue <= end:
            errors.append(f"{task}: queue observation outside sample window")
        if state == "healthy":
            fallbacks = rec.get("fallbackWorkerIds")
            if not isinstance(fallbacks, list) or len(fallbacks) < 2:
                errors.append(f"{task}: healthy requires at least two fallback workers")
            elif len(set(fallbacks)) != len(fallbacks):
                errors.append(f"{task}: duplicate fallback workers")
            if rec.get("primaryWorkerId") in (fallbacks or []):
                errors.append(f"{task}: primary worker cannot also be fallback")
    if errors:
        print("WORKFORCE EVIDENCE WINDOW: FAIL")
        for err in errors:
            print(f"- {err}")
        raise SystemExit(1)
    print("WORKFORCE EVIDENCE WINDOW: PASS")


if __name__ == "__main__":
    main()
