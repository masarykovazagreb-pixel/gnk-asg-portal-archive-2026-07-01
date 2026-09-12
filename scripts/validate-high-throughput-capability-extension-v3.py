#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path.cwd()
CONTRACT = ROOT / "ops" / "high-throughput-capability-extension-v3.json"
OUT = ROOT / "artifacts" / "high-throughput-capability-extension-v3"
OUT.mkdir(parents=True, exist_ok=True)

failures = []

if not CONTRACT.exists():
    failures.append(f"missing capability contract: {CONTRACT}")
    data = {}
else:
    data = json.loads(CONTRACT.read_text(encoding="utf-8"))

caps = data.get("capabilities", []) if isinstance(data, dict) else []
required_evidence = data.get("requiredRuntimeEvidence", []) if isinstance(data, dict) else []

if data.get("authorityScope") != "R0_R1_ONLY":
    failures.append("authorityScope must remain R0_R1_ONLY")
if data.get("healthyRequiresRuntimeEvidence") is not True:
    failures.append("healthyRequiresRuntimeEvidence must be true")
if data.get("promotionLifecycle") != ["candidate", "sandbox", "shadow", "evaluator", "probation", "healthy"]:
    failures.append("promotionLifecycle must preserve candidate→sandbox→shadow→evaluator→probation→healthy")

required_runtime_fields = {
    "heartbeat", "taskOwnership", "queueState", "latencyMs", "successCount",
    "failureCount", "evaluatorVerdict", "fallbackCoverage", "rollbackCapability", "telemetryRef"
}
if set(required_evidence) != required_runtime_fields:
    failures.append("requiredRuntimeEvidence does not match the fail-closed runtime evidence set")

seen = set()
for idx, cap in enumerate(caps):
    prefix = f"capabilities[{idx}]"
    task_class = cap.get("taskClass")
    if not task_class:
        failures.append(f"{prefix}: missing taskClass")
        continue
    if task_class in seen:
        failures.append(f"{prefix}: duplicate taskClass {task_class}")
    seen.add(task_class)
    if not cap.get("primaryCapability"):
        failures.append(f"{prefix}: missing primaryCapability")
    fallback = cap.get("fallbackPool")
    if not isinstance(fallback, list) or len(set(fallback)) < 2:
        failures.append(f"{prefix}: fallbackPool must contain at least two independent capabilities")
    contract = cap.get("staticContract")
    if not contract or not (ROOT / contract).is_file():
        failures.append(f"{prefix}: staticContract does not materialize: {contract}")
    if cap.get("runtimeStatus") != "UNVERIFIED":
        failures.append(f"{prefix}: runtimeStatus must stay UNVERIFIED until runtime evidence exists")

if len(caps) != 3:
    failures.append(f"expected exactly 3 extension capabilities, found {len(caps)}")

report = {
    "version": "GNK_ASG_HIGH_THROUGHPUT_CAPABILITY_EXTENSION_V3_VALIDATION",
    "ok": not failures,
    "capabilityCount": len(caps),
    "taskClasses": sorted(seen),
    "runtimeHealthyInferred": False,
    "failures": failures,
}
(OUT / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
raise SystemExit(1 if failures else 0)
