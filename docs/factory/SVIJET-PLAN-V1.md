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
