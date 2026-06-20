# GNK ASG Premium Dark / Light Implementation

Datum: 20. lipnja 2026.
Grana: `visual-redesign`

## Vizualni smjer

Implementacija se temelji na korisnikovim premium dark i light referencama:

- duboka navy/crna premium podloga
- kontrolirani zlatni akcenti
- staklene kartice i mekane sjene
- veliki korporativni naslovi
- globus i globalna mreža ostaju ključni vizualni potpis
- light verzija koristi white/ivory podlogu, navy tipografiju i zlatne obrube
- desktop, javna mobilna aplikacija i mobilni admin čine jednu proizvodnu obitelj

## Implementirano izravno u GitHubu

- zajednički premium CSS sustav
- zajednički navigacijski i AI JavaScript sloj
- puni desktop i mobilni meni
- tamna i light tema
- jedan plutajući Home i jedan AI gumb
- portal hub i profesionalni logo na početnoj bez uklanjanja postojećeg sadržaja
- javna mobilna PWA aplikacija `/app/`
- zaštićeni Mobilni Admin `/operator-mobile/`
- premium Review Center `/review/`
- sigurni Operator Dashboard V5 bez operator tokena u izvornom kodu
- zajednički HR/EN navigacijski registar
- kontrolirani review status; skočni prozor ostaje isključen dok testovi ne završe

## Funkcije koje se čuvaju

- kontakt forma i evidencijski broj
- mail slanje, Inbox, Sent i logovi
- mail adrese i potpisi
- upload fotografija u R2
- tekstovi i draftovi
- Publish Operator i minimum 500 riječi
- Objave / Publications zajednički izvor
- Auto Editor
- AI assist endpoint
- KV, D1, R2, Email i AI binding ugovori

## Sigurnost

Stari Operator Dashboard sadržavao je tvrdo upisan operator token. Nova V5 stranica više ne sadrži token; korisnik ga unosi kroz zaštićenu prijavu, a preglednik ga čuva u `localStorage` samo za aktivni korisnički profil.

Budući da je prethodna vrijednost postojala u Git povijesti, prije konačne produkcijske objave preporučena je rotacija Cloudflare `OPERATOR_TOKEN` secreta.

## Produkcija

- `main` nije mijenjan
- Cloudflare nije deployan
- `gnk-asg.hr` nije mijenjan
- sve promjene su samo na `visual-redesign`
