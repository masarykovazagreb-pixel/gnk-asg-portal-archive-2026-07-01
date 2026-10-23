# Kodiranje izvora — zašto je São Paulo pisao „Minist�rio"

Kratka operativna bilješka. Ovaj dokument postoji zato što se greška koju
opisuje ne vidi u logu: stranica se uredno izgradi, objavi i indeksira, a
tekst je nečitljiv.

## 1. Što se dogodilo

Feed UOL-a (i dio drugih južnoameričkih te istočnoeuropskih medija) dolazi u
`ISO-8859-1` ili `windows-1252`, a `fetch()` metoda `res.text()` **uvijek
dekodira UTF-8**. Svaki bajt koji nije valjan UTF-8 postaje `U+FFFD` —
takozvani replacement znak, u pregledniku „�".

Tako je `Ministério da Justiça` postalo `Minist�rio da Justi�a`. Greška je
zahvatila naslov, sažetak, RSS i JSON feed te svaku generiranu stranicu
izdanja — 103 datoteke u repozitoriju, 4 199 znakova.

## 2. Pravilo koje sada vrijedi

Sve čitanje ide kroz `decodeBody(buffer, res)` u
`apps/region/engine/lib.mjs`:

1. **Valjani UTF-8 ima prednost.** Ako dekodiranje ne proizvede `U+FFFD`,
   tekst je ispravan bez obzira što zaglavlje tvrdi. Mnogi feedovi i danas
   pišu `charset=iso-8859-1`, a šalju UTF-8.
2. **Inače deklarirani charset** — iz `Content-Type`, zatim iz XML
   deklaracije (`<?xml encoding=...?>`), zatim iz `<meta charset>`.
3. **Inače `windows-1252`** — natuknica za zapadnoeuropske i latinične
   medije.
4. Ako nijedno ne uspije, vraća se UTF-8 čitanje; takav zapis ne prolazi
   drugi sloj.

Isti čitač koriste tri pipelinea:

| Pipeline | Datoteka |
| --- | --- |
| gradska izdanja | `apps/region/engine/daily.mjs` → `lib.mjs` |
| izborni desk | `apps/sites/engine/ingest-izbori.mjs` |
| BUSINESS TJEDNIK | `apps/tjednik/engine/tjednik.mjs` |

## 3. Drugi sloj: zapis se ne objavljuje

`daily.mjs` filtrira zapise koji i nakon dekodiranja sadrže `U+FFFD` i broji
ih u `apps/region/data/_status.json`:

```json
"saopaulo": { "fetched": 26, "total": 49, "sourcesOk": 6, "corrupt": 33 }
```

Radije praznina koju nadzor vidi nego naslov koji čitatelj ne može
pročitati. Kad izvor sljedeći put pošalje ispravan tekst, zapis ulazi sam —
ključ je `url#datum`, pa uklonjeni zapis nije trajno izgubljen.

## 4. Što je učinjeno s postojećim podacima

- Iz `apps/region/data/saopaulo.json` uklonjena su **33 zapisa** s `U+FFFD`
  (82 → 49). Tekst se ne može popraviti: `U+FFFD` ne pamti koji je bajt
  bio na tom mjestu, a izmišljanje slova nije dopušteno.
- Izdanje je ponovno izgrađeno (`node apps/region/engine/build.mjs --channel
  saopaulo`), pa su nestale i stranice članaka s pokvarenim naslovima.
- Hub, `/top-teme/`, svjetski portali i mreža obnovljeni su iz istih podataka.

## 5. Kako se to više ne ponovi

`tests/test-region-encoding-v1.mjs` (obavezna provjera u
`scripts/test-all-v1.mjs`) čuva četiri stvari:

1. latin-1 se dekodira u `Ministério da Justiça`;
2. valjani UTF-8 se ne dvostruko dekodira ni kad zaglavlje laže;
3. nijedan zapis iz `apps/region/data/*.json` ne nosi `U+FFFD`;
4. nijedna objavljena stranica, feed ni sitemap (`apps/portal/kanal/`,
   `apps/world/site/`) ne nosi `U+FFFD`;
5. statičko pravilo: engine koji čita `await res.text()` bez `decodeBody`
   pada test.

Test se može pokrenuti i kao samo provjera podataka:

```bash
node tests/test-region-encoding-v1.mjs --data-only
```

## 6. Kad se dodaje novi medij

Kodiranje se rješava samo, ali slike ne: posrednik ima zatvoren popis
hostova (`workers/gnk-asg-direct-operator/src/image-hosts-v1.js`). Novi
izvor slika traži novi redak s medijem i zemljom, inače
`tests/test-image-proxy-coverage-v1.mjs` pada i stranica bi prikazala
slomljenu minijaturu.
