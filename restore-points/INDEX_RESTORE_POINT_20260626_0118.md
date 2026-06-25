# GNK ASG INDEX — TOČKA POVRATA

- Datum: 26. 6. 2026.
- Vrijeme korisnika: 01:18
- Sigurnosna grana: `restore/index-20260626-0118`
- Izvor: stanje grane `main` u trenutku izrade točke povrata
- Produkcijski index nije mijenjan prilikom izrade ove točke povrata.

## Obuhvat

Ova sigurnosna grana čuva cjelokupno trenutačno stanje repozitorija prije nastavka rada na indexu, uključujući:

- javni index i EN verziju;
- aktivni Cloudflare Worker sloj;
- postojeće market, news, gallery i group-network module;
- GNK ASG Mail Studio V18/V19;
- Mass Mail V20 pripremni panel;
- administratorsku autentikaciju i privatne rute;
- trenutačne GitHub Actions workflowe.

## Pravilo rada nakon ove točke

- Index mijenjati minimalno i samo ciljano.
- Ne uklanjati postojeće funkcionalne module.
- HR i EN promjene provoditi paralelno.
- Prije produkcijskog deploya provjeriti homepage, `/en/`, navigaciju, market, news, visual gallery i privatne admin rute.
- U slučaju problema vratiti produkciju na sadržaj ove grane.

## Povrat

Za potpuni povrat koristiti sadržaj grane:

`restore/index-20260626-0118`

Točka povrata ne mijenja produkciju i služi isključivo kao sigurnosni snapshot prije rada na indexu.
