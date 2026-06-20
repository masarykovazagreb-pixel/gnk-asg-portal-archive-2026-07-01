# Publications shared source patch

Datum: 20. lipnja 2026.
Grana: visual-redesign
Produkcija promijenjena: NE
Cloudflare deploy izvršen: NE

## Uvedeno

- jedan vlasnik produkcijskih Auto Editor ruta
- minimum 500 riječi
- HR i EN tekst za nove Auto Editor članke
- canonical na /objave/<slug>/
- alternate EN ruta /publications/<slug>/
- zajednički statički manifest /data/publications.json
- zajednički dinamički feed /data/publications-auto.json
- /objave/ i /publications/ koriste isti renderer i iste izvore
- postojeće statičke objave ostaju fallback ako dinamički izvor nije dostupan
- nema deploya prema produkciji

## Broj statičkih zapisa

52

## Sigurnosno pravilo

Nove rute postoje samo u razvojnoj grani. Ne izvršavati wrangler deploy prije preview/staging konfiguracije i izričitog odobrenja.