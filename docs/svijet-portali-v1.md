# Svjetska izdanja — devet portala, pet kontinenata

Devet gradova izvan regije dosad je živjelo samo kao podstranica matice
(`gnk-asg.hr/kanal/<grad>/`). Ovim slojem svaki od njih dobiva **vlastitu
adresu, vlastiti sitemap, vlastiti feed i vlastiti robots.txt**, ali isti
sadržaj, istog urednika i isti vizualni sustav kao matica.

Portal nije kopija izdanja. To je **ulaz u izdanje**: pregled po temama i
izvorima, s izravnim linkom na svaki osvrt i svaki izvornik. Puni tekstovi
ostaju na gnk-asg.hr — time nema dvostrukog sadržaja među domenama.

## 1. Popis portala

| Portal | Domena | Jezik | Kontinent | Kanonsko izdanje |
| --- | --- | --- | --- | --- |
| Nairobi | `gnk-world-nairobi.pages.dev` | en | Afrika | `gnk-asg.hr/kanal/nairobi/` |
| Jakarta | `gnk-world-jakarta.pages.dev` | id | Azija | `gnk-asg.hr/kanal/jakarta/` |
| New York | `gnk-world-newyork.pages.dev` | en | Sjeverna Amerika | `gnk-asg.hr/kanal/newyork/` |
| São Paulo | `gnk-world-saopaulo.pages.dev` | pt | Južna Amerika | `gnk-asg.hr/kanal/saopaulo/` |
| Sydney | `gnk-world-sydney.pages.dev` | en | Oceanija | `gnk-asg.hr/kanal/sydney/` |
| Singapur | `gnk-world-singapur.pages.dev` | en | Azija | `gnk-asg.hr/kanal/singapur/` |
| Kairo | `gnk-world-kairo.pages.dev` | ar | Afrika | `gnk-asg.hr/kanal/kairo/` |
| Tokio | `gnk-world-tokio.pages.dev` | ja | Azija | `gnk-asg.hr/kanal/tokio/` |
| Peking | `gnk-world-peking.pages.dev` | zh | Azija | `gnk-asg.hr/kanal/peking/` |

Europa je već pokrivena osmim regionalnim izdanjima na matici (Zagreb,
Beograd, Sarajevo, Budimpešta, Ljubljana, Rim, Sofija, Bukurešt). Ukupno:
**17 gradskih izdanja na pet kontinenata**.

## 2. Što svaki portal ima

Izlaz se gradi u `apps/world/site/<grad>/` i predaje Cloudflare Pagesu kao
samostalan projekt:

- `index.html` — naslovnica: vodeći osvrt, najnoviji zapisi, teme, izvori, feedovi;
- `tema/<tema>/` — svi zapisi jedne teme;
- `izvor/<izvor>/` — svi zapisi jednog medija;
- `izvori/` — popis medija koje izdanje stvarno čita;
- `metodologija/` — kako nastaje izdanje i što se ne objavljuje;
- `mreza/` — blok mreže i put natrag u maticu;
- `404.html`, `feed.xml`, `feed.json`, `sitemap.xml`, `robots.txt`, `llms.txt`,
  `manifest.webmanifest`, `_headers` (CSP, `X-Frame-Options: DENY`, `nosniff`).

Dizajn nije nov: CSS dolazi iz istog modula koji gradi izdanja
(`apps/region/engine/build.mjs`), paleta i logotip iz `apps/region/channels.json`
i `apps/portal/data/aktual-logos-v1.json`. Ista tipografija, isti ritam, ista
boja izdanja — portal se prepoznaje kao dio iste kuće.

## 3. Pravilo o sadržaju (bez dvostrukog sadržaja)

- Svaki zapis na portalu vodi na **kanonski osvrt** pod maticom:
  `https://gnk-asg.hr/kanal/<grad>/clanak/<slug>/`.
- Portal **ne generira** stranice članaka i **ne stavlja** ih u svoj sitemap.
  Njegov sitemap sadrži samo stranice koje postoje samo na portalu (naslovnica,
  teme, izvori, metodologija, mreža).
- RSS i JSON feed nose iste zapise, ali s linkom na kanonski osvrt.
- Nijedna brojka se ne izmišlja: ako izvor u ciklusu nije dao zapise, stranica
  to kaže, umjesto da popuni prazninu.

Zato devet portala ne stvara devet kopija arhive — stvara devet ulaza u istu
arhivu, s jasnim kanonskim adresama.

## 4. Mreža

Blok `Mreža AKTUAL MEDIA` (`data-mesh="v1"`) sada ima:

| Sloj | Broj | Što sadrži |
| --- | --- | --- |
| Jezgra | **20 ulaza** | AKTUAL MEDIA, ARHIVA, DNEVNIK i 17 gradskih izdanja |
| Portali | **18 domena** | šest tematskih stranica, ARHIVA, DNEVNIK, BUSINESS TJEDNIK i devet svjetskih portala |

Blok stoji na **41 površini**: 6 stranica × HR/EN (12), arhiva, dnevnik, devet
svjetskih portala, 17 naslovnica gradskih izdanja i hub `/kanal/`. Provjerava
ga `tests/test-network-mesh-v1.mjs` — 20 ulaza, bez self-linka, bez `nofollow`,
svi linkovi apsolutni https, bez duplikata.

Hub `/mreza/` prikazuje 15 kartica (6 tematskih + 9 svjetskih), a
`data/mreza-v1.json` uz `sites` nosi i `world` s devet portala.

## 5. Agenti

Svaki portal ima **vlastitog agenta** — imenovani posao koji provjerava upravo
taj portal:

```
world-nairobi-agent   world-jakarta-agent   world-newyork-agent
world-saopaulo-agent  world-sydney-agent    world-singapur-agent
world-kairo-agent     world-tokio-agent     world-peking-agent
```

Agent pokreće `tests/test-world-portals-v1.mjs --only <grad>` i provjerava:
jezik i smjer pisma, canonical, sitemap (samo vlastite stranice), RSS i JSON
feed (kanonski linkovi), robots, CSP i sigurnosna zaglavlja, blok mreže s 20
ulaza, alt na svakoj slici, preskok sadržaja i odsutnost skripti.

Ukupno je **21 agent** (12 postojećih + 9 novih). Pokreću se dnevno u
`MREŽA — agenti i sinkronizacija` (04:40 UTC, read-only) i ručno:

```bash
node scripts/network-agents-v1.mjs
node scripts/network-agents-v1.mjs --only world-tokio-agent
```

## 6. Objava

`.github/workflows/world-portals-deploy.yml`:

- **push** na `apps/world/**`, `apps/region/data/**` i `channels.json`;
- **raspored** `27 */2 * * *` (svaka dva sata, uz region engine);
- **ručno** pokretanje.

Radnja je `contents: read`, gradi devet portala u runneru, provjerava ih i
objavljuje na devet Cloudflare Pages projekata. Ako projekt ne postoji, radnja
ga kreira preko API-ja. Raspored je u allowlisti
`ops/production-workflow-allowlist-v2.json` (verzija `V2_12`).

## 7. Što ovo jest, a što nije

**Jest:** devet samostalnih ulaza u izdanja, s vlastitim sitemapom, feedom i
robots.txt; obostrane veze s maticom; pokrivenost pet kontinenata; isti
urednik i isti standard.

**Nije:** PBN, farma linkova ni lažne „tuđe domene". Portali ne postoje da bi
nosili link — svaki ima sadržaj, izvore i metodologiju. „Širenje kao virus"
ovdje znači strukturno širenje: svaki novi ulaz vraća link matici i susjedima,
pa se mreža širi otkrivanjem, a ne kupnjom domena.

## 8. Kako dodati deseti portal

1. Izdanje mora postojati u `apps/region/channels.json` i imati podatke u
   `apps/region/data/<id>.json`.
2. Dodaj `id` u `WORLD_IDS` i kontinent u `CONTINENTS`
   (`apps/world/lib/registry.mjs`).
3. Dodaj slug u dvije petlje u `.github/workflows/world-portals-deploy.yml`.
4. Pokreni `node apps/world/build.mjs` i `node tests/test-world-portals-v1.mjs`.

Blok mreže, hub, agent i sitemap prate sami — nema ručnog popisa linkova.

## 9. Provjere

```bash
node apps/world/build.mjs                 # devet portala
node tests/test-world-portals-v1.mjs      # ugovor portala
node tests/test-network-mesh-v1.mjs       # 41 površina, 20 ulaza, 18 portala
node scripts/network-agents-v1.mjs        # 21/21
node scripts/network-sync-v1.mjs          # sve površine iz istih podataka
node scripts/test-all-v1.mjs              # 38/38
```

Očekivani izlaz testa portala: `"ok": true`, `portals: 9`,
`continents: ["Afrika","Azija","Južna Amerika","Oceanija","Sjeverna Amerika"]`.
