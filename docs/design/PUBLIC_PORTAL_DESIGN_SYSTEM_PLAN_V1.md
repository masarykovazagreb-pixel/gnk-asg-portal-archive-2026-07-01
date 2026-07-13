# GNK ASG Public Portal Design System — plan V1

## Cilj

Ujednačiti javne HR i EN stranice bez promjene zaštićenog admin, operator, Mail Studio i campaign sučelja. Dizajn se mora temeljiti na zajedničkim tokenima i komponentama, a ne na pojedinačnim inline popravcima.

## Obuhvat

- `/` i `/en/`
- `/newsroom/` i `/en/newsroom/`
- `/objave/`, `/analize/`, `/komentari/`
- `/trzista/` i `/en/markets/`
- `/the-code/` i `/en/the-code/`
- kontakt i media application javne stranice

Zaštićene rute ostaju izvan design migracije osim zajedničkog logotipa i osnovnih sigurnosnih pravila.

## Design tokeni

Jedna CSS datoteka treba definirati:

- boje: navy, gold, neutralne površine, statusne boje
- tipografiju: display, naslov, tekst, meta i monospace
- spacing skalu
- radius, border i shadow skalu
- maksimalne širine sadržaja
- responsive breakpointe
- focus, hover i disabled stanja
- reduced-motion ponašanje

## Zajedničke komponente

1. Public shell: header, compact menu, sadržaj i footer.
2. Hero: standard, editorial i campaign varijanta.
3. Section header: naslov, opis i akcija.
4. Card: editorial, news, market, project i status varijanta.
5. Metadata: datum, kategorija, jezik i izvor.
6. Button/link: primary, secondary, text i external.
7. Empty/error/loading state.
8. Data freshness/status badge.
9. Article layout: naslov, lead, sadržaj, izvor i related content.
10. Responsive grid i horizontalni scroller za male ekrane.

## Index stabilnost

- jedan runtime guard po skripti
- jedan vlasnik svakog DOM segmenta
- bez ponovnog uklanjanja i umetanja istih elemenata između više skripti
- skeleton ili stabilan minimalni markup prije async podataka
- timeout i fallback za svaki udaljeni izvor
- `Promise.allSettled` za međusobno neovisne izvore
- bez layout shiftova zbog naknadnog logotipa, fonta ili slike
- lokalni fallback kada API nije dostupan
- jasan LIVE / PARTIAL / OFFLINE / STALE status

## HR/EN paritet

Svaka javna komponenta mora imati:

- isti raspored i funkcionalnost na oba jezika
- lokalizirane tekstove i prazna stanja
- ispravne canonical i hreflang poveznice
- jezično odgovarajuće interne rute
- zabranu tihog preusmjeravanja EN korisnika na HR članak bez oznake

## Faze implementacije

### Faza 1 — inventar

Generirati popis CSS datoteka, inline stilova, komponenti, duplih navigacija i route-specific iznimaka.

### Faza 2 — tokeni i shell

Uvesti `public-design-tokens-v1.css` i `public-shell-v1.css`, bez promjene sadržaja.

### Faza 3 — index

Stabilizirati DOM ownership, hero, editorial grid, market status i responsive ponašanje.

### Faza 4 — editorial stranice

Newsroom, objave, analize i komentare prebaciti na zajedničke kartice i article layout.

### Faza 5 — tržišta i THE CODE

Zadržati specifičan vizualni identitet, ali koristiti iste tokene, accessibility i shell pravila.

### Faza 6 — vizualni regression audit

Desktop, tablet i mobile screenshot provjera za HR/EN rute, uz link i accessibility audit.

## Deploy pravilo

Design promjene ne smiju automatski pokrenuti produkciju. Nakon zelenih audita i odobrenog finalnog SHA deploy se smije pokrenuti samo kroz `Deploy Admin Auth V6` s inputom `DEPLOY_ADMIN_AUTH_V6` i novom izričitom potvrdom.
