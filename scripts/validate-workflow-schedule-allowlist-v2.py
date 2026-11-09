#!/usr/bin/env python3
"""Fail closed when a scheduled workflow or cron is absent from the production allowlist."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
ALLOWLIST = ROOT / "ops" / "production-workflow-allowlist-v2.json"


def cron_field_values(field: str, minimum: int, maximum: int) -> set[int]:
    """Expand fixed, comma-separated and stepped cron fields without undercounting."""
    values: set[int] = set()
    for item in field.split(","):
        if "/" in item:
            base, step_text = item.split("/", 1)
            step = int(step_text)
        else:
            base, step = item, 1
        if base == "*":
            start, end = minimum, maximum
        elif "-" in base:
            start, end = (int(value) for value in base.split("-", 1))
        else:
            start = end = int(base)
        if step < 1 or start < minimum or end > maximum or start > end:
            raise ValueError(f"Invalid cron field: {field}")
        values.update(range(start, end + 1, step))
    return values


def daily_invocations(cron: str) -> tuple[float, list[int]]:
    """Return actual runs/day, including */N minutes and */N hours."""
    fields = cron.split()
    if len(fields) != 5 or fields[2] != "*" or fields[3] != "*":
        raise ValueError(f"Unsupported production cron shape: {cron}")
    minutes = cron_field_values(fields[0], 0, 59)
    hours = cron_field_values(fields[1], 0, 23)
    count = len(minutes) * len(hours)
    day_of_week = fields[4]
    if day_of_week == "*":
        days = [count] * 7
    elif day_of_week.isdigit() and 0 <= int(day_of_week) <= 6:
        days = [0] * 7
        days[int(day_of_week)] = count
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
