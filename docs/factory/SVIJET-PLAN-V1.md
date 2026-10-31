# Svijet: kanal za svaku državu — plan i kapije (V1, 30. 10. 2026.)

Cilj: isti princip kao AKTUAL MEDIA KANAL BEOGRAD / ZAGREB, za svih 195 neovisnih država.
Registar: `config/world-countries-v1.json` (provjera: `node scripts/world/check-world-registry-v1.mjs`).

## 1. Princip (uzet iz postojećih živih kanala)

Kanal je dnevni pregled lokalnih medija, a ne vlastita redakcija:

- 420 najnovijih stavki, svaka s naslovom, izvorom, datumom i poveznicom na izvornik.
- Osvrt opisuje kako je tekst naslovljen i što treba provjeriti. Tvrdnje izvora nisu naše tvrdnje.
- Slike su izvornih medija, preko `/api/img`, uz navođenje izvora. Dopušteno vlasnikovom potvrdom.
- Oznake izdanja na svakoj stranici: #NerminSefić, #NerminSefic, #AktualMedia, #GNKASG
  i lokalni hashtag (npr. #KanalBeograd, #Srbija).
- Meta, SEO i opisi po standardu tvornice (`apply_standard.py`, `normalize_meta.py`).
- Radio blok (`radio_promo_v1.py`) na svim stranicama.

## 2. Kapije: država ide u javnost tek kad prođe sve

| Kapija | Provjera | Tko |
|---|---|---|
| K1 Izvori | Najmanje 3 javna izvora s RSS ili sitemapom; uvjeti korištenja provjereni (naslov+izvadak+poveznica, bez cijelog teksta) | Agent izvora + ljudski pregled |
| K2 Licence/slike | Pravo prikaza slike i navod izvora; nema reemitiranja tuđih streamova bez dozvole | Agent licenci + pravni pregled |
| K3 Urednik | Imenovan ljudski urednik za državu (lokalni jezik, nadzor naslova) | Vlasnik / urednik |
| K4 Jezik i ime | Naziv države, glavni grad i jezik provjereni u `config/world-countries-v1.json` | Agent registra |
| K5 Standard | `test-all` zelen; meta, hashtagovi, radio blok, nema slomljenih slika/poveznica | Pipeline (automatski) |
| K6 Deploy | Samo status `live`; Cloudflare projekt `gnk-asg-kanal-<id>` | Deploy (postojeći workflow) |

Stanje: 14 država `live`, 3 `preparing` (SAD, Brazil, Australija), 178 `planned`.

## 3. Valovi

| Val | Opseg | Broj | Napomena |
|---|---|---|---|
| W1-susjedi | Albanija, Austrija, Crna Gora, Grčka, Kosovo, Sjeverna Makedonija, Turska | 7 | Najbliže postojećoj mreži, jezik i izvori se preklapaju |
| W2-Europa | ostatak Europe | 32 | |
| W3-Amerike | Sjeverna, Srednja i Južna Amerika, Karibi | 33 | |
| W4-Afrika | Afrika | 52 | Najveći broj, najmanje izvora po državi |
| W5-Azija | Azija | 41 | |
| W6-Oceanija | Oceanija | 13 | |

Redoslijed unutar vala: prvo države s barem jednim izvorom koji već prolazi K1 (procjena izvora ide prije gradnje).

## 4. Podjela na agente (bez novog crona; svaki agent je skripta ili ljudski zadatak)

Pravilo iz `AGENTS.md`: nema novog neodobrenog crona ni deploy bota. Agenti pripremaju i predlažu;
objava ide kroz postojeće workflowe i ljudski pregled.

| Agent | Ulaz | Izlaz | Gate |
|---|---|---|---|
| A1 Registar | `world-countries-v1.json` | status i val po državi | `check-world-registry-v1.mjs` |
| A2 Izvori | popis država iz vala | kandidati RSS/sitemap, status provjere | K1 (ručni pregled) |
| A3 Licence | kandidati izvora | odluka: naslov+izvadak+poveznica dopušteno ili ne | K2 (pravni pregled) |
| A4 Predložak | registar + izvori | kanal (`channels.json`, `capitals.json`, podaci) | build bez grešaka |
| A5 Dizajn/funkcije | generirani kanal | lint: alt, dimenzije slika, mobilni prikaz, poveznice | `image_quality.py`, `audit_portal.py` |
| A6 Meta/SEO/hashtag | sve stranice kanala | meta, og, hashtagovi, sitemap | `apply_standard.py --check`, `test-all` |
| A7 Kvaliteta slika | slike kanala | tamne/ravne/premale/duplikati | `image_quality.py --strict` |
| A8 Usklađenost | stranice s AI-tekstom | oznaka prema Članku 50 i ljudski pregled | `check-ai-act-governance-v1.mjs` |
| A9 Vidljivost | gotov kanal | sitemap, indexNow, dijeljenje (nacrti) | ljudski OK za objavu |

## 5. Što je dovršeno ovdje

- Registar svih 195 država s glavnim gradom, regijom, jezicima, vremenskim zonama, projektom i URL-om.
- Validator registra (`scripts/world/check-world-registry-v1.mjs`), mapiranje 17 postojećih kanala.
- Plan valova i kapija (ovaj dokument).

## 6. Što nije dovršeno (i zašto)

- Gradnja kanala za 178 država nije napravljena: za svaku je potrebna K1 i K2 provjera izvora.
  Bez toga bi javni domeni (`*.pages.dev`) prikazivali prazne ili nezakonite sadržaje.
- Prvi val (W1, 7 država) je sljedeći korak: za svaku državu treba izvore provjeriti s web fetchom
  i zapisati u `apps/region/channels.json` tek kad prođu K1 i K2.

## 7. Otvorene točke

- Naziv streamova na radiju: streamovi su treće strane (SomaFM, Zeno) a označeni su kao „AKTUAL MEDIA RADIO”.
  Predlažem promjenu oznake na „stanice trećih strana”.
- Pločica `radio-tile` tvrdi „javne radijske kuće osam zemalja”, a streamovi nisu javne radijske kuće.
  Treba korekcija teksta na pločici.

## 8. Stanje 30. 10. 2026. (nastavak): W1 i spajanje s main-om

Odluka vlasnika (30. 10.): za izvore novih država vrijedi opcija „naslov + izvadak + poveznica”.
Kapija K1 (uvjeti korištenja) ostaje obavezna: vlasnikova odluka ne zamjenjuje provjeru uvjeta svakog izvora.

Provjera W1, prvi izvor:

| Država | Izvor | Feed živ | Uvjeti | Ishod |
|---|---|---|---|---|
| Austrija | ORF `https://rss.orf.at/news.xml` | da (22 stavke, 30. 10.) | FAQ ORF-a: feed je „za nekomercijalne svrhe” i „iz pravnih razloga” nudi samo naslove | **blokirano** (komercijalni portal, izvadak nije dopušten) |
| ostalih 6 | nije provjereno | — | — | sljedeći korak |

Obrazac je isti kao u `docs/izvori-provjera-drzave-2026-10-29.md`: većina nacionalnih RSS feedova
nije dopuštena za komercijalnu objavu. Država ide u javnost tek kad ima izvor s dokazano dopuštenim uvjetima.

Spajanje grane s `main`-om:
- `main` je ponovno inicijaliziran (korijen `fd0e3e32f` 30. 10. 12:20 UTC, zatim `ad2a2744e`). Nema zajedničkog pretka s granom.
- Trosmjerno spajanje s bazom `06db7d1a1` (predak naše grane) dalo je spojeno stablo koje ne prolazi `test-all`:
  `region-audit`: 60 stranica članaka Beograda (26.–27. 10.) na `main`-u nema zapis u `apps/region/data/beograd.json`.
  Ti članci su objavljeni na `main`-u. Brisanje bi ih maknulo s gnk-asg.hr. Slabljenje audita nije dopušteno (AGENTS.md, pravilo 6).
- Zato se merge NE gura. Grana ostaje na `d404df9e6` (zelena). PR #380 ostaje otvoren.
- Potrebna odluka: ili rekonstruirati zapise za tih 60 članaka iz stranica (najčišći put), ili vlasnik potvrdi brisanje.

## 9. Stanje 31. 10. 2026. (W1 uvjeti, provjera izvora)

Izvor svih podataka: `config/world-sources-v1.json` (ažurirano 31. 10.) i `docs/factory/IZVJESTAJ-2026-10-31.md` §6. Provjera je pretraga, ne puni uvjeti.

| Država | Ishod |
|---|---|
| Austrija | blokirano (ORF, nekomercijalno) |
| Crna Gora | blokirano (RTCG, javni servis) |
| Grčka | blokirano (Ekathimerini, nekomercijalno) |
| Albanija | nije pronađen službeni RSS s uvjetima |
| Kosovo | pending (Balkan Insight, RFE/RL) |
| Sjeverna Makedonija | pending (MIA nema pronađen RSS) |
| Turska | pending (AA live RSS) |

Nijedna država W1 nije odobrena za javnu objavu. Sljedeći korak je čitanje punih uvjeta za Kosovo, Sjevernu Makedoniju i Tursku, pa pravna potvrda (ledger `w1-uvjeti-izvora`).

## 10. Lokalni predlošci država

`node scripts/world/build-country-previews-v1.mjs` gradi 178 lokalnih radnih
predložaka za trenutačne države `planned` u ignoriranu mapu
`apps/world/country-previews/`. To nisu funkcionalne redakcije niti javne web
stranice; ne sadrže izvore ni preuzete sadržaje. `robots.txt` i `noindex` su
mjere opreza, a ne kontrola pristupa. Predloške ne stavljati na javni hosting.
Postojeći `live` i `preparing` kanali nisu dio te gradnje. Cloudflare projekti
nisu ovom naredbom stvoreni. Preduvjeti K1–K6 za stvarnu objavu ostaju na snazi.
