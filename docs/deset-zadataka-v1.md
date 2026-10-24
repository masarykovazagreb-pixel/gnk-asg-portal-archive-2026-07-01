# Deset strateških zadataka — od mreže do cjeline

Ovo nije popis želja. Svaki zadatak ima mjerljiv ishod i vlastitu provjeru u
`scripts/test-all-v1.mjs`, pa se napredak ne procjenjuje po dojmu nego po
stanju repozitorija.

Načelo koje vrijedi za svih deset: **jedan izvor istine, jedan generator, jedna
provjera**. Ako se nešto može ručno urediti na dvije stranice, to nije rješenje
— rješenje je da generator to piše sam i da gate padne kad prestane.

---

## 1. Jedan template za sve webove

**Cilj:** ista struktura, isti vizualni jezik, isti raspored; razlikuju se samo
izvori, tekstovi, vijesti, jezik i grad.

**Stanje:** svaki generator (portal, 17 kanala, 9 svjetskih portala, 6
samostalnih webova, arhiva, dnevnik) nosi vlastiti CSS. Paleta je zajednička
samo po dogovoru, ne po kodu.

**Ishod:** zajednički modul s dizajn-tokenima i komponentama (traka, zaglavlje,
kartica, popis, podnožje) koji svi generatori uvoze. Nova zemlja = jedan unos u
registru, bez novog CSS-a.

**Provjera:** svaki javni web učitava isti token-skup i ima iste strukturne
cjeline (skip → traka → zaglavlje → sadržaj → razmjena → mreža → podnožje).

## 2. Isto ime, isti znak, svuda

**Cilj:** nijedna stranica ne nosi drugo ime kuće, drugi znak ili drugi favicon.

**Stanje:** traka samostalnih webova zvala se „GNK ASG MREŽA“ (popravljeno),
ali ime se pojavljuje u deset varijanti (`GNK ASG`, `AKTUAL MEDIA`,
`AKTUAL ARHIVA`, `GNK ASG d.o.o.`, `AKTUAL MEDIA d.o.o.`).

**Ishod:** ugovor o identitetu: jedno ime izdanja, jedno ime izdavača, jedan
znak, jedan favicon po webu. Swe ostalo je greška, ne nijansa.

**Provjera:** `scripts/audit-brand-contract-v1.mjs` — svaka javna stranica mora
nosití znak kuće, ime izdanja iz registra i točno jedno ime izdavača.

## 3. Unutrašnjost izdanja na razini naslovnice

**Cilj:** Beograd (i svaki drugi grad) iznutra izgleda kao naslovnica — isti
masthead, ista traka, ista tipografija, isti ritam.

**Stanje:** naslovnice kanala imaju 11 sekcija; stranice članka, teme i izvora
nemaju traku, razmjenu ni mrežu u punom obliku.

**Ishod:** svaka unutrašnja stranica izdanja nosi isti okvir kao naslovnica.

**Provjera:** `tests/test-edition-inner-parity-v1.mjs` — članak, tema, izvor i
metodologija moraju imati traku, znak, mrežu i podnožje kao naslovnica.

## 4. Razmjena i backlinkovi: pun krug

**Cilj:** svaki web vodi na svaki drugi, uzvratno, i to se vidi u izlazu.

**Stanje:** blok razmjene postoji na svim naslovnicama i u `exchange.json`;
uzvratnost nije provjerena.

**Ishod:** matrica A→B za svih 32 weba; nijedan web nije slijepa ulica.

**Provjera:** `tests/test-network-reciprocity-v1.mjs` — za svaki par vrijedi
A→B i B→A, nijedan web nema manje od 20 izlaznih veza na mrežu.

## 5. SEO: tri ciljna upita, mjerljivo

**Cilj:** „gnk asg“ → AKTUAL MEDIA; „aktual media“ → sve AKTUAL MEDIA
stranice; „nermin sefić“ → AKTUAL MEDIA + GNK ASG + GNK DINAMO Ltd.

**Stanje:** entitetski graf postoji na svim stranicama, ali nijedna provjera ne
mjeri pokrivenost ciljnih upita po stranici.

**Ishod:** matrica po upitu: naslov, H1, opis, anchor tekst i entitetski čvor.

**Provjera:** `scripts/audit-target-queries-v1.mjs` — svaki upit ima nosivu
stranicu s točnim imenom u naslovu, H1 i entitetu; nijedna indeksabilna
stranica ne nosi tuđi entitet pod istim @id-om.

## 6. 195 država: krug se zatvara

**Cilj:** 193 države UN + Vatikan + Palestina; jedno izdanje = prijestolnica +
jezik zemlje.

**Stanje:** 17 gradskih izdanja i 9 svjetskih portala; plan širenja postoji, ali
nije potpun ni provjeren.

**Ishod:** `apps/region/data/world-195-v1.json` — 195 redaka s prijestolnicom,
jezikom, kontinentom i statusom (objavljeno / u planu); javna stranica plana.

**Provjera:** `scripts/validate-world-195-v1.mjs` — točno 195 jedinstvenih
država, svaka s prijestolnicom i jezikom, bez izmišljenih država.

## 7. Prijenos je automatizam, ne PR

**Cilj:** svaki tekst o GNK ASG d.o.o. i GNK DINAMO Ltd. ide na sve webove, sa
svim slikama i Nerminovom fotografijom, bez ručnog rada.

**Stanje:** prenos postoji za autorske objave i kolumne; objave o tvrtkama
prenose se djelomično.

**Ishod:** jedan generator koji iz korpusa `/objave/` izvodi kopije na svih 32
weba i drži ih svježima.

**Provjera:** `tests/test-company-syndication-v1.mjs` — svaka objava o tvrtkama
postoji na svakom webu, s atribucijom, izvorom i fotografijom.

## 8. Svježina je izmjerena, ne obećana

**Cilj:** nijedno izdanje ne tvrdi da je svježe ako nije; status pokazuje stvarno
stanje svih sustava.

**Stanje:** traka i status postoje; gate ne pada kad izdanje zaostane.

**Ishod:** prag svježine po izdanju (najnoviji zapis mlađi od 36 h) i dnevni
zapis u statusu.

**Provjera:** `scripts/audit-freshness-sla-v1.mjs` — svako izdanje ima zapis
mlađi od praga; inače gate pada i imenuje grad.

## 9. Frontend: pristupačnost i težina

**Cilj:** svaka stranica radi bez miša, bez slika i na slaboj vezi.

**Stanje:** skip-link i alt postoje (gateovi), kontrast i fokus nisu provjereni
na razini cijele mreže.

**Ishod:** jedan prolaz kroz sve generirane stranice: kontrast teksta, vidljiv
fokus, veličina slika, `loading`/`decoding`, `prefers-reduced-motion`.

**Provjera:** `scripts/audit-frontend-quality-v1.mjs`.

## 10. Nadzor koji popravlja, ne samo javlja

**Cilj:** kad nešto zastari, sustav to sam ponovno izgradi prije nego čitatelj
primijeti.

**Stanje:** status i snapshot postoje; popravak je ručni.

**Ishod:** `artifacts/network-health-v1.json` + korak koji ponavlja build za
sve što je palo na pragu svježine, s ograničenim brojem pokušaja.

**Provjera:** `scripts/build-network-health-v1.mjs --check`.

---

## Redoslijed rada

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10.

Svaki zadatak završava zelenim `test-all`, zapisom u ovom dokumentu (stanje) i
commitom. Ako zadatak otkrije grešku u generatoru, popravlja se generator — ne
provjera.
