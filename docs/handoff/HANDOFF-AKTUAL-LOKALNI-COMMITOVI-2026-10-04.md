# HANDOFF — Lokalni (nepushani) commitovi: Aktual Radio USA + modelirani vodiči

- **Datum handoffa:** 2026-10-04
- **Kanonski repo:** `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01`
- **Bazni commit (zadnje potvrđeno stanje na `main`):** `c361a591518cf3ef90a6b56564f045eb286029b2` (merge PR #140)
- **Status:** tri commita postojala su SAMO LOKALNO u zatvorenoj sesiji i **nisu pushani** ni na jedan remote branch.

---

## 1. Lokalni commitovi (novije → starije)

```
9fdeb59  Add Aktual Radio USA and weekly editorial channels
f532abc  Add modeled Aktual Sova guide
0fe58e2  Add modeled GNK Navigator guide
```

### 1.1 `0fe58e2` — Add modeled GNK Navigator guide
- Modelirani (uredničko-modelirani, bez tvrdnji o stvarnim podacima) vodič **GNK Navigator**.
- Namjena: navigacijski/orijentacijski vodič kroz GNK ASG mrežu sadržaja i sekcija portala.
- Očekivani oblik: statična HTML stranica vodiča u `apps/portal/` (HR) uz postojeće konvencije sekcija (vidi npr. `gnk-aktual/`, `knowledge-center/`), s jasnom oznakom da je sadržaj modeliran.

### 1.2 `f532abc` — Add modeled Aktual Sova guide
- Modelirani vodič **Aktual Sova** u istom stilu i s istim konvencijama kao GNK Navigator vodič.
- Očekivani oblik: statična HTML stranica vodiča u `apps/portal/`, s oznakom modeliranog sadržaja, usklađena s `docs/EDITORIAL-CONTENT-DEPTH-RULE.md`.

### 1.3 `9fdeb59` — Add Aktual Radio USA and weekly editorial channels
- Proširenje **Aktual Radija** USA kanalom/kanalima i **tjednim uredničkim kanalima**.
- Nadovezuje se na postojeću infrastrukturu u repou:
  - `apps/portal/assets/aktual-radio-player-v1.js` (engine s listom `STATIONS`, HR/EN nazivi, `streamUrl` + `fallbackStream`, `metadataMode`),
  - `apps/portal/radio/index.html` i `apps/portal/en/radio/index.html`.
- Očekivani oblik: nove stanice u `STATIONS` (javni streamovi + fallback) i/ili tjedne uredničke audio-kanale, uz HR/EN lokalizaciju po postojećem uzorku.

---

## 2. OBAVEZNO PRAVILO ZA NOVU RADNU KOPIJU

> ***Ako*** `git log` ***u novoj radnoj kopiji ne pronađe lokalne commitove, ponovno implementiraj njihov opis iz handoffa; ne pokušavaj ih dohvatiti s remotea jer nisu pushani.***

Konkretno:
1. U novoj sesiji prvo pokreni `git log --oneline -15` i provjeri postoje li `9fdeb59`, `f532abc`, `0fe58e2`.
2. Ako ih **nema** (očekivano — radna kopija kreće od `c361a59`), **ne radi** `git fetch`/`git pull` u potrazi za njima i ne traži ih po remote branchevima — ne postoje tamo.
3. Umjesto toga, ponovno implementiraj sadržaj prema opisima iz točke 1 ovog handoffa, redoslijedom: Navigator vodič → Sova vodič → Radio USA + tjedni kanali.

---

## 3. Nastavak rada (proces)

1. **PR-first:** sav rad na radnom branchu sesije; otvoriti PR prema `main`, bez direktnih pusheva na `main`.
2. **Testovi/provjere:** pokrenuti postojeće validacije repo-a prije mergea (lint/validacijske skripte u `scripts/`, interne QA konvencije iz `docs/qa/`).
3. **Clean merge:** PR mora biti mergeabilan bez konflikata nad aktualnim `main`.
4. **Exact-SHA live provjera:** nakon mergea i deploya potvrditi da live okruženje servira točno merge SHA (postojeća praksa: `artifacts/one-time-deploy-*-status.json` / deploy status provjere), a ne stariji build.

---

## 4. STATUS REIMPLEMENTACIJE (2026-10-04)

Pravilo iz točke 2 je primijenjeno: `git log` u novoj radnoj kopiji (branch
`arena/01a10866-gnk-asg-portal-archive-2026-07`, baza `c361a59`) nije pronašao
lokalne commitove, pa su ponovno implementirani iz opisa, s novim SHA-ovima:

| Stari (izgubljeni) SHA | Novi SHA | Naslov |
|---|---|---|
| `0fe58e2` | `6bd4d84` | Add modeled GNK Navigator guide (`/gnk-navigator/`) |
| `f532abc` | `74b4700` | Add modeled Aktual Sova guide (`/aktual-sova/`) |
| `9fdeb59` | `d968c5e` | Add Aktual Radio USA and weekly editorial channels |

Opseg reimplementacije:
- `apps/portal/gnk-navigator/index.html` — modelirani orijentacijski vodič (HR), sitemap unos.
- `apps/portal/aktual-sova/index.html` — modelirani noćni pregledni vodič (HR), sitemap unos, poveznica iz Navigatora.
- `apps/portal/assets/aktual-radio-player-v1.js` — 2 nove USA stanice (Country & Americana, Jazz & Soul Lounge), `WEEKLY_CHANNELS` (7 modeliranih tjednih uredničkih kanala) + render, nova promo poruka.
- Select opcije stanica sinkronizirane na `/radio/`, `/en/radio/`, `/gnk-aktual/`, `/en/gnk-aktual/` + generator `scripts/apply-aktual-media-decks-v1.py`.
- Tjedna sekcija (`#aktualWeeklyChannels`) na `/radio/` i `/en/radio/`.

## 5. Napomena o rekonstrukciji

Opisi u točki 1 su rekonstrukcija na razini naslova commitova i postojećeg stanja repo-a. Ako se tijekom reimplementacije pojavi dvojba oko detalja (točan URL streama, naslovi tjednih kanala, opseg vodiča), odluku donijeti u skladu s postojećim uzorcima u `aktual-radio-player-v1.js` i uredničkim pravilima repo-a, te je zabilježiti u PR opisu.
