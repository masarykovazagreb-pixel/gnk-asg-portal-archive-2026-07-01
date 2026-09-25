#!/usr/bin/env python3
"""Fail-closed maintenance freshness audit.

This script never refreshes timestamps. It evaluates observed producer evidence
against ops/maintenance-freshness-contract-v1.json and emits a machine-readable
classification. FRESH requires real output evidence within cadence.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

VALID_STATES = {"FRESH", "STALE", "DEGRADED", "BLOCKED", "UNKNOWN"}


def parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        raise ValueError(f"timestamp must be timezone-aware: {value}")
    return dt.astimezone(timezone.utc)


def evidence_fingerprint(record: dict) -> str:
    stable = {
        k: v
        for k, v in record.items()
        if k not in {"evaluated_at", "state", "reason", "age_minutes", "missed_cycles"}
    }
    raw = json.dumps(stable, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def classify(spec: dict, record: dict, now: datetime, policy: dict) -> dict:
    cadence = int(spec["cadenceMinutes"])
    required = list(spec.get("requiredEvidence", []))
    missing = [field for field in required if not record.get(field)]
    result = {
        "id": spec["id"],
        "surface": spec["surface"],
        "cadence_minutes": cadence,
        "evaluated_at": now.isoformat().replace("+00:00", "Z"),
        "state": "UNKNOWN",
        "reason": "no evidence record",
        "age_minutes": None,
        "missed_cycles": None,
        "evidence_fingerprint": evidence_fingerprint(record) if record else None,
    }
    if not record:
        result.update(state="BLOCKED", reason="missing producer evidence")
        return result
    if missing:
        result.update(state="BLOCKED", reason=f"missing required evidence: {', '.join(missing)}")
        return result
    try:
        last_success = parse_ts(record.get("last_success_at"))
        observed = parse_ts(record.get("observed_output_at") or record.get("heartbeat_at"))
    except (ValueError, TypeError) as exc:
        result.update(state="BLOCKED", reason=f"invalid timestamp evidence: {exc}")
        return result
    if last_success is None or observed is None:
        result.update(state="BLOCKED", reason="success/output timestamps unavailable")
        return result
    # Prevent a metadata-only bump from creating freshness. Output observation must
    # not predate the claimed successful producer execution.
    if observed < last_success:
        result.update(state="DEGRADED", reason="observed output predates last successful run")
        return result
    age_minutes = max(0.0, (now - last_success).total_seconds() / 60.0)
    missed_cycles = age_minutes / cadence
    result["age_minutes"] = round(age_minutes, 2)
    result["missed_cycles"] = round(missed_cycles, 2)
    stale_limit = cadence * float(policy.get("staleAfterCadenceMultiplier", 1.0))
    escalation_limit = cadence * float(policy.get("rootCauseEscalationAfterCadenceMultiplier", 2.0))
    missed_limit = int(policy.get("rootCauseEscalationAfterMissedCycles", 2))
    if age_minutes <= stale_limit:
        result.update(state="FRESH", reason="verified output within producer cadence")
    elif age_minutes >= escalation_limit or missed_cycles >= missed_limit:
        result.update(state="DEGRADED", reason="root-cause/self-heal escalation threshold exceeded")
    else:
        result.update(state="STALE", reason="producer output older than cadence")
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contract", default="ops/maintenance-freshness-contract-v1.json")
    parser.add_argument("--evidence", required=True, help="JSON object keyed by producer id")
    parser.add_argument("--now", help="ISO-8601 evaluation time; defaults to current UTC")
    parser.add_argument("--output", help="optional JSON output path")
    args = parser.parse_args()

    contract = json.loads(Path(args.contract).read_text(encoding="utf-8"))
    evidence = json.loads(Path(args.evidence).read_text(encoding="utf-8"))
    policy = contract.get("policy", {})
    allowed = set(policy.get("allowedStates", []))
    if allowed and allowed != VALID_STATES:
        raise SystemExit(f"contract allowedStates mismatch: {sorted(allowed)}")
    ids = [spec.get("id") for spec in contract.get("producerClasses", [])]
    if not ids or any(not item for item in ids) or len(ids) != len(set(ids)):
        raise SystemExit("producerClasses must contain unique non-empty ids")
    if not policy.get("timestampBumpDoesNotCountAsRefresh", False):
        raise SystemExit("contract must forbid timestamp-only refresh")
    if not policy.get("healthyRequiresObservedOutput", False):
        raise SystemExit("contract must require observed output")
    if policy.get("blindRerunAllowed", True):
        raise SystemExit("contract must forbid blind reruns")

    now = parse_ts(args.now) if args.now else datetime.now(timezone.utc)
    if now is None:
        raise SystemExit("invalid evaluation time")
    results = [classify(spec, evidence.get(spec["id"], {}), now, policy) for spec in contract["producerClasses"]]
    summary = {state: sum(1 for item in results if item["state"] == state) for state in sorted(VALID_STATES)}
    report = {
        "version": 1,
        "evaluated_at": now.isoformat().replace("+00:00", "Z"),
        "summary": summary,
        "all_fresh": all(item["state"] == "FRESH" for item in results),
        "producers": results,
    }
    rendered = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        Path(args.output).write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    return 0 if report["all_fresh"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
