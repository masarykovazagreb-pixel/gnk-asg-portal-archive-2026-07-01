# Desk ilustracije — devet naslovnih grafika

Dokument opisuje kako nastaje naslovna slika tematskog deska, gdje se sve
pojavljuje i što se mora održati da stranica ne bi ostala bez slike.

Kod: `scripts/build-desk-art-v1.mjs` · metapodaci: `apps/region/engine/desk-art.mjs`
· izlaz: `apps/portal/assets/desk/art/` · manifest: `apps/portal/data/desk-art-v1.json`
· ugovor: `tests/test-desk-art-v1.mjs`.

## Zašto postoji

Kartice deskova na `/izdanja/` bile su tipografske ploče u boji, a stranica
deska (`/izdanja/politika/` itd.) nije imala nijednu veliku sliku. Za čitatelja
je to izgledalo kao prazna kućica — boja umjesto slike. Rješenje je jedna
ilustracija po desku, ista na svakom ulazu: kartica, hero, OG slika i sličica
u mreži na dnu stranice.

## Izvor i pravila

- Izvor je `assets/desk/src/<id>.png` (16:9, najmanje 1200×675).
- Grafika je **ilustracija scene**, ne fotografija događaja. Zato svaki alt
  počinje riječju „Ilustracija", a potpis pod herojem kaže: *Generirana
  grafika, nije fotografija događaja*.
- U rasteru nema teksta. Ime deska, potpis i kontekst nose HTML i `alt`, pa se
  slika može prevesti bez ponovnog renderiranja.
- Alt postoji na hrvatskom i engleskom (`DESK_ART[id].alt`), dug je 40–220
  znakova i opisuje samo ono što se na slici vidi.

## Veličine

| Datoteka | Dimenzije | Namjena |
| --- | --- | --- |
| `<id>-240.webp` | 240×160 | sličica u mreži i u popisu bez stvarne slike izvora |
| `<id>-440.webp` | 440×248 | uske kolone |
| `<id>-640.webp` | 640×360 | kartica na `/izdanja/` |
| `<id>-800.webp` | 800×450 | pločica na `/gnk-aktual/` |
| `<id>-1200.webp` | 1200×675 | hero na stranici deska, preload |
| `<id>-1600.webp` | 1600×900 | široki zaslon |
| `<id>-og.jpg` | 1200×630 | Open Graph i Twitter |

Sve izvedenice imaju `width` i `height` u HTML-u, a hero ima
`aspect-ratio:16/9` u CSS-u, pa se sadržaj ne pomiče dok se slika učitava.

## Gradnja

```bash
node scripts/build-desk-art-v1.mjs              # sve deskove
node scripts/build-desk-art-v1.mjs --only moda  # jedan desk
node scripts/build-desk-art-v1.mjs --check      # provjeri manifest
```

Skripta traži ImageMagick 6 (`convert`, `identify`). Ako za neki desk nema
unosa u `DESK_ART`, skripta staje — alt se ne izmišlja naknadno.

Redoslijed u dnevnom ciklusu: `build-desk-art-v1.mjs` → `apps/region/engine/hub.mjs`
(hero, kartice, mreža) → `apps/sites/engine/hub.mjs` (SEO matrica).

## Gdje se slika pojavljuje

| Mjesto | Element | Veličina |
| --- | --- | --- |
| `/izdanja/<desk>/` | `<figure class="iz-hero">` s `<picture>` i preloadom | 1200, srcset 440–1600 |
| `/izdanja/` | `img.iz-cover` na kartici deska | 640, srcset 440–1200 |
| `/gnk-aktual/` | pločica deska | 800 |
| svaka stranica | mreža na dnu (`netStrip`) | 240 |
| stranica deska | minijatura zapisa bez slike izvora | 240, krop `iz-thumb-p1…p6` |
| dijeljenje | `og:image`, `twitter:image` | `-og.jpg` |

## Pravilo za minijature

Stvarna slika izvora uvijek ima prednost. Ako je nema, prikazuje se krop
naslovne ilustracije deska — šest fiksnih kadrova (`object-position`), isti
kadrovi za isti slug na svakom build-u. Time nijedna ćelija popisa nije
prazna, a ponovni posjet ne mijenja raspored.

## Što test čuva

`tests/test-desk-art-v1.mjs` provjerava: svih devet deskova u manifestu, sve
veličine i stvarne dimenzije WebP-a, alt na HR i EN, hero s preloadom i
`fetchpriority`, OG sliku, kartice na `/izdanja/`, pločice na `/gnk-aktual/`,
sličice u mreži i CSS za šest kadrova. Ako slika nedostaje, test pada prije
objave — prazna kućica se ne može vratiti neopaženo.
