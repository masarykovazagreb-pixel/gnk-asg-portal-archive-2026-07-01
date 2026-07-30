# ZADACI — rubrika KOLUMNE
## Za onoga tko priprema i spušta u produkciju

Izvor sadržaja: `api-lab/kolumne-uzorak.md` (tri gotova uzorka za pregled).
Ovaj popis je za developera koji radi implementaciju — ne diram produkciju sam,
po dogovorenom opsegu (samo pripremne/staging izmjene).

---

## 1. GDJE U STRUKTURI

Rubrika **KOLUMNE** ide u vrh AKTUAL naslovnice, iznad rubrike 01 Svijet —
prije glavne vijesti, ne poslije. To je jedina rubrika koja se ne rotira
automatski; nova kolumna zamjenjuje staru ručno, subotom.

Vizualno: veći prostor od običnih kartica, autorska fotografija (ili inicijali
ako fotografije nema), potpis "Nermin Sefić", datum, i naslov u istoj
naslovnoj tipografiji kao glavni naslov AKTUAL-a — kolumna nije "još jedna
kartica", nego signal da je ovo urednički glas grupe.

## 2. TEHNIČKI ZAHTJEVI

- Nova mapa podataka, npr. `apps/portal/data/kolumne.json`, odvojena od
  `news.json` — kolumne se ne miješaju s automatski dohvaćenim vijestima
- Format zapisa: `{ naslov, tekst, datum, slika (opcionalno), slug }`
- Arhiva prijašnjih kolumni na zasebnoj podstranici, npr. `/gnk-aktual/kolumne/`,
  s poveznicom "Sve kolumne →" ispod trenutne
- Ne generirati automatski — ovo je jedini dio AKTUAL-a koji se ručno uređuje,
  ne kroz workflow

## 3. RITAM OBJAVE

- Subota, jedna kolumna tjedno
- Ako subota prođe bez nove kolumne, prikazuje se zadnja objavljena —
  rubrika nikad ne smije ostati prazna
- Restore point prije prve objave ove rubrike, po istom obrascu kao kod
  naslovnice (`tocka-vracanja/kolumne-<datum>`)

## 4. WORKFLOW ZA UNOS NOVE KOLUMNE

Prijedlog, na developeru da odluči konačan oblik:
1. Tekst kolumne dolazi kao Markdown datoteka u `api-lab` ili posebnu granu
2. Skripta (postojeći obrazac kao za objave) pretvara Markdown u zapis u
   `kolumne.json` i postavlja datum
3. Deploy kao i za ostale sadržajne promjene — kroz `deploy-admin-auth-v6`

## 5. STIL I TON — ZA PROVJERU PRIJE OBJAVE SVAKE KOLUMNE

- Prvo lice, osobni stav, ne izvještaj
- 500-700 riječi
- Jedna tema po kolumni, ne pregled više tema
- Bez citata ili tvrdnji koje trebaju izvor — ovo je mišljenje, ne novinarski tekst
- Potpis uvijek "Nermin Sefić", bez inicijala ili skraćenica

## 6. TRI UZORKA SPREMNA ZA PREGLED

Nalaze se u `api-lab/kolumne-uzorak.md`:
1. **AI za male tvrtke** — zašto je čekanje skuplje od pogreške
2. **Digitalna imovina kao infrastruktura** — od špekulacije do sustava
3. **Energetska tranzicija** — zašto čekanje na nižu cijenu ne funkcionira

Prije objave: pročitati, po potrebi prilagoditi ton, potvrditi da nijedna
tvrdnja ne zvuči kao citirana činjenica bez pokrića.
