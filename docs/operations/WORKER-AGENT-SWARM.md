# Masarykova — Worker Agent Swarm v1

**Aktivni vlasnik:** masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01. Unatoč nazivu archive, to je aktivni pisac. Beckuphome se ne mijenja.

## Što je stvarno dodano

Postojeća automatizacija `workforce-bot-orchestrator.yml` ostaje jedini raspored: svaka 4 sata + PR/push/manual. Novi izvršni sloj `scripts/worker-agent-swarm-v1.mjs` stvara 18 radnih uloga nad 15 registriranih Cloudflare Workera.

Agenti izvršavaju mjerljive zadatke: sintaksnu provjeru stvarnih ulaznih Worker datoteka, SEO/social-meta pregled uzorka stranica, mobilni i semantički pregled frontenda, audit lokalnih slika i poveznica, analizu poveznica u javnom news feedu, pripremu novinarskog paketa, urednički HOLD, kontrolu kill-switcha i prioritetizaciju postojećeg taskboarda.

**Razine istine:** status `executed` znači da je ta konkretna provjera izvršena na checkoutu; `needs-fix` znači evidentiran problem; `draft-created` znači samo radni novinarski paket; `review-hold` znači da nema prava objave. Ništa od navedenog samo po sebi ne znači da je nešto LIVE.

## Izvještaji

- `artifacts/worker-agent-swarm/report.json` — izvršenje, dokaz, prijedlog, vlasnik, prioritet.
- `artifacts/worker-agent-swarm/summary.md` — čitljiv pregled u GitHub Actions.
- `artifacts/worker-agent-swarm/drafts/AG-JOURNALIST.json` — izvorni paket vijesti u statusu source-review.
- `artifacts/workforce-bot-orchestrator/assignment.json` — postojeći registar dodjele.
- `artifacts/worker-agent-swarm/research/` — opcionalni Exa/AI javni istraživački paket i nacrt.

Ovi izvještaji nastaju u runneru i šalju se kao GitHub Actions artefakti; **ne** zapisuju se na produkcijski portal ni u glavnu granu. Dijagnostika uzorkuje nekoliko javnih HTML datoteka; ona nije potpuni vizualni pregled i ne potvrđuje stanja koja daje Cloudflare.

## Prava AI novinarska produkcija (opcionalno)

`scripts/swarm-public-research-draft-v1.mjs` poziva Exa samo radi javnih izvora i model kroz OpenAI Responses API radi izvornog hrvatskog nacrta. Nema tajnog izvlačenja internih dokumenata. Rezultat nosi oznaku **AI-potpomognuti nacrt, HOLD**; izvori, autorstvo i tvrdnje zahtijevaju odgovornu provjeru prije objave.

Za aktivaciju u GitHub Actions Secrets treba postaviti `EXA_API_KEY` i `OPENAI_API_KEY`, a u Actions Variables `SWARM_LLM_MODEL`. Rasporedni AI nacrti aktiviraju se zasebnom varijablom `SWARM_RESEARCH_ENABLED=true`; ručna opcija je `run_ai_research=true`. Korisnička Exa veza u ChatGPT-u **ne prenosi** API ključ u GitHub. Bez konfiguracije agent upisuje `not-configured`, a ne izmišljenu objavu.

## Granice i pravila

- Nema novih direktnih pisaca na main, nema slanja e-pošte, promjena DNS-a, secrets, produkcijskih Workera ili zaobilaženja CI-ja.
- Urednički bot smije zadržati tekst, tražiti dokaze i pripremati ga. Ne može glumiti ljudskog urednika niti pripisati tekst Nerminu Sefiću bez osnove.
- Korisnikovo pravilo neodbijanja u 30 minuta može se primijeniti samo na evidentirane **niskorizične interne prijedloge**. Ne zamjenjuje izričito odobrenje za javne osjetljive tvrdnje, pravna/financijska pitanja, nove vanjske kanale, produkciju ili tajne; workflow ne nadzire šutnju u ChatGPT razgovoru.
- SEO razvoj primarno se mjeri crawlabilityjem, kanonskim URL-ovima, ispravnim schema/metapodacima, izvornim sadržajem, poveznicama i stvarnom indeksacijom. Beskonačni hashtagovi nisu strategija organskog rangiranja.
- Merge nije LIVE. Dokaz je točan SHA, odobreni deploy i neovisna javna HTTP provjera.

## Naredni razvoj

1. Automatska izrada ograničenih PR-ova iz potvrđenih `needs-fix` nalaza uz review i zaštitu vlasništva.
2. Višekoračni Exa/AI newsroom: istraživač -> novinar -> provjera izvora -> urednički pregled -> izričit release gate.
3. Privatni operator dashboard za praćenje rada agenata po zadacima i rezultatima, ne kao javni prikaz.
4. Provjera stvarne indeksacije i korisničkog iskustva kroz Search Console, web analitiku i produkcijski monitoring.
