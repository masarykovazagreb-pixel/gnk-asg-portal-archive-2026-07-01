# GNK ASG Command Center i urednička automatika

Datum: 20. lipnja 2026.
Grana: `visual-redesign`
Produkcija promijenjena: NE
Cloudflare deploy izvršen: NE

## Svrha

Command Center omogućuje da korisnik u zaštićenoj admin aplikaciji napiše naredbu običnim jezikom. Sustav zatim:

1. pretvara naredbu u strukturirani plan
2. procjenjuje rizik
3. sprema zadatak u queue
4. traži odobrenje kada je potrebno
5. izvršava samo dopuštene akcije preko odobrenog Cloudflare servisa
6. bilježi rezultat, grešku i rollback/snapshot referencu

## Admin aplikacija

Ruta: `/command-center/`

Funkcije:

- unos prirodne naredbe
- AI ili rule-based izrada plana
- queue zadataka
- risk: low / medium / high
- odobrenje i odbijanje
- dry-run izvršenje
- stvarno izvršenje samo za odobrene i dopuštene akcije
- status bindinga i rasporeda
- audit logovi
- test Auto Editora
- test dnevnog sažetka

## Odvojeni Cloudflare Worker

Worker: `gnk-asg-command-center-worker`

Command Center se ne ugrađuje nasilno u kontakt, mail, AI ili Direct Operator Worker. Koristi zaseban Worker i service bindings prema postojećim izvršiteljima:

- `AUTO_EDITOR_SERVICE` → `gnk-asg-auto-editor`
- `DIRECT_OPERATOR_SERVICE` → `gnk-asg-direct-operator`
- `PUBLISH_SERVICE` → `gnk-asg-publish-operator`

Tako se postojeće produkcijske rute i bindingi ne mijenjaju.

## Raspored objava

Satni Cloudflare cron služi samo kao lokalni rasporedni provjerivač.

Stvarna logika:

- vremenska zona: `Europe/Zagreb`
- članak: svaka 3 sata
- dnevni sažetak: 23:00
- zaštita od dvostrukog izvršenja po datumu i satu
- raspored je zadano isključen
- aktivacija zahtijeva spremljenu konfiguraciju i odobreni Cloudflare deploy

## Pravila članaka

- najmanje 500 riječi na hrvatskom
- najmanje 500 riječi na engleskom
- autor: Nermin Sefić
- jedna zajednička tema i zajednički izvor podataka
- stvarni javni izvori
- objašnjenje važnosti teme
- vlastiti poslovni zaključak
- slika iz GNK ASG galerije
- HR ruta `/objave/<slug>/`
- EN ruta `/publications/<slug>/`
- canonical na HR rutu
- hreflang HR/EN
- meta title i description
- Open Graph i Twitter podatci
- Article i ImageObject schema
- sitemap i image sitemap
- IndexNow kada je ključ konfiguriran
- zaštita od duplikata
- log izvora, vremena, slike, SEO-a i rezultata indeksiranja

## Dnevni komentar

Jednom dnevno sustav objedinjuje sve objave dana u poseban komentar:

- najmanje 900 riječi po jeziku
- zajedničke teme dana
- rizici i prilike
- upravljački komentar
- watchlist za sljedeći dan
- reference na pojedinačne objave
- jedan dnevni digest po datumu

## Sigurnosna pravila

Automatski se ne izvršavaju:

- produkcijski deploy
- promjene ruta ili domena
- promjene secretsa
- brisanje
- slanje maila bez odobrenja
- javna objava bez dopuštene politike
- financijske ili pravne odluke

`productionLocked` ostaje `true` sve dok korisnik izričito ne odobri produkciju.

## Backup

Svaki smisleni push na `visual-redesign` automatski proizvodi:

- statički preview artifact
- puni ZIP repozitorija za taj commit
- manifest s branchom, commitom i vremenom izrade

Snapshot se čuva 30 dana. Git povijest trajno čuva sve commitove.

## Cloudflare prijenos

Prijenos se radi ovim redoslijedom:

1. preview Worker bez produkcijskih ruta
2. povezivanje postojećeg KV-a i AI bindinga
3. povezivanje service bindinga prema postojećim Workerima
4. unos OPERATOR_TOKEN secreta
5. dry-run testovi
6. test svih zaštićenih backend funkcija
7. snapshot i rollback referenca
8. tek nakon odobrenja custom domena `command.gnk-asg.hr`
9. raspored ostaje isključen dok korisnik izričito ne odobri automatiku

Postojeće mail, kontakt, AI, R2, KV, D1 i routing postavke ostaju netaknute.
