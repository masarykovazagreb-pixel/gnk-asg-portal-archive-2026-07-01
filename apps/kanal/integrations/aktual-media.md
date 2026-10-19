# AKTUAL MEDIA → KANAL: kako se vijesti preuzimaju

Kanal je **izvor**. AKTUAL MEDIA je **primatelj**. Veza između njih je jedan javni feed —
bez API ključa, bez ugovora po tekstu, bez ručnog kopiranja.

## 1. Endpointi

| Format | URL | Namjena |
|---|---|---|
| JSON Feed 1.1 | `https://gnk-asg-kanal.pages.dev/feed.json` | **preporučeno** za AKTUAL (strojno preuzimanje) |
| RSS 2.0 | `https://gnk-asg-kanal.pages.dev/feed.xml` | čitači, agregatori, newsletter alati |
| Atom | `https://gnk-asg-kanal.pages.dev/atom.xml` | alternativa |
| Sitemap | `https://gnk-asg-kanal.pages.dev/sitemap.xml` | indeksiranje |
| llms.txt | `https://gnk-asg-kanal.pages.dev/llms.txt` | AI tražilice i asistenti |

Kanonska adresa je `https://gnk-asg-kanal.pages.dev/`; custom domena se ne koristi.

## 2. Polja koja AKTUAL treba

Svaka stavka u `feed.json` ima standardna JSON Feed polja plus blok `_kanal`:

```json
{
  "id": "https://…/bilanca-504-milijuna-eura-sto-brojevi-kazu/",
  "url": "https://…/bilanca-504-milijuna-eura-sto-brojevi-kazu/",
  "title": "504 milijuna eura prihoda, 46 milijuna kapitala…",
  "summary": "Prihod je gotovo utrostručen…",
  "content_text": "…",
  "date_published": "2026-10-19T07:00:00.000Z",
  "date_modified": "2026-10-19T07:00:00.000Z",
  "authors": [{ "name": "Nermin Sefić", "url": "https://gnk-asg.hr/nermin-sefic/" }],
  "_kanal": { "editorialStatus": "auto-assembled" },
  "tags": ["Analiza", "GNK ASG", "bilanca"],
  "image": "https://…/assets/og/bilanca-….png",
  "language": "hr-HR",
  "_kanal": {
    "section": "analiza",
    "sectionLabel": "Analiza",
    "readingMinutes": 3,
    "words": 741,
    "sources": ["https://…"],
    "editorialStatus": "pending-human-review"
  }
}
```

### Mapiranje na AKTUAL

| AKTUAL polje | Izvor u feedu |
|---|---|
| naslov | `title` |
| podnaslov / sažetak | `summary` |
| tijelo | `content_text` (ili preuzeti HTML s `url`) |
| autor | `authors[0].name` → **Nermin Sefić** |
| datum | `date_published` |
| rubrika | `_kanal.sectionLabel` |
| slika | `image` |
| oznake | `tags` |
| izvornik | `url` (obavezno u atribuciji) |
| status | `_kanal.editorialStatus` |

## 3. Pravila preuzimanja

1. **Atribucija je obavezna:** „Izvor: GNK ASG KANAL" + poveznica na `url`.
2. **Ne mijenjati značenje.** Dopušteno je skratiti tekst i prilagoditi naslov, ali ne izvrtati
   citate ni brojke.
3. **Status provjere se prenosi.** Ako je `editorialStatus` = `pending-human-review`, AKTUAL to
   mora prikazati ili pričekati potvrdu. Ne objavljivati kao potvrđenu vijest.
4. **Ispravci:** AKTUAL povlači `date_modified` i ponovno preuzima tekst ako je noviji.
5. **Brisanje:** ako stavka nestane iz feeda, AKTUAL je ne briše automatski — označava je kao
   arhiviranu.

## 4. Rutina preuzimanja (cron)

| Korak | Učestalost | Napomena |
|---|---|---|
| Dohvat `feed.json` | svakih 15 min | ETag / `If-None-Match` po potrebi |
| Deduplikacija | po `id` | `id` je stabilan URL, ne mijenja se |
| Filtriranje | `_kanal.editorialStatus` | objaviti samo `approved` ako AKTUAL zahtijeva potvrdu |
| Spremanje izvornika | uz svaku objavu | čuva se `url` i `date_published` |
| Provjera izmjena | 1× dnevno | usporedba `date_modified` |

Primjer skripte: `apps/kanal/integrations/aktual-import.mjs`
(pokretanje: `node apps/kanal/integrations/aktual-import.mjs --out /tmp/aktual-import.json`).

## 5. Što AKTUAL ne dobiva ovim putem

- Komentare čitatelja (objavljuju se na kanalu, ne u feedu).
- Nacrte i tekstove koji nisu objavljeni.
- Fotografije bez prava na daljnju distribuciju — za to je potreban dogovor.
- Podatke o čitateljima: kanal ne prikuplja analitiku ni kolačiće.

## 6. Kontakt za integraciju

`beckuphome@gmail.com` — predmet: „AKTUAL integracija / KANAL feed".
Odgovor u pravilu u roku 3 radna dana.


## 6. Blok na AKTUAL MEDIA (ugrađeno 19. 10. 2026.)

AKTUAL MEDIA ne čeka ručni unos: blok **„Iz GNK ASG KANALA"** nalazi se u
`apps/portal/gnk-aktual/index.html` odmah nakon glavnih vijesti (prije SPT
sekcije), između oznaka `<!-- KANAL-BAND:START -->` i `<!-- KANAL-BAND:END -->`.

- Generira ga `apps/kanal/engine/portal-block.mjs` iz `site/feed.json`.
- Svih šest linkova vode na kanal kao **vanjski linkovi** (`rel="external noopener"`).
- Desk objave su u bloku označene kao „Dnevni desk · automatski sastavljeno".
- Uz blok se zapisuje i `apps/portal/data/kanal-latest.json` (20 najnovijih
  stavki, `external: true`) za strojne potrošače unutar portala.
- Dnevni workflow osvježava blok i šalje exact-SHA production deploy, pa se
  promjena vidi i na `https://gnk-asg.hr/gnk-aktual/`.

CSP portala dopušta samo vlastite skripte i stilove (`connect-src 'none'`), zato
je blok **statički HTML** — nema iframea ni fetch poziva prema kanalu.
