# MASTER ASG — jedinstveni operativni backlog

> **Ažurirano:** 2026-09-23 (Europe/Zagreb) · **Status izvora:** `main` @ `933cb6d` + `gh issue list` (12 otvorenih)
> **Pravilo:** ovaj dokument je JEDINI aktivni backlog. Povijesni
> `ops/MASTER_ASG_BACKLOG_2026-09-06.md` i `ops/MASTER_ASG_99_BACKLOG.md` su zamrznuti
> (vidi `docs/governance/AUDIT-TRAIL.md`).
>
> **Jedan pisac po resursu:** vidi `ops/CONTROL-PLANE.json` (strojno-čitljiv manifest).
> **Merge ≠ LIVE:** ništa nije DONE dok exact-SHA deploy + javna provjera ne prođe.

---

## 1. Što se mijenjalo u međuvremenu (da ne čitamo tri vremenske linije)

Zaključci s **današnjim** dokazom (2026-09-23), koji PONIŠTAVAJU zastarjele stavke:

| Stara tvrdnja (iz zamrzanih backlogova) | Dans status |
|---|---|
| "Actions runner ne preuzima ni jedan korak (runner P0)" | **Zastarjelo.** Zadnji runovi success (AEO, weather, deploy, blog, news-refresh-v2…). Sonda `actions-execution-probe` success. |
| "AKTUAL/news freshness stale od 2026-09-01" | **Zastarjelo.** `news-automation-status` svjež 2026-09-23T07:56, `freshness-status`=fresh. |
| "Weather stale" | **Zastarjelo.** `weather-zagreb.json` = live, 07:40. |
| "Fast market stale" | **Djelomično.** Indeksi (`market_indices`, `fast_market_status`) svježi (refresh-index-live-data, posljednji uspjeh 09-22 18:44). **Orphan 6 fajlova** zamrznuto na 2026-06-01 (vidi P1-8). |
| "Runner-independent R0/R1 smije nastaviti" | i dalje vrijedi. |

---

## 2. P0 — izvršenje i svježina (aktivno)

| ID | Stavka | Status | Dokaz / vlasnik |
|---|---|---|---|
| P0-1 | `refresh-index-live-data.yml` — **nema runa od 09-22 18:44 UTC** (očekivani: 07:05 i 15:05 UTC). Ovo je uzrok "crypto 463h" u production watchdogu (market.json samo naknadno svjež). | **otvoreno — istraži trigger** | Actions disabled misija? GitHub var `GNK_ASG_RELEASE_FENCE`? (403 za bot) |
| P0-2 | `btc_chart.json` + 5 rođaka (`stablecoins`, `exchange_compare`, `stock_exchanges`, `asg_gold_asset`, `reference_assets_status`) **zamrznuti na 2026-06-01**. | **otvoreno — odluka vlasnika** | bivši pisac `apps/portal/.github/workflows/fast-market-update.yml` (ukinut; nested .github NE registriran) |
| P0-3 | `seo-news-cycle.yml` (`SEO and News Visibility Audit`) — **0 aktivnih runa** (bez vlastitog scheduela, bez dispatch zadnjih 30 dana). DONE ili reconnect? | **otvoreno** | u `BLUEPRINT` "2h :17" očito zastarjelo |
| P0-4 | Watchdog false-red (10:16:59Z) — editorial gate + soft-SLA czerwienio bez razloga. | **ISPRAVLJENO 2026-09-23** | `ops-automation-sla-watchdog.yml` (soft/hard debounce + day-boundary fix); čeka merge + prvi 🟢 |
| P0-5 | `editorial-scheduled-publish` — scheduled runovi padali 09-13..09-20, ali dispatch (recovery) prolazi. | **uoči / prati** | zadnji scheduled success 09-22 13:28; dispatch 09-23 10:17 success |

---

## 3. P1 — publikacija, workforce, SEO/indexacija (aktivno)

| ID | Stavka | Status / vlasnik |
|---|---|---|
| P1-1 | `content-queue-publish.yml` 07:20/11:20/15:20 vs `editorial-scheduled-publish` 10:20 — **dva objavljivača istog sadržajnog prostora** (B2). | konsolidiraj — vidi C2 niže |
| P1-2 | EN gap AKTUAL MEDIA (kolumna/stop-tiska/komentari/kuhinja) — treba EN izvor ili JS logiku. | open (R2) — razvoj |
| P1-3 | 240 "tankih" tekstova čeka proširenje na 450–700+ riječi. | open (R1) — uredništvo |
| P1-4 | `btc_chart` konsolidacija tržišne kartice (odluka vlasnika — P0-2). | open |
| P1-5 | Održavanje sitemap/X-Robots/entity integriteta — GSC 4 "duplikat bez kanonske" + 1 "5xx". | open — vlasnik semafori |
| P1-6 | `warm-news-v16` — issues:opened čita case-insensitive? (gledati sljedeći ciljani dispatch). | uoči |

---

## 4. P2 — tehnologija i težina (aktivno)

| ID | Stavka |
|---|---|
| P2-1 | Arhiva 68 neaktivnih `index-*.js` + do 116 nedohvatljivih modula u `direct-operator/src` (`src/_legacy/`) — **nakon vlasnikove potvrde**, uz očuvanje 5 cross-worker modula. |
| P2-2 | Git LFS za `*.pdf` / `*.mp3` / velike `.png` (`.git` 216 MB). |
| P2-3 | Ukinuti/likvidirati `apps/portal/.github/workflows/` (23 nested YAML-a — inertni; zbunjuju). |
| P2-4 | Odlučiti siročad: korijenski `trgovina/`, `audit2_script.sh`, `tmp/`, `tools/`, `operations/news-drafts/`, `.controlled-media-test-assets/`. |

---

## 5. Otvoreni GitHub issues (žive dužnosti)

| # | Datum | Naslov |
|---|---|---|
| 90 | 2026-09-21 | PRODUCTION DEGRADED — 2026-09-21 01:50 UTC |
| 88 | 2026-09-19 | P0: hosted Actions pre-step failure + AKTUAL/market/weather freshness + exact-SHA recovery gates |
| 81 | 2026-09-05 | P0 CI infrastructure: Actions jobs fail before runner execution |
| 80 | 2026-09-05 | P0 Truth/Entity: connected-company count 33 vs 45 |
| 68 | 2026-08-30 | P0 FIX-ONCE: SEO validation gate incomplete despite 100% social-meta score |
| 66 | 2026-08-30 | P0: Hrgović publication missing from source-of-truth |
| 25 | 2026-08-22 | MASTER OSINT FUSION |
| 24 | 2026-08-22 | MASTER INTELLIGENCE |
| 23 | 2026-08-22 | MASTER LEARNING |
| 17 | 2026-08-22 | P0 CI blockers: editorial sitemap drift + 6 broken refs |
| 9  | 2026-08-19 | SEO: Visual Index x-default hreflang + image fallback |
| 8  | 2026-08-19 | MASTER ASG — Editorial live-through audit |

> #90 uredno preslikava P0-1 (crypto tržište — ista stvar). #81 preslikava staru "runner P0" (ovdje zastarjelo, ali issue ostaje dok podaci ne potvrde).

---

## 6. Predloženi redoslijed (za sljedeći ops/razvoj ciklus)

1. P0-1/P0-4: utvrditi module sigurnosnog zida (sada), pa provjeriti prvi 🟢 watchdog.
2. P0-2 (samo ako vlasnik odobri): brisanje ili uvođenje daily chart popunjavanja za 6 orphans.
3. P1-1/P1-2: single-writer za sadržaj (dva objavljivača → jedan), EN gap.
4. P2-1/P2-2: `src/_legacy` + LFS.
5. Nadležnost drugog informatičara: Digital Workforce read+write, Cloudflare/DNS/secrets/rotacija (vidi `docs/ROADMAP-2026-09-23.md` §D).
