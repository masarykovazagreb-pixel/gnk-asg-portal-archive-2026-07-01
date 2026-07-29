#!/usr/bin/env python3
"""GNK ASG Digital Workforce task allocator.

This coordinator only assigns and reports tasks. It never sends mail, deploys,
publishes, changes DNS, or performs financial/payment operations.
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OPS = ROOT / "ops" / "digital-workforce"
REGISTRY_PATH = OPS / "worker-registry.json"
QUEUE_PATH = OPS / "task-queue.json"
REPORT_PATH = OPS / "daily-report.md"
STATE_PATH = OPS / "orchestrator-state.json"

ACTIVE = {"assigned", "in_progress", "verification"}
FINAL = {"completed", "cancelled"}


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def dependencies_complete(task: dict[str, Any], tasks: dict[str, dict[str, Any]]) -> bool:
    return all(tasks.get(dep, {}).get("status") == "completed" for dep in task.get("depends_on", []))


def choose_worker(task: dict[str, Any], workers: list[dict[str, Any]], load: Counter[str]) -> str | None:
    capability = task.get("capability")
    candidates = [
        worker
        for worker in workers
        if worker.get("enabled")
        and capability in worker.get("capabilities", [])
        and load[worker["id"]] < int(worker.get("max_active_tasks", 1))
    ]
    candidates.sort(key=lambda worker: (load[worker["id"]], worker["id"]))
    return candidates[0]["id"] if candidates else None


def main() -> int:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    registry = load_json(REGISTRY_PATH)
    queue = load_json(QUEUE_PATH)
    workers = registry.get("workers", [])
    tasks_list = queue.get("tasks", [])
    tasks = {task["id"]: task for task in tasks_list}

    load: Counter[str] = Counter(
        task.get("assigned_to")
        for task in tasks_list
        if task.get("status") in ACTIVE and task.get("assigned_to")
    )

    assigned: list[str] = []
    blocked: list[str] = []

    for task in sorted(tasks_list, key=lambda item: (-int(item.get("priority", 0)), item["id"])):
        if task.get("status") != "queued":
            continue
        if not dependencies_complete(task, tasks):
            task["status"] = "blocked"
            task["blocked_reason"] = "dependencies"
            task["updated_at"] = now
            blocked.append(task["id"])
            continue
        worker_id = choose_worker(task, workers, load)
        if not worker_id:
            task["status"] = "blocked"
            task["blocked_reason"] = "no-capable-worker-or-capacity"
            task["updated_at"] = now
            blocked.append(task["id"])
            continue
        task["assigned_to"] = worker_id
        task["status"] = "assigned"
        task["assigned_at"] = now
        task["updated_at"] = now
        load[worker_id] += 1
        assigned.append(task["id"])

    queue["updated_at"] = now
    write_json(QUEUE_PATH, queue)

    status_counts = Counter(task.get("status", "unknown") for task in tasks_list)
    report_lines = [
        "# Dnevni izvještaj digitalne radne snage",
        "",
        f"Generirano: `{now}`",
        "",
        "## Sažetak",
        "",
        f"- Ukupno zadataka: **{len(tasks_list)}**",
        f"- Novo dodijeljeno: **{len(assigned)}**",
        f"- Blokirano: **{status_counts['blocked']}**",
        f"- U radu: **{sum(status_counts[s] for s in ACTIVE)}**",
        f"- Završeno: **{status_counts['completed']}**",
        "",
        "## Zadaci",
        "",
        "| ID | Prioritet | Status | Radnik | Kontrolor | Zadatak |",
        "|---|---:|---|---|---|---|",
    ]
    for task in sorted(tasks_list, key=lambda item: (-int(item.get("priority", 0)), item["id"])):
        report_lines.append(
            "| {id} | {priority} | {status} | {worker} | {controller} | {title} |".format(
                id=task["id"],
                priority=task.get("priority", ""),
                status=task.get("status", ""),
                worker=task.get("assigned_to") or "—",
                controller=task.get("controller") or "—",
                title=str(task.get("title", "")).replace("|", "\\|"),
            )
        )

    report_lines.extend(
        [
            "",
            "## Sigurnosne ograde",
            "",
            "Koordinator ne šalje poštu, ne objavljuje sadržaj, ne radi deploy, ne mijenja DNS/secrete i ne izvršava financijske ili ugovorne radnje. Takvi zadaci moraju imati zasebno odobrenje i izvršni kanal.",
            "",
        ]
    )
    REPORT_PATH.write_text("\n".join(report_lines), encoding="utf-8")

    state = {
        "version": 1,
        "last_run_at": now,
        "assigned": assigned,
        "blocked": blocked,
        "worker_load": dict(sorted(load.items())),
        "status_counts": dict(sorted(status_counts.items())),
    }
    write_json(STATE_PATH, state)
    print(json.dumps(state, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
