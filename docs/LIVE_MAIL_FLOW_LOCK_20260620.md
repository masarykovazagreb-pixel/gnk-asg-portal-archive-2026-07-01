# GNK ASG live mail flow lock

Datum: 20. lipnja 2026.
Status: aktivni funkcionalni tok koji se ne smije mijenjati bez zasebnog testa i rollbacka.

## Aktivni vlasnik ruta

Worker: `gnk-asg-contact-api`

Aktivne rute:

- `/api/contact-submit*`
- `/api/contact-mailboxes*`
- `/api/operator-send-mail*`
- `/api/operator-mailbox-config*`
- `/api/operator-signature-load*`
- `/api/operator-signature-save*`

## Potvrđeni tok kontakt forme

1. Korisnik odabire GNK ASG odjel/adresu.
2. Forma šalje ime, e-mail, telefon, predmet, poruku, privolu i opcionalni PDF.
3. Worker dodjeljuje evidencijski broj.
4. Zapis se sprema u KV.
5. PDF se sprema u R2 kada postoji i zadovoljava pravila.
6. Interna obavijest šalje se na postojeću internu adresu za prosljeđivanje.
7. Interna obavijest šalje se s odabrane GNK ASG adrese.
8. `Reply-To` interne obavijesti postavlja se na adresu korisnika.
9. Korisnik dobiva automatsku potvrdu s iste odabrane GNK ASG adrese.
10. Potvrda sadržava evidencijski broj, vrijeme zaprimanja i status privitka.

## Potvrđeni operator mail tok

- pristup operator tokenom
- izbor GNK ASG mailbox profila
- ručno uređivanje i spremanje potpisa u KV
- slanje predmeta i teksta
- opcionalni PDF privitak
- zapis poslanog maila u KV indeks

## Pravilo kompatibilnosti

Novi Mail Agent i Mail Studio Pro moraju se priključiti paralelno. Ne smiju zamijeniti ili ugasiti aktivni Contact Worker dok nisu ispunjeni svi uvjeti:

- route-free preview test je uspješan
- Inbox/Outbox/Sent/Held test je uspješan
- automatska zaštita od mail petlje je uspješna
- opći AI odgovor je uspješan
- osjetljiva poruka završava u Held
- ručno slanje i privitci rade
- potvrđen je rollback
- korisnik je izričito odobrio produkcijski prijenos

## Zabranjene promjene bez posebnog odobrenja

- uklanjanje postojeće interne obavijesti
- promjena interne adrese prosljeđivanja
- promjena aktivne kontakt rute
- promjena EMAIL bindinga
- promjena KV ili R2 bindinga
- gašenje automatske potvrde korisniku
- promjena produkcijskih Cloudflare ruta

## Novi sloj

Mail Agent ostaje razvojni/preview sloj za:

- čitanje običnih dolaznih mailova
- AI klasifikaciju
- kontekstualne odgovore bez fiksnih predložaka
- Inbox/Outbox/Sent/Held
- automatsko slanje samo niskorizičnih općih odgovora
- zadržavanje pravnih, ugovornih, financijskih, sigurnosnih i drugih osjetljivih poruka

Produkcija promijenjena: NE.
