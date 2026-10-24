# Ilustracije deskova

Datum: 23. 10. 2026.

Devet tematskih deskova (`sport`, `politika`, `sigurnost`, `business`,
`tehnologija`, `moda`, `putovanja`, `ljubimci`, `svijet`) prije je na
naslovnicama imalo tipografske plohe — boju, naziv i uzorak. Ploha nije
fotografija i čitatelju ne kaže o čemu desk govori. Sada svaki desk ima pravu
ilustraciju scene, iz jedne obitelji grafike, i koristi se na svim mjestima gdje
se desk pojavljuje.

## Izvor i obrada

- Izvor: `assets/desk/src/<desk>.webp`, 1376×768, bez teksta i bez logotipa.
- Skripta: `scripts/build-desk-art-v1.mjs` (opcije `--check`, `--only <desk>`).
- Definicije scena, naslova i alt teksta: `apps/region/engine/desk-art.mjs`
  (`DESK_ART`). Skripta uvozi isti objekt — opis se ne piše dvaput.
- Izlaz: `apps/portal/assets/desk/art/<desk>-{240,440,640,800,1200,1600}.webp`
  i `<desk>-og.jpg` (1200×630).
- Manifest: `apps/portal/data/desk-art-v1.json` (`sizes`, `width`, `height`,
  `alt.hr`, `alt.en`, `title.hr`, `title.en`, `generatedAt`).

`--only` spaja novi zapis s postojećim manifestom; ne briše ostalih osam.

## Gdje se slika koristi

| mjesto | veličina | napomena |
| --- | --- | --- |
| `/izdanja/<desk>/` | 1200 (+ srcset 640/800/1200) | hero `figure.iz-hero`, `fetchpriority="high"`, preload |
| OG/Twitter kartica | 1200×630 JPEG | `image` u shellu |
| `/izdanja/` popis | 640 | kartica izdanja |
| `/gnk-aktual/` pločice | 800 | središnja stranica |
| mrežna traka (svaka stranica) | 240 | devet deskova |

## Alt tekst

- Alt opisuje **samo ono što je na slici**; nema štitova, lokota, silueta ni
  drugih simbola kojih na grafiki nema.
- Piše se na hrvatskom i engleskom (`alt.hr`, `alt.en`), 40–220 znakova.
- Sadrži riječ „ilustracija” odnosno „illustration”, pa je jasno da nije
  fotografija događaja.
- Na karticama i pločicama alt je puni opis, ne prazan `alt=""` — prazan alt
  na informativnoj slici je propust, ne dekoracija.

## Provjere

`tests/test-desk-art-v1.mjs` (uključen u `scripts/test-all-v1.mjs`):

1. manifest postoji i ima točno devet deskova;
2. svaki desk ima sedam veličina + OG, sve datoteke postoje i nisu prazne;
3. WebP header daje stvarne dimenzije (240 → 240, 1200 → 1200, 1600 → 1600);
4. alt HR/EN postoji, ima 40–220 znakova i spominje ilustraciju;
5. hero na `/izdanja/<desk>/` nosi `figure class="iz-hero"`, 1200, preload s
   `imagesrcset`, `fetchpriority="high"`, OG sliku i potpis s napomenom da je
   ilustracija;
6. kartice popisa koriste 640, pločice 800, mrežna traka 240 za svih devet
   deskova i za svih 17 gradskih kanala;
7. CSS ima varijante kadra `.iz-thumb-p1`–`.iz-thumb-p6` (kad ista ilustracija
   služi kao pozadina retka, kadar se mijenja da se ne ponavlja ista slika).

## Kako dodati ili promijeniti desk

1. Ilustraciju spremi kao `assets/desk/src/<desk>.webp` (bez teksta).
2. U `apps/region/engine/desk-art.mjs` upiši `title` i `alt` na oba jezika.
3. `node scripts/build-desk-art-v1.mjs` (ili `--only <desk>`).
4. `node apps/region/engine/hub.mjs`, pa `node scripts/test-all-v1.mjs`.

Ako se promijeni samo opis, dovoljno je 2–4; slike se ne moraju ponovno
generirati.

## Kartice i članci bez fotografije

Ilustracije nisu samo naslovnice deskova — nose i svaku novinsku karticu koja
nema fotografiju izvora.

- `DESK_ART_BY_THEME` u `apps/region/engine/build.mjs` preslikava devet tema
  (politika, sport, sigurnost, rat, potres, ekonomija, energija, ai, društvo)
  na devet desk ilustracija.
- `cardMedia()` prvo koristi fotografiju izvora kroz `/api/img` (naša domena,
  `referrerpolicy="no-referrer"`), a ako je nema, uzima `-440` ilustraciju
  teme sa `srcset` 440/640.
- Ilustracija je uvijek potpisana: vizualna oznaka `data-label` s riječi
  „Ilustracija“ na jeziku izdanja, alt „<Tema> — ilustracija teme, AKTUAL
  MEDIA“ i `figcaption` na stranici članka („Ilustracija: AKTUAL MEDIA“).
  Nikad se ne izdaje za fotografiju događaja.
- Sportske riječi u naslovu (`ART_SPORT`) imaju prednost: tekst o FIFA-i ili
  ligi dobiva sportsku ilustraciju i kad tijelo teksta spomene institucije.
- Potpisi su lokalizirani za svih 14 jezika (`CAPTIONS`): Photo/Photo,
  Fotó/Illusztráció, Снимка/Илюстрация, صورة/رسم توضيحي, 写真/イラスト,
  图片/插图 itd.
- `tests/test-image-alt-v1.mjs` traži sliku u svakoj kartici i pločici na
  `/kanal/**` te na oba `/gnk-aktual/` ulaza — kartica bez slike ruši gate.
