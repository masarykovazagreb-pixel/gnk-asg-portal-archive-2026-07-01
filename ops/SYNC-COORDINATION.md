# GNK ASG — Automatsko usklađivanje i sinkronizacija projekata

Ovaj dokument opisuje **tko, kada i kako** sinkronizira sve pokretne dijelove
GNK ASG portala. Kad pišeš "sinkronizira" — misli se na automatski, ne ručni
proces. Ručno pokretanje je moguće preko GitHub Actions "Run workflow", ali
nije potrebno u normalnom radu.

## 1. Kanonski release lanac (merge ≠ LIVE)

Ništa što je merged na `main` nije LIVE dok ne prođe cijeli lanac:

```
autor (ti ili automatika)
    │
    ▼
branch → PR → merge na main
    │
    ▼
exact-SHA production deploy (workflow: deploy-admin-auth-v6)
    │
    ├─ authorize-production
    ├─ deploy-production (Cloudflare Pages/Workers)
    ├─ site-functional-readiness (verifikacija ključnih ruta)
    └─ IndexNow poziv (Bing/Yandex/Seznam)
    │
    ▼
Mirror Sync to Masarykova Backup (rezervna kopija)
    │
    ▼
Blog Mirror Publish (Blogger, Dev.to, Tumblr, Telegraph)
```

Deploy okida commit na `main` — automatski ako je commit napravila automatika,
ručno preko `Deploy Admin Auth V6` workflow-a s `approved_sha` argumentom ako
je commit ručni.

## 2. Tko što piše i kada — cronovi (sva vremena Europe/Zagreb)

| Vrijeme | Workflow | Što radi |
|---|---|---|
| **07:20, 11:20, 15:20** | `content-queue-publish` | Objavljuje READY stavke iz `content/factory-queue/` po `queue.json` kalendaru; commit + exact-SHA deploy |
| **02:15** | `nightly-seo-audit` | Puni pregled meta/H1/canonical/alt na svim stranicama; report u `data/seo-audit/nightly-report.json` |
| **05:30** | `aeo-ai-visibility` | Regenerira `/llms.txt`, `/llms-full.txt`, `entity.jsonld`, `/ai/`; pojačava alt/title na slikama; osvježava hashtag blokove; regenerira image sitemap; deploy |
| **09:30 + na promjenu registryja** | `blog-mirror-publish` | Gura nove editorial stavke na Blogger, Dev.to, Tumblr, Telegraph |
| **na promjenu registryja** | `mirror-sync-masarykova` | Sinkronizira Masarykova mirror |
| **kontinuirano** | `news-refresh` | Osvježava news feed (svjetske vijesti u AKTUAL-u) |
| **kontinuirano** | `market-pulse-refresh` | Osvježava BTC/gold/Brent/USD-EUR podatke |

## 3. Izvori istine (nikada ne prepisivati ručno)

- **Kalendar objava:** `content/factory-queue/queue.json`
  (izvor: `PUBLICATION-CALENDAR-2026-08-10--2026-08-30.csv`)
- **Editorial registry:** `apps/portal/data/editorial-registry.json`
  (piše ga `scripts/content-queue-publish-v1.mjs`; nakon promjene se
  automatski regenerira image sitemap, editorial sitemap i JSON-LD grafovi)
- **AKTUAL raspored:** `apps/portal/data/aktual-world-topics-schedule.json`
- **Entity graf:** `apps/portal/nermin-sefic/entity.jsonld` i
  `apps/portal/data/entity-graph.jsonld` (izvor je AEO workflow, ne treba diranje)

## 4. Kako HR i EN ostaju usklađeni

Svaka stavka u editorial-registryju ima `language` polje. Blog mirror i AEO
skripte biraju kanale i copy po jeziku. Za AKTUAL portal:

- Isti section IDs (`akFeatured`, `akStopTiska`, `akKomentari`, `akKolumna`,
  `akWorldTopics`, `akAllSection`, `akCategories`, `akBurza`) na HR i EN
  stranici — bindanje je jezik-agnostičko.
- Prekidač jezika (HR/EN u zaglavlju) uvijek vodi na **istu logičnu stranicu**
  u drugom jeziku, ne na root domene.
- Isti hreflang par u `<head>` obje strane.
- `aktual-columnist-hub-v1.js` renderira karticu autora na oba jezika iz istog
  izvora podataka (`/data/kolumne.json`); tekst se ne mijenja ovisno o broju
  objavljenih kolumni.

## 5. Kill switch i sigurnost

- `ops/automation-control-v1.json` — glavni prekidač automatizacije
- `ops/automation-kill-switches.json` — pojedinačni kanali/skripte se mogu
  isključiti bez ikakvog deploya
- Sve skripte su **aditivne** (dodaju, ne uklanjaju): commit-history na
  `automation/blog-mirror-state` grani je durable, pa se objave nikad ne dupliciraju

## 6. Prilikom promjena — što treba znati

- **Ne dirati** `apps/portal/data/editorial-registry.json` ručno; piše ga
  `content-queue-publish-v1.mjs`. Umjesto toga: dodaj stavku u
  `content/factory-queue/queue.json` i pripadajući HTML u `content/factory-queue/<kat>/`.
- **Ne dirati** `apps/portal/llms.txt`, `llms-full.txt`, `entity.jsonld`,
  `ai/index.html`, `image-sitemap.xml` — sve to regenerira AEO workflow iz
  registryja.
- **Ne dirati** commit-history-based state grane
  (`automation/blog-mirror-state`, itd.) — koristi ih više workera.
- Ako mijenjaš tekstove izravno u `apps/portal/gnk-aktual/index.html` ili
  ekvivalentu, **istovremeno mijenjaj i EN par** — koristi isti PR.
