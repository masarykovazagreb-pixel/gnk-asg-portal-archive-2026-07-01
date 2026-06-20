# Pravila kompatibilnosti backenda

## Osnovno pravilo

GitHub projekt mora ostati kompatibilan s postojećim funkcionalnim Cloudflare backendom.

## Zaštićene komponente

- postojeće Worker rute i nazivi endpointa
- postojeći KV namespace bindings
- postojeći D1 database bindings
- postojeći R2 bucket bindings
- postojeći Email bindings
- postojeći environment variable nazivi
- postojeći Cloudflare secrets
- postojeća kontakt forma i evidencijski brojevi
- postojeći mail i automatski odgovor
- postojeći operator i admin endpointi
- postojeći mobilni admin
- postojeći HR i EN frontend
- postojeći Objave sustav

## Zabranjeno bez posebnog odobrenja

- mijenjanje produkcijskih ruta
- brisanje ili preimenovanje bindinga
- objavljivanje secrets u GitHub
- izravan deploy na gnk-asg.hr
- promjena produkcijskog Workera bez preview testa
- zamjena funkcionalnog backenda novim nedokazanim backendom

## Razvojni postupak

1. main čuva potvrđeni funkcionalni baseline.
2. visual-redesign služi za dizajn, menu i frontend dorade.
3. Backend promjene moraju ostati unatrag kompatibilne.
4. Prvo se radi preview ili staging deploy.
5. Testiraju se frontend, API, KV, D1, R2, mail, kontakt i admin.
6. Produkcija se mijenja tek nakon izričitog odobrenja.
7. Prije produkcijskog deploya izrađuje se novi backup.
8. Svaki produkcijski deploy mora imati rollback plan.

Produkcija promijenjena pri izradi baselinea: NE
Cloudflare deploy pri izradi baselinea: NE
