# Orkestracija tvorničkih agenata (V1, 30. 10. 2026.)

Cilj: jedan izvor istine o tome što je gotovo, što je spremno, što čeka koga.
Konfiguracija: `config/factory-agents-v1.json`. Ledger odobrenja: `config/approvals-ledger-v1.json`.
Izvori po državi: `config/world-sources-v1.json`. Tabla: `docs/factory/TABLA-V1.md` (generirano).

## Principi

1. Nema novog crona ni deploy bota (AGENTS.md, pravilo 6). Orkestrator se pokreće ručno.
2. Nema LLM-a u kapijama. Svaka kapija je datoteka, JSON vrijednost, uzorak u logu, status izvora,
   zapis u ledgeru, git predak ili brojanje.
3. Agent ne objavljuje i ne spaja. Spajanje PR-a samo uz izričit OK, zapisan u ledgeru.
4. Agent ne briše objavljeni sadržaj i ne slabi gate. Neprolazna provjera je zadatak s razlogom.
5. Javno ide samo ono što prođe K1 (izvori), K2 (licence), K3 (urednik), K4 (naziv), K5 (test-all), K6 (status live).

## Agenti

| ID | Naziv | Način | Ovisi o | Kapija |
|---|---|---|---|---|
| A00 | Orkestrator | skripta | — | skripta postoji |
| A01 | Registar država | skripta | — | registar postoji i validator prolazi |
| A02 | Izvori (K1) | hibrid | A01 | svaka W1 država ima odobreni izvor |
| A03 | Licence i prava (K2) | čovjek | A02 | pravna potvrda u ledgeru |
| A04 | Predložak kanala | skripta | A02, A03 | država live s odobrenim izvorom |
| A05 | Dizajn i funkcije | skripta | — | audit_portal.py |
| A06 | Meta, SEO i hashtagovi | skripta | — | sve indeksabilne stranice imaju owner hashtagove |
| A07 | Kvaliteta slika | skripta | — | nečitljive slike ≤ 5 |
| A08 | Usklađenost AI (Članak 50) | hibrid | — | provjera AI oznake postoji |
| A09 | Vidljivost i sitemap | skripta | A06 | gate tvornice postoji |
| A10 | Radio | hibrid | — | ≥ 9.000 stranica s radio blokom |
| A11 | Pipeline čuvar | skripta | — | zadnji test-all zapis 82/82 |
| A12 | Stanje grane i povijesti | skripta | — | grana ima zajednički predak s main-om |
| A13 | Konzistentnost podataka | skripta | A12 | region audit: 0 grešaka |
| A14 | Distribucija (nacrti) | hibrid | A10, A09 | nacrti postoje i stanu u limite |
| A15 | Revizor odobrenja | skripta | — | ledger postoji |

## Tijek

```
A01 -> A02 -> A03 -> A04 -> (K1+K2+K3+K4+K5+K6) -> javni kanal
A06 -> A09
A10 + A09 -> A14 (nacrti; ručna objava nakon odobrenja)
A12 -> A13 (podaci; rekonstrukcija zapisa, ne brisanje)
A05, A07, A08, A11, A15: neovisni, pokreću se kad god
```

## Pokretanje

```bash
python3 scripts/factory/orchestrator_v1.py --check   # konfiguracija (DAG, polja)
python3 scripts/factory/orchestrator_v1.py           # tabla bez pokretanja naredbi
python3 scripts/factory/orchestrator_v1.py --run     # uključuje naredbe (sporo)
python3 scripts/factory/radio_promo_kit_v1.py        # A14: nacrti
```

## Redoslijed pipelinea (31. 10.)

Redoslijed je važan. Pogrešan redoslijed je već dvaput pokvario generirane stranice (`og:image` nestao, hashtag redak obrisan).

1. `node apps/sites/build.mjs`: sites prije svega ostalog (zastarjeli `exchange.json` i `sitemap.xml` su rušili `sites-deploy`).
2. Generatori stranica (npr. `build-aktual-media-weekly-archive-v1.mjs --refresh`, `build-agents-page-v1.mjs`, `pages-inventory`). Brišu slojeve i hashtag redak.
3. `sync-all --group=layers`, zatim `apply_standard.py`. Uvijek nakon generatora.
4. `social-cards` poslije `agents-page` i `pages-inventory` (inače gubi `og:image`).
5. `radio_promo_v1.py` i `normalize_meta.py` samo na meta redovima.
6. `audit_portal.py` i `quality_scan_v1.py` kao provjera, ne kao izmjena.

Zamka (31. 10.): `sync-all --group=layers` u lokalnom stablu bez prethodnog builda ruši izlaze. `build-pages-inventory-v1.mjs` broji `apps/world/site`; kad taj izlaz nedostaje, objavljena inventura piše „nije izgrađen“. Zato se generirane datoteke (`docs/izvjestaj-inventure-v1.md`, `apps/portal/sve-stranice/`, `apps/portal/data/network-counts-v1.json`) ne commitaju iz stanja bez punog builda. Provjera je `test-all` na čistom clone-u.

Dnevni ciklus `region-daily`: `recover-items-from-pages-v1.mjs --check` prije `daily.mjs`. Limit zapisa je 5000 (`--max-items`).

## Stanje (31. 10.)

- Gotovo: A00, A01, A05–A11, A14, A15. Nacrti radija: 10, nijedan nije objavljen.
- Spremno za rad: A02 (W1). Svi W1 izvori su blokirani ili pending (vidi `config/world-sources-v1.json`, ledger `w1-uvjeti-izvora`).
- Čeka vlasnika: A03 (pravna potvrda za W1), A12 (`main` nema zajednički predak s granom).
- Čeka ovisnosti: A04, A13.
- Izvještaj: `docs/factory/IZVJESTAJ-2026-10-31.md`.

## Stanje (30. 10.)

- Gotovo: A00, A01, A05, A06, A07, A08, A09, A10, A11, A15 (10 kapija); A14 nacrti zapisani (dodatno).
- Spremno za rad: A02 (W1: 0/7 država s odobrenim izvorom; Austrija blokirana po uvjetima).
- Čeka vlasnika: A03 (pravna potvrda za W1), A12 (main nema zajednički predak s granom).
- Čeka ovisnosti: A04, A13.

## Što orkestrator ne radi

- Ne piše u javne stranice niti u podatke kanala.
- Ne odlučuje o pravnim pitanjima. Ta odluka ide u ledger.
- Ne zaobilazi kapije. Ako kapija padne, zadatak ostaje u tablici.

## Javni centar tvornice

Na `/agenti/#tvornica` nalazi se pregled registra tvorničkih uloga, spremljenog
snimka kapija i stanja država iz `config/world-countries-v1.json`. Centar je
statičan, bez izvršnih kontrola, vanjskih poziva, LLM-a ili automatske objave.
Pretraživanje radi u pregledniku; bez JavaScripta sve kartice ostaju vidljive.
Datum snimka je prikazan jer rezultat nije provjera uživo. Prolaz kapije nije
dokaz da je agent izvršio sav svoj posao ili da je sadržaj objavljen.

Pri osvježavanju prvo generirati snimak `python3 scripts/factory/orchestrator_v1.py`,
zatim stranicu `node scripts/build-agents-page-v1.mjs` i primijeniti standardne
slojeve prema postojećem redoslijedu pipelinea. Generator stranice može ukloniti
zajedničke slojeve; prije objave obavezno pokrenuti sinkronizaciju slojeva i
provjere. Test `node scripts/factory/test_factory_center_v1.mjs` provjerava
usklađenost snimka, sigurnost ispisa i filtriranje.

### Ovisnosti i prikaz država

Orkestrator sada prvo provjerava ovisnosti, uključujući posredne, te ne pokreće
naredbu agenta dok neka od njih nije u stanju `done`. Stanje kapije i dalje je
ograničeno kvalitetom dokaza: samo postojanje datoteke ne znači da je urednički
posao stvarno izvršen. Kapija W1 sada provjerava sve države W1 iz registra,
minimalni broj odobrenih izvora i traženi status, umjesto da izostavljene države
ili nedovoljno izvora prođu kao uspjeh.

`/agenti/#svijet-drzave` prikazuje svih 195 registriranih država, oznaku stanja
iz registra i informacije o zasebnom registru izvora. Veze se nude samo za
registrirane aktivne kanale na GNK ASG-u; planirana Pages adresa nije dokaz da
projekt postoji. Stanja i datumi prikazani su kao podaci iz registra, ne kao
provjera dostupnosti uživo. Popis izvora za već postojeće kanale može se nalaziti
i u `apps/region/channels.json`, pa odsutnost u `world-sources-v1.json` nije dokaz
da ti kanali nemaju izvore. Novi kanali se i dalje ne objavljuju bez kapija K1–K6.

### Usklađivanje javnog prikaza

`node scripts/factory/sync-factory-view-v1.mjs` osvježava samo dvije označene
cjeline centra i registra država na postojećoj stranici agenata, bez prepisivanja
zajedničkih slojeva. Opcija `--check` provjerava stanje bez pisanja. Potpuna sinkronizacija gradi stranicu agenata iz istih registara; ciljani alat može
se pokrenuti odvojeno bez ponovnog generiranja cijele stranice. Nedostajuće ili ponovljene
oznake prekidaju rad; provjera je pokrivena testovima. Pregled razlikuje 14
aktivnih država u registru od tri postojeća gradska kanala u pripremi i prikazuje
konfigurirane izvore iz `channels.json`; to nije dokaz njihovih licenci ili
trenutačne dostupnosti. Bez pravne i uredničke provjere nema nove javne objave.
