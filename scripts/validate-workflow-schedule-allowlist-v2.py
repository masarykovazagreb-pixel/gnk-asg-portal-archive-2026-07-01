#!/usr/bin/env python3
"""Fail closed when a scheduled workflow or cron is absent from the production allowlist."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
ALLOWLIST = ROOT / "ops" / "production-workflow-allowlist-v2.json"


def daily_invocations(cron: str) -> tuple[float, list[int]]:
    """Return average/day and Sunday-first per-day counts for simple production crons."""
    fields = cron.split()
    if len(fields) != 5 or fields[2] != "*" or fields[3] != "*":
        raise ValueError(f"Unsupported production cron shape: {cron}")
    hours = 24 if fields[1] == "*" else len(fields[1].split(","))
    if fields[4] == "*":
        days = [hours] * 7
    elif fields[4].isdigit() and 0 <= int(fields[4]) <= 6:
        days = [0] * 7
        days[int(fields[4])] = hours
    else:
        raise ValueError(f"Unsupported production day-of-week field: {cron}")
    return sum(days) / 7, days


def scheduled_workflows() -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for path in sorted((*WORKFLOWS.glob("*.yml"), *WORKFLOWS.glob("*.yaml"))):
        source = path.read_text(encoding="utf-8", errors="replace")
        if not re.search(r"(?m)^\s+schedule\s*:", source):
            continue
        crons = [item.strip() for item in re.findall(r"cron:\s*['\"]?([^'\"\r\n#]+)", source)]
        if not crons:
            raise ValueError(f"Scheduled workflow has no parseable cron: {path.name}")
        result[path.name] = crons
    return result


def main() -> int:
    policy = json.loads(ALLOWLIST.read_text(encoding="utf-8"))
    allowed = policy.get("scheduledProductionOwners", {})
    actual = scheduled_workflows()
    errors: list[str] = []
    for name in sorted(set(actual) - set(allowed)):
        errors.append(f"Unallowlisted scheduled workflow: {name} {actual[name]}")
    for name in sorted(set(allowed) - set(actual)):
        errors.append(f"Allowlisted workflow is not scheduled or missing: {name}")
    for name in sorted(set(actual) & set(allowed)):
        if actual[name] != allowed[name]:
            errors.append(f"Cron drift for {name}: actual={actual[name]} allowed={allowed[name]}")
    daily = [0] * 7
    average = 0.0
    for crons in actual.values():
        for cron in crons:
            cron_average, cron_days = daily_invocations(cron)
            average += cron_average
            daily = [left + right for left, right in zip(daily, cron_days)]
    print(json.dumps({"version":"GNK_ASG_WORKFLOW_SCHEDULE_GATE_V2","scheduledWorkflows":actual,"count":len(actual),"scheduledInvocationsPerDay":{"sundayThroughSaturday":daily,"average":round(average, 6)},"errors":errors}, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
