# GNK ASG portal — izvještaj o validaciji 3D mreže i javnih podataka

**Datum provjere:** 23. svibnja 2026.  
**Projekt:** Projekt 2 / `aktualmedia/gnk-asg`  
**Promjena:** PR #2 — rotirajući 3D globus mreže i potpuna validacija podataka  
**Merge commit:** `0d73848e38521a45d03f006786db9205d574b2b3`

## Opseg implementacije

- Dodan je rotirajući 3D Canvas globus globalne mreže društava.
- Zadržana je postojeća animirana 2D mreža kao alternativni prikaz i fallback.
- Dodan je geografski sloj za svih 45 prikazanih lokacija: 33 postojeća društva i 12 planiranih pozicija.
- 3D prikaz podržava ručnu rotaciju, zumiranje, automatsku rotaciju, fokus središta, klik na lokaciju i animirane tokove povezanosti.
- Postojeći tržišni grafikoni i Digital Assets moduli nisu uklonjeni niti zamijenjeni.
- Admin statična poveznica izravno vodi na aktivni statusni workflow `media-monitor-status.yml`.
- PWA cache uključuje 3D module i geografske podatke.

## Provedeni automatizirani test

Workflow: `.github/workflows/portal-validation.yml` — **Portal Validation and Live Data Test**  
GitHub Actions run: `26342102130`  
Job: `77545815460`  
Zaključak: **success**

### 1. Sintaksa i struktura portala

- JavaScript sintaksa aktivnih javnih modula: **PASS**
  - `assets/app.js`
  - `assets/group-network.js`
  - `assets/network-motion.js`
  - `assets/group-globe-3d.js`
  - `assets/admin-status-only.js`
  - tržišni i vijesni moduli
  - `sw.js`
- Python sintaksa automatiziranih procesora: **PASS**
- Početna strukturna provjera pohranjenog portala: **42 / 42 PASS**

### 2. Validacija mreže društava

- Ukupan prikaz: **45 lokacija** — PASS
- Struktura: **33 postojeća društva + 12 planiranih pozicija** — PASS
- Geografske koordinate za sve lokacije — PASS
- Geografske koordinate unutar valjanih raspona — PASS
- Sve međudruštvene veze upućuju na postojeće čvorove — PASS
- Učitavanje 3D CSS/JS i zadržavanje postojećeg animiranog 2D prikaza — PASS

### 3. Sigurnosna validacija admina

- Admin izravno vodi na aktivni `media-monitor-status.yml` workflow — PASS
- Javni red neodobrenih kandidata nije prisutan — PASS
- Javna evidencija odluka nije prisutna — PASS
- Zastarjeli workflow i procesor javnog reda nisu prisutni — PASS
- Javni prikaz ostaje ograničen na status monitoringa i ručno odobrene objave — PASS

### 4. Stvarno povlačenje javnih podataka unutar testa

#### Vijesti i Digital Assets

Izvršena skripta: `python scripts/update_feeds_v2.py`

- Javne vijesti: **372**
- Pogreške izvora: **0**
- Raspodjela po grupama:
  - `digital-assets`: 85
  - `hrvatska`: 20
  - `technology`: 118
  - `bih`: 10
  - `srbija`: 31
  - `international`: 78
  - `slovenija`: 30
- Digital Assets Monitor: **8 valuta**
- BTC graf: **169 podatkovnih točaka**

#### Makro tržišni podatci

Izvršena skripta: `python scripts/update_macro_data.py`

- Učitani tržišni skupovi: **4**
  - Bitcoin
  - zlato
  - Brent nafta
  - USD/EUR
- Pogreške: **0**

#### Media Monitor Status

Izvršena skripta: `python scripts/discover_corporate_media.py`

- Status: **ok**
- Provjereni upiti: **8**
- Pogreške: **0**
- Politika javnog prikaza: `manual_approval_only`
- Neodobreni rezultati ne pohranjuju se niti prikazuju na javnom portalu.

#### SEO

Izvršena skripta: `python scripts/generate_seo.py`

- Generiranje višejezičnog `sitemap.xml` i `robots.txt`: **PASS**

### 5. Završni rezultat nakon stvarnog dohvata

**46 / 46 provjera prošlo; 0 provjera nije prošlo.**

## Workflowi i granica testa

| Workflow | Provjera |
|---|---|
| `portal-validation.yml` | Izvršen; sve provjere prošle |
| `hourly-data-update.yml` | Struktura potvrđena; njegove podatkovne skripte izvršene uživo u validacijskom testu |
| `media-monitor-status.yml` | Struktura potvrđena; skripta statusa izvršena uživo u validacijskom testu |
| `daily-seo-refresh.yml` | Struktura potvrđena; generator izvršen uživo u validacijskom testu |
| `manage-approved-media.yml` | Struktura potvrđena; nije izvršen jer bi bez stvarne odobrene objave mijenjao javni sadržaj |

## Napomena održavanja

GitHub Actions runner tijekom testa izdao je upozorenje da GitHub-owned Actions koji trenutačno koriste Node.js 20 runtime prelaze na Node.js 24. Upozorenje nije prouzročilo neuspjeh testa niti utjecalo na rezultat ove validacije, ali treba ga riješiti u sljedećoj tehničkoj zakrpi workflowa.
