#!/usr/bin/env python3
"""Testovi za orkestrator V1 (validate): ispravna konfiguracija prolazi, a
ciklusi, nepostojeće ovisnosti, duplikati i nepoznate kapije se hvataju.

Pokretanje: python3 scripts/factory/test_orchestrator_v1.py
"""
import copy
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("orchestrator_v1", os.path.join(HERE, "orchestrator_v1.py"))
orch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(orch)

REAL = orch.load_json(orch.CONFIG)


def agent(aid, deps=(), check="file", mode="script"):
    return {
        "id": aid, "name": aid, "role": "test", "mode": mode, "depends_on": list(deps),
        "check": {"type": check}, "outputs": [],
    }


def base():
    return {"agents": [agent("A1"), agent("A2", ["A1"])]}


def test_real_config_is_valid():
    errs = orch.validate(REAL)
    assert errs == [], errs


def test_valid_small_config():
    assert orch.validate(base()) == []


def test_cycle_is_detected():
    cfg = base()
    cfg["agents"][0]["depends_on"] = ["A2"]
    errs = orch.validate(cfg)
    assert any(e.startswith("ciklus") for e in errs), errs


def test_missing_dependency_is_detected():
    cfg = base()
    cfg["agents"][1]["depends_on"] = ["NEMA"]
    errs = orch.validate(cfg)
    assert any("NEMA" in e for e in errs), errs


def test_duplicate_id_is_detected():
    cfg = base()
    cfg["agents"].append(agent("A1"))
    errs = orch.validate(cfg)
    assert "duplicate agent ids" in errs, errs


def test_unknown_check_type_is_detected():
    cfg = copy.deepcopy(base())
    cfg["agents"][0]["check"]["type"] = "ne-postoji"
    errs = orch.validate(cfg)
    assert any("nepoznat tip kapije" in e for e in errs), errs


def test_missing_field_is_detected():
    cfg = copy.deepcopy(base())
    del cfg["agents"][0]["outputs"]
    errs = orch.validate(cfg)
    assert any("nedostaje polje outputs" in e for e in errs), errs


def test_branch_reflects_checkout_and_detached_head():
    original = orch.git
    try:
        orch.git = lambda *args: (0, "radna-grana") if args[0] == "symbolic-ref" else (0, "1234567")
        assert orch.current_branch() == "radna-grana"
        orch.git = lambda *args: (1, "") if args[0] == "symbolic-ref" else (0, "1234567")
        assert orch.current_branch() == "detached:1234567"
        orch.git = lambda *args: (1, "")
        assert orch.current_branch() == "nepoznato"
    finally:
        orch.git = original


def test_dependency_chain_blocks_execution_even_when_check_would_pass():
    cfg = {"agents": [agent("C", ["B"], "cmd"), agent("B", ["A"]), agent("A")]}
    calls = []
    original = orch.run_check
    try:
        def fake(a, run):
            calls.append(a["id"])
            return (False, "blocked") if a["id"] == "A" else (True, "passed")
        orch.run_check = fake
        states = orch.compute(cfg, True)
        assert calls == ["A"], calls
        assert states["A"]["state"] == "ready"
        assert states["B"]["state"] == states["C"]["state"] == "waiting"
        assert states["C"]["waiting_on"] == ["B"]
    finally:
        orch.run_check = original


def test_dependencies_run_in_order_once():
    cfg = {"agents": [agent("B", ["A"]), agent("A"), agent("C", ["A"])]}
    calls, original = [], orch.run_check
    try:
        def fake(a, run):
            calls.append(a["id"])
            return True, "ok"
        orch.run_check = fake
        states = orch.compute(cfg, True)
        assert calls == ["A", "B", "C"], calls
        assert all(s["state"] == "done" for s in states.values())
    finally:
        orch.run_check = original


def test_source_gate_counts_minimum_and_missing_countries():
    original = orch.load_json
    registry = {"countries": [{"cca2":"AA", "wave":"W1", "status":"live"}, {"cca2":"BB", "wave":"W1", "status":"planned"}]}
    sources = {"countries":{"AA":{"sources":[{"status":"approved"}, {"status":"approved"}]}}}
    try:
        orch.load_json = lambda p: sources if p == orch.SOURCES else registry
        assert not orch.check_world_sources({"min_approved_per_country":2})[0]
        sources["countries"]["BB"] = {"sources":[{"status":"approved"}]}
        assert not orch.check_world_sources({"min_approved_per_country":2})[0]
        assert orch.check_world_sources({"min_approved_per_country":1})[0]
        assert not orch.check_world_sources({"min_approved_per_country":1, "require_status":"live"})[0]
        assert not orch.check_world_sources({"min_approved_per_country":0})[0]
    finally:
        orch.load_json = original


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failed = []
    for t in tests:
        try:
            t()
        except AssertionError as e:
            failed.append(f"{t.__name__}: {e}")
    print(json.dumps({"tests": len(tests), "failed": failed}, ensure_ascii=False))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
