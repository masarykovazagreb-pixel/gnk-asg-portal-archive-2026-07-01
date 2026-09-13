import json
import pathlib
import sys

ROOT = pathlib.Path.cwd()
manifest_path = ROOT / "ops" / "high-throughput-capability-extension-v2.json"
failures = []

try:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
except Exception as exc:
    print(json.dumps({"ok": False, "failures": [f"manifest read failed: {exc}"]}, indent=2))
    sys.exit(1)

caps = data.get("capabilities") or []
seen_task_classes = set()
seen_primary = set()

if data.get("authorityScope") != "R0_R1_ONLY":
    failures.append("authorityScope must remain R0_R1_ONLY")
if data.get("healthyRequiresRuntimeEvidence") is not True:
    failures.append("healthyRequiresRuntimeEvidence must be true")
if data.get("promotionLifecycle") != ["candidate", "sandbox", "shadow", "evaluator", "probation", "healthy"]:
    failures.append("promotionLifecycle is not the approved lifecycle")

for cap in caps:
    task = cap.get("taskClass")
    primary = cap.get("primaryCapability")
    fallbacks = cap.get("fallbackPool") or []
    contract = cap.get("staticContract")
    status = cap.get("runtimeStatus")

    if not task or task in seen_task_classes:
        failures.append(f"invalid or duplicate taskClass: {task}")
    else:
        seen_task_classes.add(task)

    if not primary or primary in seen_primary:
        failures.append(f"invalid or duplicate primaryCapability: {primary}")
    else:
        seen_primary.add(primary)

    if len(fallbacks) < 2 or len(set(fallbacks)) != len(fallbacks):
        failures.append(f"{task}: fallbackPool must contain at least two distinct fallbacks")
    if primary in fallbacks:
        failures.append(f"{task}: primaryCapability cannot also be a fallback")
    if status != "UNVERIFIED":
        failures.append(f"{task}: static topology cannot declare runtime status {status}")
    if not contract or not (ROOT / contract).is_file():
        failures.append(f"{task}: staticContract is missing: {contract}")

required_evidence = set(data.get("requiredRuntimeEvidence") or [])
mandatory = {
    "heartbeat", "taskOwnership", "queueState", "latencyMs", "successCount",
    "failureCount", "evaluatorVerdict", "fallbackCoverage", "rollbackCapability", "telemetryRef"
}
missing = sorted(mandatory - required_evidence)
if missing:
    failures.append("requiredRuntimeEvidence missing: " + ", ".join(missing))

report = {
    "version": "GNK_ASG_HIGH_THROUGHPUT_CAPABILITY_EXTENSION_V2_VALIDATION",
    "ok": not failures,
    "stats": {"taskClasses": len(caps), "distinctPrimaries": len(seen_primary)},
    "failures": failures,
}

out = ROOT / "artifacts" / "high-throughput-capability-extension-v2"
out.mkdir(parents=True, exist_ok=True)
(out / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
if failures:
    sys.exit(1)
