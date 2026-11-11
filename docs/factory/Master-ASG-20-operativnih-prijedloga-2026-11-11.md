# MASTER ASG / AKTUAL MEDIA — 20 ciljnih poboljšanja (11. 11. 2026.)

**Podloga:** pregled aktualnog \`main\`, \`docs/factory/operativna-unapredenja-agenata-v1.md\`,
\`AGENTS.md\`, \`docs/ACTIVE-SOURCE-OF-TRUTH.md\` i postojećih uredničkih workflowa.
Ovo je operativni backlog, ne potvrda da su promjene objavljene.

## Prvo razdvojiti četiri stanja

- **Pripremljeno:** nacrt/HTML postoji u privremenom okruženju.
- **Strojno provjereno:** validatori su prošli; NIJE ljudsko uredničko odobrenje.
- **Odobreno:** postoji autentično, zapisnički provjerljivo odobrenje za točan otisak sadržaja.
- **Objavljeno:** exact-SHA deploy uspješan i javna adresa zasebno provjerena.

| # | Prioritet | Poboljšanje | Mjerilo prihvata | Stanje 11.11.2026. |
|---|---|---|---|---|
| 01 | P0 | Stroga validacija HTTPS izvora, bez internog hosta, IP-a, lozinki i posebnog porta | Negativni URL testovi prolaze | Kod na zasebnoj PR grani; CI čeka |
| 02 | P0 | Identitet URL-a bez UTM/FB/GCLID praćenja | Dva tracking linka = jedan izvor | Kod na PR grani; CI čeka |
| 03 | P0 | Kontrola ponovljenog izvora u istom nacrtu | Ponovljeni izvor odbijen | Kod na PR grani; CI čeka |
| 04 | P0 | Ukloniti protocol-relative i putanje izvan domene iz internih linkova | \`//host\`, \`..\`, encoded separator odbijeni | Kod na PR grani; CI čeka |
| 05 | P0 | Nedopustiti ponovljene ID-jeve u redu nacrta | Ne postoji kolizija ID-ja | Kod na PR grani; CI čeka |
| 06 | P0 | Neispravni izvorni niz odbiti bez rušenja cijelog procesa | Null/nepostojeći \`items\` daje kontrolirano odbijanje | Kod na PR grani; CI čeka |
| 07 | P0 | Uskladiti datum nacrta s datumom provjere u Europe/Zagreb | Nacrt druge lokalne kalendarske date ne prolazi | Kod na PR grani; CI čeka |
| 08 | P0 | Registar dopuštenja izvora i prava na citate/slike | Svaki izvor ima provjerljiv status, datum i dokaz; nepoznato ≠ odobreno | Planirano |
| 09 | P0 | Autentificirani ljudski urednički pregled po SHA-256 nacrta | Evidencija tko, kada, koji tekst i izvore pregledao | Planirano |
| 10 | P0 | Odvojena odluka za puštanje u produkciju | Approval ne pokreće deploy bez release-gatea | Planirano |
| 11 | P1 | Snapshots podrijetla činjenica i promjena izvornika | Hash, URL i vrijeme pristupa za svaku tvrdnju | Planirano |
| 12 | P1 | RSS partial-failure i fallback bez izmišljanja sadržaja | Izvještaj po feedu: uspjeh, posljednji dobar zapis, greška | Planirano |
| 13 | P1 | Kontrola zastarjelih članaka i neuspjelih ciklusa | Alert za uzastopne propuste, bez lažno zelenog statusa | Planirano |
| 14 | P1 | Testovi vremenskih prijelaza CET/CEST | 2 prijelazna dana + ponovljeni sat + red objave | Planirano |
| 15 | P1 | Production SHA i javna HTTP provjera kanonskih URL-ova | \`main\`, deploy SHA, status provjere i mjereni URL odvojeni | Planirano |
| 16 | P1 | LCP/INP/CLS budget po HR, EN i mobilnoj naslovnici | Mjerenja prije/poslije, ne deklarativni 'brže' | Planirano |
| 17 | P2 | Ujednačiti responsive slike, dimenzije i prioritet učitavanja | Bez CLS regresija, manje nepotrebnog eager load-a | Djelomično obrađeno u PR #410 |
| 18 | P2 | Canonical, hreflang, sitemap i ASG favicon paritet | Read-only audit svih indeksabilnih korijena | Djelomično obrađeno u PR #407 |
| 19 | P2 | Tematski duplikati između 17/201 izdanja, bez copy/spin sadržaja | Similarity signal + urednički pregled prije distribucije | Planirano |
| 20 | P2 | Operativna nadzorna ploča stvarnih KPI-jeva, bez lažnih 'agenta' ili 'live' brojača | Izvorni SHA, timestamp, fail/stale/unknown, broj stvarnih objava | Planirano |

## Pravila implementacije

- Nijedan od 20 redaka ne dopušta novi samostalni cron, novog direktnog pisca u \`main\`,
  prepisivanje autorskih članaka ili zaobilaženje ručne provjere prava.
- Prvih sedam kontrola predloženo je kroz \`apps/agents/lib/policy-v1.mjs\`,
  \`writer-agent-v1.mjs\`, \`control-agent-v1.mjs\` i nove fixture testove.
- Ujednačavanje javnih oznaka AI provjere i izolirani urednički redovi već su zasebno
  u PR-u #412; ponovno implementiranje bi povećalo rizik konflikta.
- PR #410 (REGION/slike), #407 (favicon/SEO), #409 (radne grupe) su zasebni,
  nespojeni prijedlozi. Ne prikazivati ih kao produkcijski završene.
- Ažurirati stanje tek nakon CI-a, mergea, exact-SHA deploya i javne provjere.
