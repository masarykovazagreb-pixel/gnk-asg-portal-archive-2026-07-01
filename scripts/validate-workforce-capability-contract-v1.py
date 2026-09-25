#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "ops" / "workforce-capability-contract-v1.json"
EVIDENCE_SCHEMA = ROOT / "ops" / "workforce-capability-evidence-schema-v1.json"

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
REQUIRED_EVIDENCE_RECORD_FIELDS = {
    "taskClassId",
    "primaryWorkerId",
    "fallbackWorkerIds",
    "lifecycleState",
    "heartbeatAt",
    "ownershipLeaseId",
    "queueObservedAt",
    "latencyMs",
    "successCount",
    "failureCount",
    "sampleWindowStart",
    "sampleWindowEnd",
    "evaluatorVerdict",
    "evaluatorEvidenceRef",
    "fallbackEvidenceRef",
    "rollbackEvidenceRef",
    "telemetryRef",
}


def fail(message: str) -> None:
    print(f"WORKFORCE_CAPABILITY_CONTRACT_FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path, label: str):
    if not path.is_file():
        fail(f"missing {label}: {path.relative_to(ROOT)}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"invalid {label} JSON: {exc}")


def main() -> None:
    data = load_json(CONTRACT, "contract")
    schema = load_json(EVIDENCE_SCHEMA, "evidence schema")

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

    if schema.get("failClosed") is not True:
        fail("evidence schema must fail closed")
    record_fields = set(schema.get("recordRequired") or [])
    missing_record_fields = sorted(REQUIRED_EVIDENCE_RECORD_FIELDS - record_fields)
    if missing_record_fields:
        fail("missing evidence record fields: " + ", ".join(missing_record_fields))

    healthy_rules = schema.get("healthyRules") or {}
    for key in (
        "heartbeatMustBeFresh",
        "ownershipLeaseMustBeExclusive",
        "queueEvidenceMustBeFresh",
        "executionSampleRequired",
        "successAndFailureCountersRequired",
        "fallbackMustBeIndependentlyVerified",
        "rollbackMustBeDemonstrated",
        "telemetryMustBeResolvable",
        "unknownOrMissingEvidenceFailsHealthy",
    ):
        if healthy_rules.get(key) is not True:
            fail(f"healthy evidence rule must be true: {key}")
    if healthy_rules.get("lifecycleStateMustEqual") != "healthy":
        fail("healthy evidence lifecycleState must equal healthy")
    if healthy_rules.get("evaluatorVerdictMustEqual") != "pass":
        fail("healthy evidence evaluator verdict must equal pass")

    coverage = schema.get("coverageRules") or {}
    if coverage.get("countUnit") != "taskClass":
        fail("coverage must be measured by taskClass")
    for key in (
        "countOnlyHealthy",
        "primaryAndFallbackRequiredForCriticalTaskClass",
        "nominalProfileCountExcluded",
        "syntheticGreenForbidden",
    ):
        if coverage.get(key) is not True:
            fail(f"coverage rule must be true: {key}")

    print("WORKFORCE_CAPABILITY_CONTRACT_OK")
    print("healthy evidence fields:", len(REQUIRED_EVIDENCE))
    print("evidence record fields:", len(REQUIRED_EVIDENCE_RECORD_FIELDS))
    print("lifecycle:", " -> ".join(REQUIRED_LIFECYCLE))


if __name__ == "__main__":
    main()
