# Mreža AKTUAL MEDIA — 20 ulaza, 18 portala, 22 agenta

Ovaj dokument objašnjava kako je mreža povezana, odakle koja stranica dobiva
linkove, tko njome upravlja i koji agent što provjerava. Ako se nešto ovdje
ne slaže s kodom, mjerodavan je kod — i test koji ga čuva.

## 1. Što je „paukova mreža"

Svaka javna stranica mreže nosi isti blok `Mreža AKTUAL MEDIA`. Blok ima dva
sloja:

| Sloj | Broj | Što sadrži |
| --- | --- | --- |
| Jezgra | **20 ulaza** | AKTUAL MEDIA (`/gnk-aktual/`), AKTUAL ARHIVA, AKTUAL DNEVNIK i **17 gradskih izdanja** (`/kanal/<grad>/`) |
| Portali | **18 domena** | šest samostalnih stranica (BOR USA, KOŠARKA 360, SCENA ZNANOSTI, STEP BUDUĆNOSTI, ZDRAVLJE 360, IZBORI U SRBIJI), ARHIVA, DNEVNIK, BUSINESS TJEDNIK i devet svjetskih portala (`gnk-world-<grad>.pages.dev`) |

Pravila bloka:

- svaki link je **apsolutan i https**, jer se stranice služe s različitih domena;
- **vlastita stavka nije link** nego označena stavka (`aria-current`), pa nema
  self-linkova;
- svaki vanjski link nosi `rel="external noopener"` i **nijedan ne nosi
  `nofollow`** — mreža ne skriva veze;
- ista adresa ne pojavljuje se dvaput na istoj stranici (arhiva i dnevnik su
  u jezgri, pa se u sloju portala ne ponavljaju);
- svih 14 jezika ima **isti skup adresa**, samo prevedene natpise: blok mreže i okvir
  izdanja (oznake, povratni link, podnožje) na jeziku su izdanja, a imena izdanja,
  ljudi i tvrtki se ne prevode.

Blok se ne piše ručno ni u jednu stranicu. Jedini izvor je
`apps/satellites/lib/network-v1.mjs`, a ugrađuju ga:

- `apps/sites/lib/kit.mjs` → šest samostalnih stranica (`apps/sites/site/`),
- `apps/satellites/lib/shell.mjs` → arhiva (`apps/arhiva/site/`) i dnevnik
  (`apps/dnevnik/site/`),
- `apps/world/build.mjs` → devet svjetskih portala (`apps/world/site/`),
- `apps/region/engine/build.mjs` i `hub.mjs` → 17 naslovnica gradskih izdanja
  i hub `/kanal/`.

Blok stoji na **41 površini**. Ako se doda izdanje, mijenja se
`apps/region/channels.json`; ako se doda tematski portal, mijenja se
`apps/sites/lib/registry.mjs`; ako se doda svjetski portal, mijenja se
`apps/world/lib/registry.mjs`. Blok i test prate sami.

## 2. Odakle stranice dobivaju linkove

Mreža nije skup slijepih ulica. Svaka stranica ima najmanje tri izvora
dolaznih veza:

1. **matica** — `/kanal/` (17 kartica), `/izdanja/`, `/mreza/` (15 kartica)
   i hub `/gnk-aktual/mreza/` vode na svako izdanje i svaki samostalni portal,
   uključujući devet svjetskih;
2. **sestrinske stranice** — blok mreže na svakoj stranici vodi na svih 20
   ulaza i na ostale portale, u oba smjera;
3. **strojni kanali** — svaka stranica ima vlastiti `sitemap.xml`, `feed.xml`
   (ili `feed.json`) i `robots.txt`; matica ih indeksira kroz
   `sitemap-index.xml` i registar `/izdanja/sitemap.xml`.

`sitemap-index.xml` na gnk-asg.hr sadrži 28 sitemapa: maticu, arhivu,
dnevnik, izdanja, galeriju i sitemap svakog od 17 izdanja.

## 3. Tko upravlja

- **Izdavač:** AKTUAL MEDIA d.o.o.; urednik i direktor Nermin Sefić.
- **Vlasnik sadržaja i registara:** `apps/region/channels.json` (izdanja),
  `apps/sites/lib/registry.mjs` (portali), `apps/satellites/lib/network-v1.mjs`
  (blok mreže).
- **Vlasnik automatizacije:** `ops/network-agents-v1.json` i
  `.github/workflows/network-agents-daily.yml`; dnevni ciklus izdanja ostaje
  u `region-daily.yml`, a objava portala u njihovim deploy workflowima.
- **Dozvole:** `ops/automation-kill-switches.json` (`regionPublish` do
  31. 12. 2027.) i allowlist rasporeda
  `ops/production-workflow-allowlist-v2.json`.

## 4. Agenti

Agent ovdje nije model koji odlučuje — to je imenovani posao s vlasnikom,
naredbom i izlaznim kodom. Pokreće ih `scripts/network-agents-v1.mjs`;
izvještaj ide u `artifacts/network-agents-v1.json`.

| Agent | Provjerava |
| --- | --- |
| `mesh-link-agent` | 20 ulaza na svakoj stranici, apsolutni https, bez self-linka i nofollowa |
| `edition-parity-agent` | šest stranica, hub HR/EN, sitemapi i JSON indeks |
| `network-standard-agent` | 17 gradova i 9 portala: vlastita slika i znak, jezik zemlje, manifest i CSP, blok mreže, svjež feed, sinkronizacija popisa |
| `seo-matrix-agent` | title, description, canonical, hreflang, OG |
| `meta-hygiene-agent` | meta keywords bez `#` i autora; hashtagovi u `article:tag` |
| `brand-logo-agent` | svaki znak ima datoteku, stranicu, sitemap i alt |
| `image-proxy-agent` | nijedna slika ne ide na host koji posrednik ne dopušta |
| `satellites-agent` | arhiva i dnevnik: canonical, hreflang, JSON-LD, sitemap, feed |
| `accessibility-agent` | preskok sadržaja i vidljiv fokus |
| `security-headers-agent` | CSP i prateća zaglavlja nisu oslabljena |
| `stability-agent` | dnevni ciklusi, kill-switch i push guard |
| `data-desk-agent` | svaka brojka na desku dolazi iz arhive |
| `sync-agent` | ponovno gradi četiri površine iz istih podataka i provjeri mrežu |
| `world-<grad>-agent` ×9 | svjetski portal: jezik, canonical, sitemap, feedovi, robots, CSP, blok mreže |

Ručno:

```bash
node scripts/network-agents-v1.mjs
node scripts/network-agents-v1.mjs --only mesh-link-agent,seo-matrix-agent
node scripts/network-sync-v1.mjs
```

Workflow `MREŽA — agenti i sinkronizacija` radi svaki dan u 04:40 UTC (22 agenta) i na
svaku promjenu bloka, graditelja ili registra agenata. Posao je **samo za
čitanje** (`contents: read`): gradi u radnom prostoru runnera i sprema
izvještaj kao artifact, pa ne može pomaknuti `main`.

## 5. Što mreža jest, a što nije

Linkovi među vlastitim domenama **nisu neovisni backlinkovi** i ovaj projekt
to ne prodaje kao takvo. Oni rade tri stvari koje se mogu izmjeriti: tražilica
brže otkrije novu stranicu, svaka stranica ima put natrag u maticu i entitet
„AKTUAL MEDIA" ostaje jasno povezan sa svakim izdanjem.

Neovisne veze dolaze s tuđih domena — medija, citata, kataloga i profila — i
njih ovaj sustav ne izmišlja. Ako se pojave, dobrodošle su; ako ne, mreža i
dalje radi ono što je do nje.
