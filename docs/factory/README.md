# Tvornica sadržaja — faza 1 (29. 10. 2026.)

Cilj: jedan centar koji mjeri, popravlja i objavljuje sve stranice (GNK ASG,
AKTUAL MEDIA, izdanja, kanali i vanjske stranice) po istim pravilima.

## Što je u fazi 1

- `scripts/factory/audit_portal.py`: read-only revizija svih indeksabilnih
  stranica. Sprema `artifacts/factory/audit.json`. Ne mijenja stranice.
- Vidljivi redak s nazivima (Nermin Sefić, GNK ASG, AKTUAL MEDIA, GNK DINAMO
  Ltd) na svim stranicama gdje nedostaje. Dodano na 12 stranica.
- Vidljivi redak s autorskim hashtagovima (#NerminSefić, #NerminSefic) i
  zajedničkim hashtagovima (#AktualMedia, #GNKASG, #MrezaIzdanja) na 1.003
  stranice koje ih nisu imale.

## Stanje nakon faze 1 (mjereno)

| Provjera | Prije | Poslije |
|---|---|---|
| Indeksabilne stranice | 9.015 | 9.015 |
| Nazivi vidljivi na svim stranicama | 9.011 | 9.015 |
| Vidljivi hashtagovi | 8.556 | 9.015 |
| Autorski hashtagovi (#NerminSefić / #NerminSefic) | 8.012 | 9.015 |
| Obrnute varijante imena (#SeficNermin, #SEFICNERMIN) | 7.376 | 7.376 (ostavljeno, odluka vlasnika) |
| Meta opis 80–160 znakova | 5.160 | 5.160 |
| Meta opis >160 znakova | 3.773 | 3.773 |
| Meta opis <80 znakova | 81 | 81 |
| Meta opis nedostaje | 1 | 1 |
| Naslov >60 znakova | 7.602 | 7.602 |
| Ponovljeni odlomci (≥50 stranica) | 276 | 276 |
| Neispravne lokalne slike | 11 | 11 (`/api/img`, vidi dolje) |
| Neispravne interne poveznice | 2 | 2 (JS predlošci) |

## Faza 2: meta opisi (mjereno)

`scripts/factory/normalize_meta.py` mijenja samo meta opis i njegove `og:`/`twitter:`
kopije. Predugačke skraćuje na rečenicu ili riječ, bez dodavanja teksta.

| Meta opis | Prije | Poslije |
|---|---|---|
| 80–160 znakova | 5.160 | 8.930 |
| Duži od 160 znakova | 3.773 | 0 |
| Kraći od 80 znakova | 81 | 84 (ručni pregled) |
| Nedostaje | 1 | 1 (ručni pregled) |

Dopunjavanje kratkih opisa prvom rečenicom iz teksta je isprobano i odbačeno:
stvorilo je ponavljajuće predloške (npr. jezične trake, rubni tekst). Kratki
opisi idu na ručni pregled.

Gate: `scripts/factory/test_factory_v1.py` (u `test-all`). Pada ako nedostaje
vidljivi redak s nazivima ili autorskim hashtagovima, ako meta opis prelazi
160 znakova, ili ako neispravne slike/poveznice porastu iznad početnog stanja.

## Faza 3: standard koji preživi build

- `scripts/factory/apply_standard.py` pokreće se nakon generatora u
  `region-daily.yml` i `region-deploy.yml` (odmah nakon `hub.mjs`). Dodaje redak s
  nazivima i hashtagovima ako fale, skraćuje predugačke meta opise i zamjenjuje
  ponovljenu uvodnu rečenicu mreže s šest formulacija istog značenja (izbor po
  putanji stranice, stabilno između buildova).
- Ponovljena uvodna rečenica („The newest headline from each other…”,
  „Kolumne, autorski tekstovi…”) bila je na 6.841 odnosno 5.576 stranica. Nakon
  varijanti nijedna formulacija nije iznad ~1.140 stranica.
- Ostali česti odlomci su namjerni: obavijest o botu za komentare (2.949),
  autorski okvir s kontaktom (2.440 / 2.150), obavijest o uredničkoj politici
  (2.440 / 2.150), napomena o automatskom sastavljanju (1.692). To su pravne i
  transparentne oznake pa ih ne mijenjam.

## Faza 4: integracija s dnevnim botom (29. 10. 2026.)

- Bot `region-daily` je na istoj grani commitao puni ciklus (7.608 datoteka) bez
  naših slojeva. Rebase je prošao bez konflikata; standard i slojevi su vraćeni
  i `test-all` je 82/82.
- Uzrok: workflowi su imali vlastite ručne liste koraka (dvije kopije popisa).
  Sada `region-daily.yml` i `region-deploy.yml` zovu `scripts/sync-all-v1.mjs
  --group=layers` (jedini popis), a `apply_standard.py` ide prije i poslije slojeva.
- Dnevni `editorial-scheduled-publish.yml` je nakon generatora tjedne arhive
  (`build-aktual-media-weekly-archive-v1.mjs --refresh`) brisao slojeve i redak s
  hashtagovima na 4 tjedne stranice (HR/EN). Sada nakon generatora ide standard i
  slojevi.
- U `sync-all` je `social-cards` premješten nakon `agents-page` (koji generira
  `/agenti/` i `/sve-stranice/`); inače je te stranice gubile `og:image`.
- Revizor (`audit_portal.py`) je prijavljivao lažne greške: `/api/img` je ruta
  workera, a `'/visual-index/'+item.id+'/'` je predložak u JS-u. Sada se ne
  broje. Stvarno stanje: 0 slomljenih slika i veza.
- Index pločice svjetskih gradova: verzija slike `?v=20261029` u generatoru
  (`scripts/build-index-parity.mjs`). Uzrok na live stranici nije potvrđen iz
  sandboxa (gnk-asg.hr nije dostupan); potrebna je provjera u DevTools Network.

## Što nije u fazi 1 i zašto

- **Naslovi >60 znakova (7.611).** Ručni pregled prema `EDITORIAL-CONTENT-DEPTH-RULE.md`.
- **Meta opisi i naslovi.** Skraćivanje naslova po pravilu
  `EDITORIAL-CONTENT-DEPTH-RULE.md` zahtijeva ručni pregled. Prije toga ne
  mijenjam ih automatski.
- **Ponovljeni odlomci.** Najčešći je rubni tekst na 6.841 stranici u
  zajedničkom sidebaru. To je zajednički sloj, pa se mijenja zasebnom fazom.
- **Vanjske slike u krugovima.** Slike idu kroz `workers/gnk-asg-direct-operator/src/image-proxy-v1.js`
  (`/api/img`) s popisom dopuštenih hostova. Pločice gradova koriste lokalne
  slike iz `apps/portal/assets/izdanja/`. Sljedeća faza: proširiti popis
  hostova i provjeriti da se slike vraćaju za sve države.
- **Obrnute varijante imena.** Vlasnik je odlučio da se ostave.

## Sljedeće faze (predložene)

1. Dnevni audit kao GitHub workflow, s rezultatom u `artifacts/factory/audit.json`.
2. Generatori: ugraditi redak s nazivima i hashtagovima u predloške, da se
   stranice ne vraćaju na staro stanje pri svakom buildu.
3. Provjera kvalitete slika (rezolucija, duplikati, licenca) s pisanim zapisom.
4. Proširenje na nove države kroz isti predložak i isti popis izvora.
