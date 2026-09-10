#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "ops" / "workforce-capability-contract-v1.json"

REQUIRED_EVIDENCE = {
    "heartbeat",
    "taskOwnership",
    "queueState",
    "latencyMs",
    "successCount",
    "failureCount",
    "evaluatorVerdict",
    "fallbackCoverage",
    "rollbackCapability",
    "telemetryRef",
}
REQUIRED_LIFECYCLE = ["candidate", "sandbox", "shadow", "evaluator", "probation", "healthy"]


def fail(message: str) -> None:
    print(f"WORKFORCE_CAPABILITY_CONTRACT_FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    if not CONTRACT.is_file():
        fail(f"missing contract: {CONTRACT.relative_to(ROOT)}")

    try:
        data = json.loads(CONTRACT.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"invalid JSON: {exc}")

    policy = data.get("policy") or {}
    evidence = set(data.get("healthyEvidenceRequired") or [])
    task = data.get("criticalTaskClassRequirements") or {}
    promotion = data.get("promotionRules") or {}
    metrics = data.get("metrics") or {}

    if policy.get("nominalProfilesAreHealthy") is not False:
        fail("nominal profiles must never count as healthy")
    if policy.get("healthyRequiresCompleteEvidence") is not True:
        fail("healthy must require complete evidence")
    if policy.get("ownerGatedAuthorityEscalationForbidden") is not True:
        fail("authority escalation must remain owner-gated")
    if policy.get("singleWriteOwnerLease") is not True:
        fail("single write-owner lease is mandatory")
    if policy.get("requiredLifecycle") != REQUIRED_LIFECYCLE:
        fail("promotion lifecycle must be candidate→sandbox→shadow→evaluator→probation→healthy")

    missing = sorted(REQUIRED_EVIDENCE - evidence)
    if missing:
        fail("missing healthy evidence fields: " + ", ".join(missing))

    for key in (
        "primaryWorkerRequired",
        "fallbackPoolRequired",
        "evidenceLedgerRequired",
        "sloRequired",
        "killSwitchRequired",
        "staleHeartbeatFailsHealthy",
        "unknownEvidenceFailsHealthy",
    ):
        if task.get(key) is not True:
            fail(f"critical task-class requirement must be true: {key}")

    for key in ("sandboxToShadow", "shadowToProbation", "probationToHealthy", "healthyToDegraded", "degradedToHealthy"):
        if not isinstance(promotion.get(key), str) or not promotion[key].strip():
            fail(f"missing promotion rule: {key}")

    if metrics.get("countOnlyHealthyCapabilityCoverage") is not True:
        fail("coverage must count only healthy capabilities")
    for key in ("collisionRateTarget", "staleTaskTarget", "orphanTaskTarget", "projectStarvationTarget"):
        if metrics.get(key) != 0:
            fail(f"metric target must remain zero: {key}")

    print("WORKFORCE_CAPABILITY_CONTRACT_OK")
    print("healthy evidence fields:", len(REQUIRED_EVIDENCE))
    print("lifecycle:", " -> ".join(REQUIRED_LIFECYCLE))


if __name__ == "__main__":
    main()
