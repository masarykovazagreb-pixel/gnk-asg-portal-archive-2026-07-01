# GNK ASG backend contract audit

Datum audita: 20. lipnja 2026.
Grana: `visual-redesign`
Produkcija promijenjena: NE
Cloudflare deploy izvršen: NE

## Zaključak

Repozitorij sadrži potvrđeni baseline šest Cloudflare Workera i aktivnog HR/EN frontenda. Backend se može dalje razvijati samo uz očuvanje postojećih ruta, bindinga, KV/D1/R2 podataka, mail funkcija, admin funkcija i mobilnog admina.

## Potvrđeni Workeri

1. `gnk-asg-ai-assist-worker`
2. `gnk-asg-auto-editor-public-clean-worker`
3. `gnk-asg-auto-editor-worker`
4. `gnk-asg-contact-api-worker`
5. `gnk-asg-direct-operator`
6. `gnk-asg-publish-operator`

## Potvrđeni bindings

- `GNK_ASG_CONFIG_KV`
- `GNK_ASG_KV`
- `GNK_ASG_D1`
- `GNK_ASG_MEDIA_ASSETS`
- `EMAIL`
- `AI`

Ovi nazivi su ugovorno zaključani i ne smiju se brisati ni preimenovati bez posebnog odobrenja i migracijskog plana.

## Potvrđene javne i operatorske rute

- `/api/contact-submit`
- `/api/contact-mailboxes`
- `/api/operator-send-mail`
- `/api/operator-mailbox-config`
- `/api/operator-signature-load`
- `/api/operator-signature-save`
- `/api/ai-assist*`
- `/auto-editor*`
- `/api/auto-editor*`
- `/data/auto-editor.json`
- `publish.gnk-asg.hr`

## Kritični nalazi

### 1. Produkcijske rute nalaze se u repozitoriju

`gnk-asg-direct-operator` sadrži široke rute `gnk-asg.hr/*` i `www.gnk-asg.hr/*`. To ne mijenja produkciju samo po sebi, ali svaki budući automatizirani deploy mora biti blokiran dok se ne uvede zaseban preview/staging profil.

### 2. Preklapanje Auto Editor ruta

`gnk-asg-auto-editor-worker` i `gnk-asg-auto-editor-public-clean-worker` oba polažu pravo na `/auto-editor*`. Prije bilo kakvog novog deploya mora se odrediti jedan vlasnik rute. Drugi Worker mora ostati pomoćni ili dobiti zasebnu preview rutu.

### 3. Auto Editor radi tri lokalna termina

Wrangler ima šest UTC Cron izraza radi pokrivanja ljetnog i zimskog vremena. Izvorni kod dodatno dopušta izvršenje samo u 08:00, 12:00 i 17:00 po zoni Europe/Zagreb, uz dnevni KV ključ protiv dvostruke objave. Dakle, cilj je tri objave dnevno, ne šest.

### 4. Minimalna duljina članka nije usklađena

Trenutačni kod koristi `MIN_WORDS = 300`. Važeće uredničko pravilo projekta zahtijeva najmanje 500 riječi, izvore, objašnjenje važnosti teme i vlastiti zaključak. To treba promijeniti na razvojnoj grani prije preview testa.

### 5. Objave koriste staru rutu

Auto Editor trenutno generira `/auto-editor/<slug>/`. Ciljni javni model zahtijeva `/objave/<slug>/` i `/publications/<slug>/` iz istog zajedničkog izvora, uz canonical prema `/objave/<slug>/`.

### 6. Operatorski token prihvaća query parametar

Kontakt Worker prihvaća Bearer token ili `?token=`. Query token je potreban zbog postojeće kompatibilnosti, ali predstavlja rizik zapisivanja u povijest, logove i referrere. U preview fazi treba uvesti Bearer kao primarni način i zadržati query token samo kao privremeni kompatibilni fallback.

### 7. Interna adresa izložena je u javnom statusnom odgovoru

Kontakt API javno vraća internu adresu za prosljeđivanje. Funkcija radi, ali javni odgovor ne treba otkrivati internu odredišnu adresu. U preview verziji treba vratiti samo status prosljeđivanja, bez same adrese.

### 8. Runtime baseline sadrži lokalne putanje

`contracts/runtime-baseline.json` sadrži apsolutne `G:\GNK\...` putanje. Hash vrijednosti su korisne, ali ugovor treba dopuniti relativnim repozitorijskim putanjama radi prenosivosti.

## Pravila za sljedeću fazu

- `main` ostaje netaknuti baseline.
- Sve promjene idu samo na `visual-redesign`.
- Nema GitHub Actions deploya prema produkciji.
- Nema `wrangler deploy` prema produkcijskim rutama.
- Prvo se izrađuje preview/staging konfiguracija bez produkcijskih ruta.
- Svaka promjena mora očuvati postojeće bindings i povratne JSON strukture.
- HR i EN promjene provode se paralelno.
- Prije produkcijskog deploya izrađuje se novi backup i provjera rollbacka.

## Sljedeći razvojni paket

1. zaključani backend contract JSON
2. jedan vlasnik Auto Editor rute
3. 500+ riječi i prošireni urednički standard
4. zajednički izvor za Objave i Publications
5. preview/staging Worker konfiguracije
6. test matrica za kontakt, mail, KV, D1, R2, AI, Objave, Publications i mobilni admin
