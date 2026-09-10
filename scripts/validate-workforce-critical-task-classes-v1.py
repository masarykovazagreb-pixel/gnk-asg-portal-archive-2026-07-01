#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "ops" / "workforce-critical-task-classes-v1.json"
required_evidence = {"heartbeat","taskOwnership","queueState","latencyMs","successCount","failureCount","evaluatorVerdict","fallbackCoverage","rollbackCapability","telemetryRef"}
required_task_classes = {
    "seo-contract-validation",
    "image-seo-validation",
    "public-image-inventory",
    "indexability-validation",
    "route-sitemap-parity",
    "robots-noindex-parity",
    "orphan-internal-link-control",
    "submission-state-evidence",
    "publication-freshness-validation",
    "release-race-hygiene",
    "health-self-heal",
    "hreflang-route-parity",
    "structured-data-entity-consistency",
    "publication-distribution-parity",
    "knowledge-bus-promotion",
    "security-readiness-validation",
}
errors = []

try:
    data = json.loads(path.read_text(encoding="utf-8"))
except Exception as exc:
    raise SystemExit(f"FAIL: cannot read {path}: {exc}")

classes = data.get("taskClasses")
seen = set()
if not isinstance(classes, list) or not classes:
    errors.append("taskClasses must be a non-empty list")
else:
    for item in classes:
        ident = item.get("id")
        if not ident or ident in seen:
            errors.append(f"invalid or duplicate task class id: {ident!r}")
        seen.add(ident)
        if item.get("critical") is not True:
            errors.append(f"{ident}: critical must be true")
        if not item.get("primaryCapability"):
            errors.append(f"{ident}: primaryCapability missing")
        fallback = item.get("fallbackPool")
        if not isinstance(fallback, list) or not fallback:
            errors.append(f"{ident}: fallbackPool must be non-empty")
        evidence = set(item.get("requiredEvidence") or [])
        missing = required_evidence - evidence
        if missing:
            errors.append(f"{ident}: missing required evidence {sorted(missing)}")

missing_classes = required_task_classes - seen
if missing_classes:
    errors.append(f"missing required critical task classes: {sorted(missing_classes)}")

policy = data.get("policy") or {}
if policy.get("authorityScope") != "R0_R1_ONLY":
    errors.append("authorityScope must remain R0_R1_ONLY")
if policy.get("healthyRequiresRuntimeEvidence") is not True:
    errors.append("healthyRequiresRuntimeEvidence must be true")
if policy.get("fallbackRequiredForCritical") is not True:
    errors.append("fallbackRequiredForCritical must be true")
if policy.get("unknownFailsClosed") is not True:
    errors.append("unknownFailsClosed must be true")

if errors:
    print("WORKFORCE CRITICAL TASK-CLASS CONTRACT: FAIL")
    for error in errors:
        print(f"- {error}")
    raise SystemExit(1)

print(f"WORKFORCE CRITICAL TASK-CLASS CONTRACT: PASS ({len(classes)} critical classes declared; runtime health still requires evidence ledger)")
