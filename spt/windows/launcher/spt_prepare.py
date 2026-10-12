"""
SPT 2.5 — priprema baze pri instalaciji                    produced by GNK ASG

Instalacija (install.ps1) ovo pokreće jednom nakon kopiranja aplikacije kako bi
se baza (spt.db: 1.423 sportaša, 75 sportova, ~27.700 sesija) izgradila odmah,
a ne pri prvom otvaranju SPT-a. Postojeća baza se NE dira (nadogradnja čuva
podatke) — samo se primijene migracije.

  python -X utf8 spt_prepare.py [putanja-zapisa]
"""
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))


def main(argv):
    log_path = argv[1] if len(argv) > 1 else os.path.join(HERE, "spt-prepare.log")
    try:
        log = open(log_path, "a", encoding="utf-8", buffering=1)
        sys.stdout = sys.stderr = log
    except OSError:
        pass
    if HERE not in sys.path:
        sys.path.insert(0, HERE)
    os.chdir(HERE)
    t0 = time.time()
    print(f"[SPT] priprema baze — Python {sys.version.split()[0]}")
    import server  # noqa: E402  (server.py iz iste mape)
    server.ensure_db()
    server.migrate_21()
    server.migrate_23()
    server.migrate_25()
    print(f"[SPT] baza spremna za {time.time() - t0:.1f} s -> {server.DB_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
