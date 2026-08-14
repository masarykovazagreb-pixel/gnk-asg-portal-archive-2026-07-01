#!/usr/bin/env python3
"""Fail closed when a scheduled workflow or cron is absent from the production allowlist."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
ALLOWLIST = ROOT / "ops" / "production-workflow-allowlist-v2.json"


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
    print(json.dumps({"version":"GNK_ASG_WORKFLOW_SCHEDULE_GATE_V2","scheduledWorkflows":actual,"count":len(actual),"errors":errors}, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
