#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / "ops" / "workforce-capability-evidence-v1.json"
SCHEMA = ROOT / "ops" / "workforce-capability-evidence-schema-v1.json"
TASK_CLASSES = ROOT / "ops" / "workforce-critical-task-classes-v1.json"


def fail(msg: str) -> None:
    print(f"WORKFORCE_CAPABILITY_EVIDENCE_FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"cannot read {path.relative_to(ROOT)}: {exc}")


def parse_ts(value, label):
    if not isinstance(value, str) or not value.strip():
        fail(f"missing timestamp: {label}")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        fail(f"invalid timestamp: {label}")


def main() -> None:
    if not LEDGER.is_file():
        fail("missing canonical evidence ledger")
    data = load(LEDGER)
    schema = load(SCHEMA)
    task_contract = load(TASK_CLASSES)
    required = set(schema.get("recordRequired") or [])
    declared_items = task_contract.get("taskClasses")
    if not isinstance(declared_items, list) or not declared_items:
        fail("critical task-class contract is empty")
    declared = {item.get("id") for item in declared_items if isinstance(item, dict) and item.get("id")}
    if len(declared) != len(declared_items):
        fail("critical task-class contract contains invalid or duplicate ids")

    records = data.get("records")
    if not isinstance(records, list):
        fail("records must be an array")

    seen = set()
    healthy = 0
    for idx, record in enumerate(records):
        if not isinstance(record, dict):
            fail(f"record[{idx}] must be an object")
        missing = sorted(required - set(record))
        if missing:
            fail(f"record[{idx}] missing fields: {', '.join(missing)}")
        task_class = record.get("taskClassId")
        if not isinstance(task_class, str) or not task_class.strip():
            fail(f"record[{idx}] invalid taskClassId")
        if task_class not in declared:
            fail(f"runtime evidence references undeclared task class: {task_class}")
        if task_class in seen:
            fail(f"duplicate taskClassId: {task_class}")
        seen.add(task_class)
        lifecycle = record.get("lifecycleState")
        if lifecycle == "healthy":
            if record.get("evaluatorVerdict") != "pass":
                fail(f"healthy task class lacks evaluator pass: {task_class}")
            if not isinstance(record.get("fallbackWorkerIds"), list) or not record["fallbackWorkerIds"]:
                fail(f"healthy task class lacks fallback worker: {task_class}")
            if not record.get("evaluatorEvidenceRef") or not record.get("fallbackEvidenceRef") or not record.get("rollbackEvidenceRef") or not record.get("telemetryRef"):
                fail(f"healthy task class lacks resolvable evidence refs: {task_class}")
            if not record.get("ownershipLeaseId"):
                fail(f"healthy task class lacks ownership lease: {task_class}")
            if not isinstance(record.get("latencyMs"), (int, float)) or record["latencyMs"] < 0:
                fail(f"healthy task class has invalid latency: {task_class}")
            if not isinstance(record.get("successCount"), int) or record["successCount"] <= 0:
                fail(f"healthy task class requires successful executions: {task_class}")
            if not isinstance(record.get("failureCount"), int) or record["failureCount"] < 0:
                fail(f"healthy task class has invalid failureCount: {task_class}")
            start = parse_ts(record.get("sampleWindowStart"), f"{task_class}.sampleWindowStart")
            end = parse_ts(record.get("sampleWindowEnd"), f"{task_class}.sampleWindowEnd")
            heartbeat = parse_ts(record.get("heartbeatAt"), f"{task_class}.heartbeatAt")
            queue_at = parse_ts(record.get("queueObservedAt"), f"{task_class}.queueObservedAt")
            if end < start:
                fail(f"sample window reversed: {task_class}")
            if heartbeat < start or queue_at < start:
                fail(f"healthy evidence predates sample window: {task_class}")
            healthy += 1

    missing_records = sorted(declared - seen)
    total = len(declared)
    coverage = (healthy / total) * 100.0
    print("WORKFORCE_CAPABILITY_EVIDENCE_OK")
    print(f"task_classes_total={total}")
    print(f"task_classes_with_runtime_records={len(seen)}")
    print(f"task_classes_missing_runtime_records={len(missing_records)}")
    print(f"task_classes_healthy={healthy}")
    print(f"healthy_capability_coverage={coverage:.2f}%")
    if missing_records:
        print("missing_runtime_task_classes=" + ",".join(missing_records))
    if healthy == 0:
        print("coverage_state=UNVERIFIED_NO_HEALTHY_RUNTIME_EVIDENCE")


if __name__ == "__main__":
    main()
