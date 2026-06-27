# THE CODE Media Accreditation & Invitation System — specifikacija V1

## Cilj

Izgraditi zatvoren sustav prijava kroz GNK ASG aplikaciju u kojem svaka redakcija dobiva jedinstveni poziv, siguran pristup, status prijave i potpunu revizijsku evidenciju.

## 1. Identitet poziva

Svaka redakcija dobiva:

1. ljudski čitljivu šifru, primjer `TC26-HR-8M4Q-X7PD-2K`;
2. jedinstvenu sigurnu poveznicu s jednokratnim aktivacijskim tokenom;
3. newsroom račun vezan uz službenu domenu i službeni e-mail;
4. zasebne korisničke pristupe za osobe koje redakcija ovlasti.

Šifra ne smije biti sekvencijalna niti otkrivati ukupan broj pozvanih redakcija. U bazi se čuva kriptografski sažetak šifre, a ne otvorena vrijednost.

## 2. Prijava i autentikacija

- Aktivacija: šifra poziva + službeni e-mail redakcije.
- Nakon aktivacije: passwordless magic link ili jednokratni kod na službeni e-mail.
- Svaka osoba ima svoj korisnički zapis; nema dijeljenja jedne lozinke.
- Po potrebi se nakon akreditacije uključuje dodatna autentikacija.
- Svaka sesija bilježi vrijeme, IP, user-agent, uređaj i rezultat prijave.

## 3. Glavni tijek

1. Admin uvozi ili ručno otvara redakciju.
2. Sustav generira šifru, sigurnu poveznicu i personalizirani PDF.
3. E-mail se šalje na službenu adresu redakcije.
4. Bilježe se slanje, dostava, bounce, otvaranje kada je raspoloživo, klik i odgovor.
5. Redakcija aktivira račun.
6. Unosi profil redakcije i najviše tri člana tima.
7. Unosi putnu opciju A ili B, posebne potrebe i uredničke interese.
8. Prijava se zaključava i predaje.
9. Sustav automatski potvrđuje zaprimanje, ali ne odobrava akreditaciju.
10. Ovlaštena osoba odlučuje: dodatni podaci, odobreno, lista čekanja, odbijeno ili povučeno.
11. Tek nakon odobrenja otvara se sigurna dostava putnih i identifikacijskih dokumenata.
12. Organizator vodi rezervacije, intervjue, hotel, transfere i konačnu akreditaciju.
13. Za događaj se izdaje zaseban QR/badge token bez osobnih podataka u QR sadržaju.
14. Nakon događaja generira se potpuni audit i arhiva po redakciji.

## 4. Statusi

### Poziv
`draft`, `issued`, `sent`, `delivered`, `opened`, `activated`, `expired`, `revoked`

### Prijava
`not_started`, `in_progress`, `submitted`, `needs_information`, `under_review`, `approved`, `waitlisted`, `rejected`, `withdrawn`

### Sudionik
`proposed`, `identity_pending`, `verified`, `approved`, `rejected`

### Putovanje
`not_submitted`, `pending_approval`, `approved`, `booked`, `changed`, `cancelled`

## 5. Evidencija i dokazivost

Za svaku radnju čuvati:

- jedinstveni ID događaja
- redakciju, korisnika i ulogu
- datum i vrijeme u UTC-u
- IP, user-agent i identifikator sesije
- vrstu radnje
- prethodno i novo stanje
- hash dokumenta ili zapisa
- e-mail Message-ID i status isporuke
- tko je donio ljudsku odluku i kada
- razlog promjene ili odluke
- verziju uvjeta i dokumenta koju je korisnik vidio

Audit događaji moraju biti append-only. Administratori ne smiju tiho prebrisati povijest.

## 6. Dokumenti i privatnost

- Putovnice i osjetljivi dokumenti ne primaju se običnim e-mailom.
- Upload ide kroz vremenski ograničenu sigurnu poveznicu.
- Datoteke se šifriraju u pohrani i prijenosu.
- Svako čitanje ili preuzimanje dokumenta ulazi u audit.
- Pristup se dodjeljuje po ulozi i najmanjem potrebnom opsegu.
- Rokovi čuvanja i brisanja definiraju se posebnom odlukom i pravno/compliance pregledom.

## 7. Uloge

- `super_admin`
- `media_program_director`
- `accreditation_reviewer`
- `travel_coordinator`
- `interview_coordinator`
- `hotel_transfer_coordinator`
- `finance_approver`
- `read_only_auditor`
- `newsroom_admin`
- `newsroom_member`

## 8. Personalizirani dokumenti

Pri slanju sustav proizvodi:

- uvodni e-mail
- personalizirani medijski poziv PDF
- sigurnu poveznicu za prijavu
- QR za otvaranje prijave
- nakon odobrenja: potvrdu akreditacije, putni sažetak, raspored intervjua i završni press pack

Svi dokumenti moraju imati isti `INVITATION_CODE`, newsroom ID i verziju predloška.

## 9. Izvoz i izvješća

Po redakciji:

- PDF dossier
- CSV/JSON zapis prijave
- kronologija e-mailova
- kronologija prijava i odluka
- popis dokumenata s hash vrijednostima
- putovanja, hotel, transferi i intervjui
- check-in/check-out evidencija

Globalno:

- poslano / dostavljeno / aktivirano / predano
- države, tipovi medija i jezici
- broj prijavljenih sudionika
- odobreni, lista čekanja i odbijeni
- otvorene dopune
- putovanja za odobrenje i rezervaciju
- intervju zahtjevi i raspoloživi slotovi

## 10. Sigurnosne zabrane

- nema zajedničkih newsroom lozinki
- nema slanja putovnica običnim e-mailom
- nema odobrenja koje provodi samo automatizacija
- nema kodova u javno indeksiranim URL-ovima
- nema QR-a s otvorenim osobnim podacima
- nema brisanja audit zapisa kroz standardni admin UI
