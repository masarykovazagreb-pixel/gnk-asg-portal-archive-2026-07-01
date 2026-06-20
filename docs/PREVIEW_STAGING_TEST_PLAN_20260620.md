# GNK ASG preview i staging test plan

Datum: 20. lipnja 2026.
Grana: visual-redesign
Produkcija promijenjena: NE
Cloudflare deploy izvršen: NE

## Svrha

Provjeriti Objave, Publications, zajednički manifest, Auto Editor feed, HR/EN detaljne rute, slike, canonical, hreflang, izvore, minimum 500 riječi i statički fallback bez produkcijskog deploya.

## Sigurnosna ograničenja

- preview konfiguracija nema produkcijske rute
- preview konfiguracija nema cron triggere
- preview konfiguracija nema produkcijske binding ID-jeve
- preview konfiguracija nema secrets
- testovi koriste memorijski KV i lokalni fixture
- nema promjene produkcijskih podataka
- nema poziva wrangler deploy

## Automatske provjere

- najmanje 52 statičke objave
- slike i canonical vrijednosti u manifestu
- zajednički renderer na HR i EN stranici
- statički fallback i Auto Editor feed
- samo jedan vlasnik Auto Editor produkcijske rute
- minimum 500 riječi na HR i EN preview članku
- status i feed API
- HR i EN detaljna ruta
- canonical prema HR ruti
- hreflang HR/EN
- izvor, slika i broj riječi
- 404 za nepostojeći članak

## Lokalni preview

Pokreće se samo na 127.0.0.1:4173 i ne koristi Cloudflare.