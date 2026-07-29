#!/usr/bin/env python3
"""
OTKRIVANJE NOVIH API IZVORA

Povlaci oba javna popisa s GitHuba, prosije ih kroz nasa pravila i ispise
SAMO kandidate koji su vrijedni testiranja. Registar se time sam dopunjuje,
umjesto da netko rucno cita README od 2000 redaka.

Pravila prosijavanja:
  1. Ne smije duplicirati ono sto vec imamo (api-svi-izvori.json + rucni popis)
  2. Bez kljuca ili s potvrdenim CORS-om
  3. Mora se ticati naseg posla - vijesti, trzista, tvrtke, trgovina,
     regije od interesa, vertikale grupe

Pokretanje:
    python3 otkrij-nove-api.py
    python3 otkrij-nove-api.py --sve     # i one koje bi inace odbacio
"""

import json, os, re, sys, urllib.request

POPISI = [
    ("public-apis", "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"),
    ("public-api-lists", "https://raw.githubusercontent.com/public-api-lists/public-api-lists/master/README.md"),
]

# podrucja koja vec pokrivamo drugim izvorom - novi kandidat u istom
# podrucju ne donosi nista
POKRIVENO = [
    "exchange rate", "currency conversion", "forex", "crypto", "bitcoin",
    "ethereum", "stock market data", "realtime stock", "historical stock",
    "covid", "public transport", "ip geolocation", "ip address", "zip code",
    "postal code", "weather forecast", "stock photos", "namedays", "horoscope",
]

ZANIMA_NAS = [
    "news", "media", "press", "market", "trade", "commerce", "shop", "product",
    "company", "companies", "registry", "trademark", "patent", "sanction",
    "tender", "procurement", "bank", "iban", "vat", "tax", "customs",
    "india", "pakistan", "asia", "china", "japan", "korea", "africa", "nigeria",
    "kenya", "indonesia", "singapore", "malaysia", "vietnam", "bangladesh",
    "brazil", "energy", "electric", "grid", "cyber", "security", "education",
    "university", "government", "open data", "statistics", "economic",
]


def povuci(url):
    r = urllib.request.Request(url, headers={"User-Agent": "gnk-asg-discovery/1.0"})
    return urllib.request.urlopen(r, timeout=30).read().decode("utf-8", "ignore")


def vec_imamo():
    imena = set()
    if os.path.exists("api-svi-izvori.json"):
        for i in json.load(open("api-svi-izvori.json")):
            imena.add(i["naziv"].strip().lower())
    return imena


def prosij(tekst, izvor, poznati, sve=False):
    nadjeno = []
    for red in tekst.splitlines():
        if not red.startswith("|") or "---" in red or "Description" in red:
            continue
        d = [x.strip() for x in red.strip().strip("|").split("|")]
        if len(d) < 4:
            continue
        m = re.match(r"\[(.+?)\]\((.+?)\)", d[0])
        if not m:
            continue
        naziv, url = m.group(1).strip(), m.group(2).strip()
        opis = d[1]
        kljuc = d[2].strip("`")
        cors = d[4] if len(d) > 4 else "Unknown"
        nisko = (naziv + " " + opis).lower()

        if naziv.lower() in poznati:
            continue
        if not sve:
            if any(p in nisko for p in POKRIVENO):
                continue
            if not any(z in nisko for z in ZANIMA_NAS):
                continue
            if kljuc != "No" and cors != "Yes":
                continue

        nadjeno.append({"naziv": naziv, "opis": opis[:110], "url": url,
                        "kljuc": kljuc, "cors": cors, "popis": izvor})
    return nadjeno


def main():
    sve = "--sve" in sys.argv
    poznati = vec_imamo()
    print(f"Vec u registru: {len(poznati)} izvora\n")

    svi, vidjeni = [], set()
    for ime, url in POPISI:
        try:
            t = povuci(url)
        except Exception as e:
            print(f"  ne mogu povuci {ime}: {e}")
            continue
        for k in prosij(t, ime, poznati, sve):
            if k["naziv"].lower() in vidjeni:
                continue
            vidjeni.add(k["naziv"].lower())
            svi.append(k)

    # bez kljuca prvo, pa oni s CORS-om
    svi.sort(key=lambda k: (k["kljuc"] != "No", k["cors"] != "Yes", k["naziv"]))

    print(f"NOVI KANDIDATI: {len(svi)}\n")
    print(f"{'NAZIV':<28}{'KLJUC':<9}{'CORS':<9}OPIS")
    print("-" * 108)
    for k in svi:
        print(f"{k['naziv'][:27]:<28}{k['kljuc'][:8]:<9}{k['cors'][:8]:<9}{k['opis'][:58]}")

    json.dump(svi, open("novi-kandidati.json", "w"), indent=1, ensure_ascii=False)

    bez = [k for k in svi if k["kljuc"] == "No" and k["cors"] == "Yes"]
    print(f"\nODMAH TESTIRATI (bez kljuca + CORS): {len(bez)}")
    for k in bez[:15]:
        print(f"  - {k['naziv']}: {k['url']}")

    print("\nSpremljeno: novi-kandidati.json")
    print("Nazive iz tog popisa zalijepi u polje na /preuzimanja/api-lab/ i testiraj odmah.")


if __name__ == "__main__":
    main()
