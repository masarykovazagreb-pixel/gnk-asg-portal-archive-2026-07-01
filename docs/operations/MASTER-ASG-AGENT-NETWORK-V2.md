# MASTER ASG — izvršna mreža agenata na Masarykovoj (V2)

**Jedini aktivni repozitorij**: `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01`. Naziv `archive` je naslijeđen; `beckuphome-gnk` nije aktivni pisac. Obvezno slijediti `AGENTS.md`, `docs/ACTIVE-SOURCE-OF-TRUTH.md`, EU AI Act governance i postojeće kill-switcheve.

## Postojeća funkcionalnost

- Iz svakog postojećeg `workers/` direktorija stvara operativni profil agenta i mapira ga na postojeći bot registar i backlog. Nepoznati Worker dobiva samo nadzorni identitet, bez prava pisanja.
- Odvojeni slojevi: supervizor, backend, frontend, SEO/AEO, Exa-istraživanje, AI novinar, AI urednik, QA i release kontrola.
- Postojeći `workforce-bot-orchestrator.yml` svakih 4 sata (nakon mergea) dohvaća javne GitHub issue/run dokaze, dodjeljuje zadatke, provjerava javne HTTP rute i izrađuje JSON izvještaj. Ne mijenja `main`, Cloudflare, DNS ni produkciju.
- Povezuje Exa javno istraživanje i jedan opcionalni LLM nacrt uz jasnu AI oznaku. Svi nacrti ostaju HOLD radi izvora, prava i stvarne ljudske uredničke provjere.
- Izlazi: `artifacts/master-asg-agent-network/report.json`, `summary.md`, opcionalno `editorial-draft.md` kao privatni CI artefakt.

Novi `.github/workflows/master-asg-agent-factory-v2.yml` služi za ručno pokretanje i PR provjere; nema vlastiti schedule i ne troši dodatne planirane Actions minute. Opcionalno Exa/AI istraživanje u postojeći 4-satni orkestrator ulazi samo kroz `SWARM_RESEARCH_ENABLED=true` ili ručni `run_ai_research`, dok je redovni MASTER ASG nadzor bez naplatnih API poziva.

**Precizna granica**: profili nisu automatski novi Cloudflare Worker procesi niti neovisno živi LLM-ovi. Ovo je stvarno izvršivi nadzorni i istraživački sloj. Samostalni kodni popravci, automatski PR-ovi, vizualni redizajn i javne publikacije zahtijevaju dodatne ograničene egzekutore, testove i odgovarajuće ovlasti; nisu lažno prijavljeni kao izvršeni.

## 30 minuta bez prigovora

Za jasno dostavljen prijedlog rizika `low` vrijedi operativna pretpostavka prihvaćanja 30 minuta nakon dokazivo potvrđene dostave, uz mogućnost odbijanja, izmjene i zaustavljanja. Ovaj status omogućuje samo internu analizu, pripremu i siguran neprodukcijski PR. Ako potvrda dostave nije verificirana ili ako prijedlog nije niskorizičan, tajmer se ne koristi.

**Iznimke koje zahtijevaju stvarno izričito odobrenje**: produkcijski deploy, vanjska distribucija, plaćanja, pristup tajnama i ovlastima, financijske i pravne odluke, osjetljivi osobni podaci, mail/DNS, štetne materijalne javne tvrdnje. Izostanak odgovora nikad nije dokaz sadržajne ljudske uredničke provjere, recenzije izvora ili prihvaćanja autorstva.

Zapisi odluka: `ops/agent-decisions-v1.json`. U aktivnom stanju nema zapisa; stoga nema odbrojavanja ni automatski odobrenih aktivnosti. Potreban je dokaz poslane i dostavljene obavijesti, ne samo lokalno vrijeme nastanka prijedloga.

## Exa i AI pisanje (opt-in)

Repo secret `EXA_API_KEY` uz repository variable `AGENT_ENABLE_PUBLIC_RESEARCH=true` omogućuju **jedno javno istraživanje** (do 5 rezultata) po ciklusu. Repo secret `OPENAI_API_KEY` uz `AGENT_ENABLE_AI_WRITING=true` dopušta **jedan nacrt** po ciklusu tek kad Exa vrati najmanje dva izvora. Model se zadaje varijablom `AGENT_OPENAI_MODEL` (zadano `gpt-4.1-mini`). Trenutno stanje tih tajni nije provjereno i dok nisu postavljene, naplatne mogućnosti su isključene.

Ne šalju se privatni podaci, repo sadržaj niti tajne Exi ili AI modelu. Koriste se samo javni citati/sažeci; izvori se moraju dodatno provjeriti prije bilo kakve javne tvrdnje. API dokumentacija: https://exa.ai/docs/reference/search.

## Izvršavanje i dokaz

`node --test tests/master-asg-agent-network-v2.test.mjs` testira izdvajanje botova, pravilo 30 minuta, odbijanje i zaštićene operacije bez mreže.

`ASG_SKIP_LIVE=1 ENABLE_PUBLIC_RESEARCH=0 ENABLE_AI_WRITING=0 node scripts/master-asg-agent-network-v2.mjs` izrađuje lokalni izvještaj, ali namjerno ne potvrđuje dostupnost produkcije.

Stanje se uvijek odvaja: **WRITER_SHA ≠ PRODUCTION_SHA**. PR/merge/CI nikada se ne označavaju kao javna objava bez exact-SHA deploya i nezavisne HTTP provjere. Službeni release put ostaje `.github/workflows/deploy-admin-auth-v6.yml`; ova promjena ga ne dira.

## Daljnja izvedba

Autonomni razvoj zahtijeva po jednog strogo scoped PR-egzekutora za frontend/SEO, backend/testove, uredničku pripremu i release preflight. Svaki smije mijenjati samo svoj dio na zasebnoj grani, provoditi testove i predložiti PR. Zaštićeni sadržaj i javna objava ostaju iza postojećih kvalitetnih i sigurnosnih prepreka.
