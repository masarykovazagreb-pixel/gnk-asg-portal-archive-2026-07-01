# Provjera izvora za sljedeći val izdanja (država) — 29. 10. 2026.

Plan širenja (`apps/world/lib/expansion-plan.mjs`) kaže da izdanje ne nastaje dok
nema (a) provjerenih izvora s RSS adresama, (b) scene grada u assets/, (c) naziva
sučelja na jeziku zemlje i (d) barem jednog stvarnog zapisa u arhivi.

Ovaj dokument bilježi uvjet (a). Uvjeti korištenja nisu isto što i aktivan feed:
feed može biti živ, a njegov sadržaj smije se koristiti samo privatno.

## Rezultat po izvoru

| Izdanje | Izvor | Feed živ (29. 10. 2026.) | Uvjeti korištenja | Ishod |
|---|---|---|---|---|
| Pariz (fr) | Le Monde — `https://www.lemonde.fr/rss/une.xml` | da | RSS „strictly personal, non-professional use”; objava ili poslovna uporaba traži dopuštenje | **blokirano** |
| Amsterdam (nl) | NOS — `https://feeds.nos.nl/nosnieuwsalgemeen` | da | RSS samo za „niet-commercieel gebruik door particuliere Gebruikers”; komercijalna eksploatacija nije dopuštena (NOS Algemene voorwaarden, čl. 7) | **blokirano** |
| Madrid (es) | RTVE — `https://www.rtve.es/rss/temas_noticias.xml` | ne (stavke iz 2022.) | nije relevantno | **neispravno** |
| Madrid (es) | El País — `https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada` | da | uvjeti nisu još provjereni | **nije završeno** |
| Berlin (de) | Der Spiegel (u prethodnoj provjeri) | da | „ausschließlich für den persönlichen Gebrauch … nicht selbst publizieren oder kommerziell verwenden” | **blokirano** |
| Berlin (de) | tagesschau, Zeit | — | nisu provjereni | **nije završeno** |

Prethodna napomena da je Berlin „provjeren” (28. 10.) odnosila se samo na to da feed
radi. Uvjeti korištenja za njega nisu bili provjereni.

## Zaključak

- Za većinu nacionalnih medija RSS nije dopušten izvor za objavu u komercijalnom
  portalu. Isti obrazac vrijedi i za izvore koje sustav već koristi, pa nije riješeno
  samo za nove države.
- Sljedeći val se ne proširuje dok se ne odluči pravna osnova (vidi „Odluka” niže).
- Gateovi i ljudska kontrola se ne mijenjaju.

## Odluka koja je potrebna

Ovo je pravno pitanje, pa ga ne rješavam sam. Predlažem jedno od ova tri:

1. **Dozvola/licenca** s izdavačem za svaki izvor (npr. pisani ugovor ili odobrenje).
2. **Samo izvori s dopuštenom ponovnom uporabom**: službeni državni priopćenja,
   otvoreni podaci (EU, državne statistike), izvori pod CC licencom s atribucijom.
3. **Ostati na naslovu + poveznici** bez sažetka i bez kopiranja teksta, uz pravnu
   potvrdu da je to dopušteno.

Dok se ne odluči, ne dodaju se novi izvori u `apps/region/data` niti novi gradovi u
plan kao „live”.

## Ograničenja

- Provjera je napravljena 29. 10. 2026. iz sandboxa. Uvjeti se mogu mijenjati.
- Madrid/El País uvjeti nisu provjereni; tražilica je vratila 429 za tagesschau, pa
  taj uvjet nije potvrđen.
