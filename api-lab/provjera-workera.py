#!/usr/bin/env python3
"""
PROVJERA WORKERA IZ KONFIGURACIJE

Ne pogadja rute. Cita ih iz workers/*/wrangler.toml i za svaku rutu odredi
koje metode Worker stvarno podrzava tako da pogleda njegov src/index.js.

Zasto: obicna provjera salje GET na pretpostavljenu adresu i biljezi status.
Ako Worker na nepodrzanu metodu vrati 404 umjesto 405 - a nasi to rade -
tablica pokaze da je Worker pao, a on radi savrseno.

Pokretanje:
    python3 provjera-workera.py              # samo cita konfiguraciju, ne zove nista
    python3 provjera-workera.py --pozovi     # stvarno testira rute

SIGURNOST: skripta NIKAD ne salje POST. Za rute koje primaju POST koristi
OPTIONS - to dokazuje da je ruta ziva, a ne pokrece slanje poste,
zakazivanje ni objavu.
"""

import os, re, sys, json, glob, urllib.request, urllib.error

KORIJEN = "workers"


def rute_iz_tomla(put):
    t = open(put, encoding="utf-8", errors="ignore").read()
    ime = re.search(r'^\s*name\s*=\s*"(.+?)"', t, re.M)
    rute = re.findall(r'pattern\s*=\s*"(.+?)"', t)
    return (ime.group(1) if ime else os.path.basename(os.path.dirname(put))), rute


def metode_iz_koda(mapa):
    """Koje metode Worker uopce spominje, i vraca li ikad 405."""
    kod = ""
    for p in glob.glob(os.path.join(mapa, "src", "*.js")) + glob.glob(os.path.join(mapa, "*.js")):
        try:
            kod += open(p, encoding="utf-8", errors="ignore").read()
        except Exception:
            pass
    if not kod:
        return set(), False
    m = set(re.findall(r'method\s*[!=]==?\s*["\'](\w+)["\']', kod))
    m |= set(re.findall(r'["\'](GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)["\']\s*[,\]]', kod))
    return m, "405" in kod


def metoda_za_provjeru(metode):
    """Sto poslati da rutu potvrdimo bez nuspojava."""
    if not metode:
        return "GET", "nepoznato iz koda"
    if "GET" in metode:
        return "GET", "Worker podrzava GET"
    if "OPTIONS" in metode:
        return "OPTIONS", "POST-only ruta, OPTIONS je siguran"
    return "HEAD", "nema GET ni OPTIONS, saljem HEAD"


def pozovi(url, metoda):
    r = urllib.request.Request(url, method=metoda,
                               headers={"User-Agent": "gnk-asg-route-probe/1.0",
                                        "Origin": "https://gnk-asg.hr"})
    try:
        with urllib.request.urlopen(r, timeout=12) as o:
            return o.status, o.headers.get("Access-Control-Allow-Methods") or "-"
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Access-Control-Allow-Methods") or "-"
    except Exception as e:
        return None, str(e)[:60]


def main():
    zovi = "--pozovi" in sys.argv
    redovi = []

    for toml in sorted(glob.glob(os.path.join(KORIJEN, "*", "wrangler.toml"))):
        mapa = os.path.dirname(toml)
        ime, rute = rute_iz_tomla(toml)
        metode, ima405 = metode_iz_koda(mapa)

        if not rute:
            redovi.append({"worker": ime, "ruta": "(nema rute u tomlu)", "metoda": "-",
                           "status": "NIJE_VEZAN", "biljeska": "wrangler.toml nema pattern"})
            continue

        for r in rute:
            m, zasto = metoda_za_provjeru(metode)
            url = "https://" + r.replace("*", "")
            red = {"worker": ime, "ruta": r, "metoda": m, "zasto": zasto,
                   "vraca_405": ima405, "metode_u_kodu": sorted(metode)}
            if zovi:
                st, dop = pozovi(url, m)
                red["status"] = st
                red["allow"] = dop
                if st == 404 and not ima405:
                    red["biljeska"] = "404 moze znaciti krivu metodu - Worker nigdje ne vraca 405"
            redovi.append(red)

    sirina = "{:<34}{:<40}{:<9}{:>7}  {}"
    print(sirina.format("WORKER", "RUTA", "METODA", "STATUS", "BILJESKA"))
    print("-" * 118)
    for r in redovi:
        print(sirina.format(r["worker"][:33], r["ruta"][:39], r["metoda"],
                            str(r.get("status", "—")), r.get("biljeska", r.get("zasto", ""))[:40]))

    json.dump(redovi, open("provjera-workera.json", "w"), indent=1, ensure_ascii=False)

    nevezani = [r for r in redovi if r.get("status") == "NIJE_VEZAN"]
    if nevezani:
        print("\nWORKERI BEZ IJEDNE RUTE U KONFIGURACIJI:")
        for r in nevezani:
            print(f"  - {r['worker']}  (kod postoji, ali nije vezan ni uz jednu adresu)")

    print("\nDetalji: provjera-workera.json")
    if not zovi:
        print("Pokreni s --pozovi da se rute stvarno testiraju.")


if __name__ == "__main__":
    main()
