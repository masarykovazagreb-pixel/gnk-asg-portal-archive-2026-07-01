# DEPLOY ALL — handoff

Datum: 5. srpnja 2026.

## Aktivni projekt

- Repozitorij: `beckuphome-gnk/gnk-asg-portal`
- Review grana: `enterprise-portal-ui-v3-20260704`
- Draft PR: `#329 — Enterprise portal review runtime v3`
- PR je otvoren, draft, nije spojen u `main` i zadnje potvrđeno stanje je `mergeable: true`.
- Produkcija nije deployana.

## Sigurnosna politika

- Rad se nastavlja samo na review grani i izoliranom previewu.
- Bez izričite ranije definirane produkcijske autorizacije nema mergea u `main`, produkcijskog deploya, DNS/Cloudflare promjena ni stvarnog kampanjskog slanja.
- Mail i media sending flagovi ostaju zaključani u review konfiguraciji.

## Zadnji potvrđeni CI presjek

Na HEAD-u `18069d164f88f18e54ea61160f8bdce7688a75ec`:

- 17 zelenih provjera
- 5 crvenih legacy portal/media provjera

Zeleni su Enterprise Runtime, Enterprise Final Review, Design Review, Digital Workforce, Editorial, Strategy, Operator Routes, Media Applications, Mail Sync, Mail Profile Delivery, Campaign Mailer, Email Status, Command Center i izolirani Worker preview.

Preostali legacy workflowi:

1. Validate Current Portal Contract
2. Diagnose Current Portal Contract
3. Validate Current Media Command Center
4. Deploy Fresh Media Center
5. Validate GNK ASG Portal Release

## Poznati sljedeći korak

Zajednički portal validator `scripts/verify-public-redesign-contract.mjs` još očekuje stari Mail Studio bridge marker. Aktivni gateway koristi `mail-studio-extension-v4.js`. Napraviti minimalno usklađenje tog jednog ugovora, zatim ponovno pokrenuti Current Portal i Diagnose Portal.

Fresh Media workflow je već pretvoren u review-only validator bez zasebnog produkcijskog deploya; otvoriti novi failing job i zatvoriti zadnji legacy uvjet.

Current Media i Portal Release treba uskladiti s aktualnim zaštićenim review entrypointom i izoliranim Enterprise preview runtimeom.

## Mail i komunikacije

- Kontrolna/testna adresa prebačena je na `beckuphome@gmail.com`.
- Mail Sync i Mail Profile Delivery provjere su zelene.
- GNK Inbox, Sent, Drafts/Outbox i thread storage ostaju primarni sustav za `@gnk-asg.hr`.
- Završna Cloudflare Email Routing provjera ostaje obvezni release gate; detaljna lista je zapisana u komentaru PR-a #329.

## Enterprise i workforce

- 19 projektnih programa
- 1.537 digitalnih workflow profila
- 3.074 primarna i pomoćna task paketa
- 27 odjela
- 43 entity slota
- izvješća u 09:00 i 18:00

Ne tvrditi da svih 1.537 profila kontinuirano izvršava stvarne zadatke dok KV/D1 task-state i audit nisu E2E potvrđeni.

## Dizajn

Design Review je zelen. Njemačka, talijanska, arapska RTL i kineska CJK review stranica imaju noindex status, ažuriran broj 1.537 i poboljšan responsive raspored.

Završni pregled mora pokriti:

- 1440 desktop
- 1024 laptop
- 768 tablet
- 390 i 360 mobile
- RTL poravnanja
- CJK prijelome i tipografiju
- overflow, tablice, dugačke adrese i touch targete
- konzistentne LIVE / REVIEW / PLANNED / FEASIBILITY oznake

## Redoslijed nastavka

1. Ponovno dohvatiti aktualni PR HEAD, mergeable status i CI.
2. Zatvoriti pet legacy portal/media workflowa.
3. Ponovno podići izolirani review preview.
4. Odraditi završni design/mobile/RTL/CJK pregled.
5. Napraviti backup, recovery point i rollback zapis.
6. Potvrditi Cloudflare Email Routing.
7. Izdati završni GO/NO-GO izvještaj.
8. Produkcijski koraci tek nakon izričite autorizacije.

## Početna poruka za novi chat

`Nastavak projekta zove se deploy all. Radi u repozitoriju beckuphome-gnk/gnk-asg-portal, na review grani enterprise-portal-ui-v3-20260704, kroz draft PR #329. Pročitaj docs/DEPLOY_ALL_HANDOFF.md, ponovno provjeri aktualni HEAD i CI, zatvori preostale legacy portal/media workflowe, zatim odradi završni design/mobile/RTL/CJK pregled, backup/rollback i Cloudflare Email Routing provjeru. Ne spajaj u main i ne deployaj produkciju bez prethodno definirane izričite autorizacije.`
