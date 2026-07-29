#!/usr/bin/env python3
"""
TESTIRA SVE — jedna skripta za sva tri registra.

Ulaz:   api-svi-izvori.json  (spojena sva tri registra, 67 izvora)
Izlaz:  api-status-svi.json  + tablica u terminalu

Pokretanje:
    python3 test_svi.py                # samo izvori bez kljuca (50 komada)
    python3 test_svi.py --svi          # i oni s kljucem, ako su kljucevi u env
    python3 test_svi.py --grupa INDIJA # samo jedna skupina

Kljucevi iz env varijabli: CURRENTS_KEY, NEWSDATA_KEY, GNEWS_KEY, GUARDIAN_KEY,
SUGRA_KEY, KDATA_KEY, SHOPSAVVY_KEY, WHEREPARCEL_KEY, ORIZN_KEY, OCM_KEY,
PANAFRICA_KEY, MONO_KEY, ECOURTS_KEY, BUYWHERE_KEY, SHOPEE_KEY.
"""

import json, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

SLIKA = ("image", "image_url", "urlToImage", "thumbnail", "images",
         "flags", "picture", "photo", "logo")

ENV = {
    "currents": "CURRENTS_KEY", "newsdata": "NEWSDATA_KEY", "gnews": "GNEWS_KEY",
    "guardian": "GUARDIAN_KEY", "sugra": "SUGRA_KEY", "kdata_gate": "KDATA_KEY",
    "shopsavvy": "SHOPSAVVY_KEY", "whereparcel": "WHEREPARCEL_KEY",
    "orizn_visa": "ORIZN_KEY", "open_charge_map": "OCM_KEY",
    "pan_africa_data": "PANAFRICA_KEY", "mono": "MONO_KEY",
    "ecourts_india": "ECOURTS_KEY", "buywhere": "BUYWHERE_KEY", "shopee": "SHOPEE_KEY",
}


def ima_slike(o, d=0):
    if d > 4: return False
    if isinstance(o, dict):
        return any((k in SLIKA and v) or ima_slike(v, d + 1) for k, v in o.items())
    if isinstance(o, list):
        return any(ima_slike(v, d + 1) for v in o[:5])
    return False


def broji(d):
    if isinstance(d, list): return len(d)
    if isinstance(d, dict):
        for k in ("results", "articles", "news", "data", "items", "products",
                  "response", "records", "entries"):
            v = d.get(k)
            if isinstance(v, list): return len(v)
            if isinstance(v, dict) and isinstance(v.get("results"), list):
                return len(v["results"])
    return 0


def testiraj(iz):
    ident = iz["id"]
    url = iz.get("endpoint") or iz.get("url") or iz.get("dokumentacija")
    rez = {"id": ident, "naziv": iz["naziv"], "grupa": iz.get("_grupa", ""),
           "kljuc": iz.get("kljuc")}

    if not url:
        rez["status"] = "NEMA_URL"
        return rez

    # izvor s kljucem bez kljuca u okolini -> preskoci
    if iz.get("kljuc") and iz["kljuc"] is not False:
        env = ENV.get(ident)
        if not env or not os.getenv(env):
            rez["status"] = "TREBA_KLJUC"
            rez["poruka"] = f"env {env or ident.upper()+'_KEY'}"
            return rez

    # ako je samo dokumentacijski link, to nije API poziv nego provjera dostupnosti
    samo_doc = not iz.get("endpoint") and not iz.get("url")

    req = urllib.request.Request(url, headers={
        "User-Agent": "gnk-asg-probe/2.0",
        "Origin": "https://gnk-asg.hr",
        "Accept": "application/json, text/html",
    })
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            rez["ms"] = int((time.time() - t0) * 1000)
            rez["cors"] = r.headers.get("Access-Control-Allow-Origin") or "-"
            raw = r.read(400_000)
            rez["kb"] = round(len(raw) / 1024, 1)
            try:
                d = json.loads(raw)
                rez["status"] = "JSON_OK"
                rez["stavki"] = broji(d)
                rez["slike"] = ima_slike(d)
            except Exception:
                rez["status"] = "DOC_ZIV" if samo_doc else "NIJE_JSON"
    except urllib.error.HTTPError as e:
        rez["status"] = f"HTTP_{e.code}"
    except Exception as e:
        rez["status"] = "MRTAV"
        rez["poruka"] = str(e)[:90]
    return rez


def main():
    svi = json.load(open("api-svi-izvori.json"))

    if "--grupa" in sys.argv:
        g = sys.argv[sys.argv.index("--grupa") + 1]
        svi = [i for i in svi if i.get("_grupa") == g]
    if "--svi" not in sys.argv:
        svi = [i for i in svi if i.get("kljuc") is False]

    print(f"Testiram {len(svi)} izvora...\n")
    with ThreadPoolExecutor(max_workers=8) as ex:
        rez = list(ex.map(testiraj, svi))

    rez.sort(key=lambda r: (r["status"] != "JSON_OK", r["grupa"], r["id"]))

    print(f"{'IZVOR':<22}{'GRUPA':<22}{'STATUS':<12}{'ms':>6}{'CORS':>8}{'STAVKI':>7}{'SLIKE':>6}")
    print("-" * 83)
    for r in rez:
        print(f"{r['id'][:21]:<22}{r['grupa'][:21]:<22}{r['status']:<12}"
              f"{r.get('ms',''):>6}{str(r.get('cors',''))[:7]:>8}"
              f"{r.get('stavki',''):>7}{('DA' if r.get('slike') else '-') if 'slike' in r else '':>6}")

    json.dump(rez, open("api-status-svi.json", "w"), indent=1, ensure_ascii=False)

    from collections import Counter
    c = Counter(r["status"] for r in rez)
    print("\nSAZETAK")
    for k, v in c.most_common():
        print(f"  {k:<14} {v}")

    upotrebljivi = [r for r in rez if r["status"] == "JSON_OK"
                    and r.get("cors") not in ("-", None)]
    print(f"\nODMAH UPOTREBLJIVI U PREGLEDNIKU (JSON + CORS): {len(upotrebljivi)}")
    for r in upotrebljivi:
        print(f"  - {r['naziv']} ({r['grupa']}), {r.get('stavki','?')} stavki"
              f"{', ima slike' if r.get('slike') else ''}")
    print("\nDetalji: api-status-svi.json")


if __name__ == "__main__":
    main()
