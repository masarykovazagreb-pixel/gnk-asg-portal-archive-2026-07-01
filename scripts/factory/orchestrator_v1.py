#!/usr/bin/env python3
"""Orkestrator tvorničkih agenata (V1). Samo čita i piše tablu; ne mijenja sadržaj.

Čita config/factory-agents-v1.json, provjerava svaku kapiju i računa stanje:
  done     kapija prolazi
  ready    ovisnosti su gotove, agent može odraditi zadatak (kapija ne prolazi)
  waiting  čeka ovisnosti (navedene)
  human    čeka odluku vlasnika ili pravnika (ledger, git, approval)
  skipped  kapija zahtijeva --run (cmd) a nije pokrenuta

Izlaz:
  artifacts/factory/orchestration-board.json   (strojno čitljivo)
  docs/factory/TABLA-V1.md                     (ljudski čitljivo)

Upotreba:
  python3 scripts/factory/orchestrator_v1.py --check   # validira config (DAG, polja); exit 1 ako ne valja
  python3 scripts/factory/orchestrator_v1.py           # izračun stanja bez pokretanja naredbi
  python3 scripts/factory/orchestrator_v1.py --run     # pokreće i cmd kapije (sporo)
"""
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
CONFIG = os.path.join(ROOT, "config", "factory-agents-v1.json")
BOARD = os.path.join(ROOT, "artifacts", "factory", "orchestration-board.json")
BOARD_MD = os.path.join(ROOT, "docs", "factory", "TABLA-V1.md")
LEDGER = os.path.join(ROOT, "config", "approvals-ledger-v1.json")
SOURCES = os.path.join(ROOT, "config", "world-sources-v1.json")
MODES = {"script", "human", "hybrid"}
CHECK_TYPES = {"file", "cmd", "log_pass", "json_eq", "json_max", "world_sources", "approval",
               "git_ancestor", "radio_count"}
RADIO_MARK = b"radio-promo-v1:start"


def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def validate(cfg):
    """Vraća listu grešaka konfiguracije (prazna lista = ispravno)."""
    errs = []
    agents = cfg.get("agents", [])
    ids = [a.get("id") for a in agents]
    if len(ids) != len(set(ids)):
        errs.append("duplicate agent ids")
    known = set(ids)
    for a in agents:
        aid = a.get("id", "?")
        for k in ("id", "name", "role", "mode", "depends_on", "check", "outputs"):
            if k not in a:
                errs.append(f"{aid}: nedostaje polje {k}")
        if a.get("mode") not in MODES:
            errs.append(f"{aid}: nepoznat mode {a.get('mode')}")
        if a.get("check", {}).get("type") not in CHECK_TYPES:
            errs.append(f"{aid}: nepoznat tip kapije {a.get('check', {}).get('type')}")
        for d in a.get("depends_on", []):
            if d not in known:
                errs.append(f"{aid}: ovisnost {d} ne postoji")
    # aciklički graf (DFS)
    graph = {a["id"]: a.get("depends_on", []) for a in agents if "id" in a}
    state = {}

    def visit(n, stack):
        if state.get(n) == 1:
            errs.append("ciklus: " + " -> ".join(stack + [n]))
            return
        if state.get(n) == 2:
            return
        state[n] = 1
        for m in graph.get(n, []):
            if m in graph:
                visit(m, stack + [n])
        state[n] = 2

    for n in graph:
        visit(n, [])
    return errs


def git(*args):
    p = subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True)
    return p.returncode, p.stdout.strip()


def current_branch():
    """Ime stvarnog checkouta, bez pretpostavke da je checkout na stalnoj grani."""
    rc, branch = git("symbolic-ref", "--quiet", "--short", "HEAD")
    if rc == 0 and branch:
        return branch
    rc, commit = git("rev-parse", "--short", "HEAD")
    return f"detached:{commit}" if rc == 0 and commit else "nepoznato"


def check_git_ancestor(check):
    rc, base = git("rev-parse", "--verify", "-q", check.get("base", "origin/main"))
    if rc:
        return False, "nema reference " + check.get("base", "origin/main")
    rc, head = git("rev-parse", "--verify", "-q", check.get("head", "HEAD"))
    rc, mb = git("merge-base", base, head)
    if not mb:
        return False, "main i grana nemaju zajednički predak; spajanje nije moguće bez odluke vlasnika"
    return True, f"zajednički predak {mb[:9]}"


def check_world_sources(check):
    data = load_json(SOURCES)
    ok, total = [], 0
    for cc, c in data["countries"].items():
        if c.get("wave") and c["wave"].startswith("W1"):
            total += 1
            if any(s.get("status") == "approved" for s in c.get("sources", [])):
                ok.append(cc)
    need = check.get("min_approved_per_country", 1)
    passed = len(ok) == total and total > 0
    return passed, f"W1: {len(ok)}/{total} država s odobrenim izvorom (potrebno {need} po državi)"


def check_approval(check):
    ledger = load_json(LEDGER)
    for e in ledger["entries"]:
        if e["id"] == check["id"]:
            done = e.get("decision") is not None and e.get("status", "").startswith(("izvršeno", "aktivno"))
            return done, f"{e['id']}: {e.get('status')}"
    return False, f"nema zapisa {check['id']}"


def get_key(obj, dotted):
    cur = obj
    for part in dotted.split("."):
        cur = cur[part]
    return cur


def run_check(agent, run):
    c = agent["check"]
    t = c["type"]
    try:
        if t == "file":
            p = os.path.join(ROOT, c["path"])
            return os.path.exists(p), c["path"] + (" postoji" if os.path.exists(p) else " ne postoji")
        if t == "cmd":
            if not run:
                return None, "pokreće se s --run"
            p = subprocess.run(c["cmd"], cwd=ROOT, capture_output=True, text=True, timeout=900)
            return p.returncode == 0, f"exit {p.returncode}"
        if t == "log_pass":
            p = os.path.join(ROOT, c["path"])
            if not os.path.exists(p):
                return False, c["path"] + " ne postoji"
            ok = re.search(c["pattern"], open(p, encoding="utf-8", errors="replace").read()) is not None
            return ok, "uzorak " + ("nađen" if ok else "nije nađen")
        if t == "json_eq":
            d = load_json(os.path.join(ROOT, c["path"]))
            a, b = get_key(d, c["a"]), get_key(d, c["b"])
            return a == b, f"{c['a']}={a}, {c['b']}={b}"
        if t == "json_max":
            d = load_json(os.path.join(ROOT, c["path"]))
            v = get_key(d, c["key"])
            return v <= c["max"], f"{c['key']}={v} (najviše {c['max']})"
        if t == "world_sources":
            return check_world_sources(c)
        if t == "approval":
            return check_approval(c)
        if t == "git_ancestor":
            return check_git_ancestor(c)
        if t == "radio_count":
            n = 0
            portal = os.path.join(ROOT, "apps", "portal")
            for dp, _, fns in os.walk(portal):
                for fn in fns:
                    if fn.endswith(".html"):
                        with open(os.path.join(dp, fn), "rb") as fh:
                            if RADIO_MARK in fh.read():
                                n += 1
            return n >= c.get("min", 1), f"stranica s radio blokom: {n} (najmanje {c.get('min', 1)})"
    except FileNotFoundError:
        return False, "nema izvještaja (agent ga treba proizvesti)"
    except (OSError, KeyError, ValueError, subprocess.TimeoutExpired) as e:
        return False, f"greška kapije: {e}"
    return False, "nepoznat tip"


def compute(cfg, run):
    agents = cfg["agents"]
    results = {}
    for a in agents:
        ok, detail = run_check(a, run)
        results[a["id"]] = (ok, detail)
    states = {}
    for a in agents:
        aid = a["id"]
        ok, detail = results[aid]
        deps = a.get("depends_on", [])
        pending_deps = [d for d in deps if results.get(d, (False, ""))[0] is not True]
        if ok is True:
            st = "done"
        elif ok is None:
            st = "skipped"
        elif pending_deps:
            st = "waiting"
        elif a["mode"] == "human" or a["check"]["type"] in ("approval", "git_ancestor"):
            st = "human"
        else:
            st = "ready"
        states[aid] = {
            "id": aid,
            "name": a["name"],
            "mode": a["mode"],
            "state": st,
            "check": detail,
            "waiting_on": pending_deps if st == "waiting" else [],
            "role": a["role"],
        }
    return states


def next_actions(cfg, states):
    out = []
    for a in cfg["agents"]:
        s = states[a["id"]]
        if s["state"] == "ready":
            out.append(f"{a['id']} {a['name']}: odraditi ({s['check']})")
        elif s["state"] == "human":
            out.append(f"{a['id']} {a['name']}: čeka vlasnika ({s['check']})")
    return out


def write_outputs(cfg, states, run):
    summary = {}
    for s in states.values():
        summary[s["state"]] = summary.get(s["state"], 0) + 1
    board = {
        "version": "FACTORY_ORCHESTRATION_BOARD_V1",
        "branch": current_branch(),
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ran_commands": run,
        "summary": summary,
        "agents": list(states.values()),
        "next_actions": next_actions(cfg, states),
    }
    os.makedirs(os.path.dirname(BOARD), exist_ok=True)
    with open(BOARD, "w", encoding="utf-8") as fh:
        json.dump(board, fh, ensure_ascii=False, indent=1)
    icon = {"done": "✅", "ready": "🔧", "waiting": "⏳", "human": "🧑", "skipped": "⏭️"}
    lines = [
        "# Tabla tvorničkih agenata (V1)",
        "",
        f"Grana: `{board['branch']}`. Generirano: {board['generatedAt']}. Naredbe pokrenute: {run}.",
        "",
        "Stanje: " + ", ".join(f"{k} {v}" for k, v in sorted(summary.items())),
        "",
        "| Agent | Naziv | Stanje | Provjera | Čeka |",
        "|---|---|---|---|---|",
    ]
    for a in cfg["agents"]:
        s = states[a["id"]]
        waiting = ", ".join(s["waiting_on"]) if s["waiting_on"] else ""
        lines.append(f"| {a['id']} | {a['name']} | {icon.get(s['state'], '')} {s['state']} | {s['check']} | {waiting} |")
    lines += ["", "## Sljedeće radnje", ""]
    lines += [f"- {x}" for x in board["next_actions"]] or ["- nema"]
    with open(BOARD_MD, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    return board


def main():
    cfg = load_json(CONFIG)
    errs = validate(cfg)
    if "--check" in sys.argv:
        for e in errs:
            print("FAIL", e)
        print(json.dumps({"agents": len(cfg["agents"]), "config_errors": len(errs)}))
        return 1 if errs else 0
    if errs:
        for e in errs:
            print("FAIL", e)
        return 1
    run = "--run" in sys.argv
    states = compute(cfg, run)
    board = write_outputs(cfg, states, run)
    print(json.dumps({"summary": board["summary"], "next": len(board["next_actions"])}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
