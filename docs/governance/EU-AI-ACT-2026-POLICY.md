# MASTER ASG — EU AI Act: pravila i kontrola uporabe AI-ja (v1)

**Usvojeno:** 17. listopada 2026. · **Status:** obvezna interna pravila projekta, ne potvrda zakonske usklađenosti.

**Vrijedi za:** GNK ASG d.o.o., AKTUAL MEDIA, urednički sustav, AI agente i botove, AI Visibility, korisničke chatbote, generiranje slika/zvuka/videa, automatizirano poslovno odlučivanje i nove AI integracije.

## Izvor i razlika između izvora i pravila

Polazište: Luka Fišić, Jutarnji list, **5.10.2026.**, „Akt o umjetnoj inteligenciji: ovo su glavna pravila ponašanja za tvrtke”. Članak opisuje zabrane, AI pismenost, transparentnost, rizike i kazne. On je **sekundarni pregled**, a obveze se tumače prema Uredbi (EU) 2024/1689 (konsolidirani tekst 27.7.2026.), službenim smjernicama Komisije i važećem nacionalnom pravu. Ne prepisivati novinski tekst niti tretirati članak kao zakon.

Primarni izvori i kontrolni datumi u [strojnom registru](../../config/eu-ai-act-governance-v1.json).

## Normativna pravila ASG-a

**ASG-AI-01 — inventar, namjena i uloge.** Prije aktivacije evidentirati svrhu sustava, gdje se izvršava, koristi li vanjski model, tko je pružatelj (*provider*), a tko subjekt koji uvodi/koristi sustav (*deployer*), koje podatke prima, čiji život i prava utječe i tko je odgovoran za nadzor. Ne klasificirati sustav kao visokorizičan samo zato što je velik ili koristi LLM; presudna je namjena i zakonski kriteriji.

**ASG-AI-02 — zabranjene prakse, bez iznimke kroz outsource.** Zaustaviti implementaciju zabranjenih praksi iz članka 5., uključujući štetnu manipulaciju, iskorištavanje ranjivosti, zabranjeno društveno bodovanje, određene biometrijske obrade, nedopušteno struganje fotografija za prepoznavanje lica i nedopušteno prepoznavanje emocija u radu/obrazovanju. Posebne dodatne zabrane od 2.12.2026. Ne implementirati ni za treću stranu.

**ASG-AI-03 — transparentnost (čl. 50).** Korisniku interaktivnog AI sustava otkriti da razgovara s AI-jem, kada to već nije očito i uz točnu primjenu uloge pružatelja. Deepfake slike, audio i video koji izgledaju autentično moraju imati jasnu obavijest kako je primjenjivo. Za AI-generirani ili AI-izmijenjeni tekst koji se objavljuje radi informiranja o **pitanjima javnog interesa**, osigurati izjavu o AI nastanku, osim kad su **stvarna ljudska provjera ili urednička kontrola** provedene te postoji konkretna fizička ili pravna osoba koja preuzima **uredničku odgovornost**. Automatski prolaz testa, prepisivanje i lektura sami po sebi NISU dokaz izuzeća. Za pružatelje sustava u odnosnim slučajevima predvidjeti strojno čitljivo označavanje. Ne tvrditi da svaki e-mail ili prijevod nužno treba oznaku.

**ASG-AI-04 — ljudska urednička kontrola.** Izvor, rukopis i vizuale pregledava odgovorna osoba; potvrđuje provjeru činjenica, izvora, autorstva, autorskih prava, konteksta i datuma. Prije publikacije zabilježiti *tko, kada, što je sadržajno pregledao, uredničku odgovornost i odluku*. Samo ljudski pregled s tim elementima može biti podloga za izuzeće iz čl. 50(4); osobni autor se ne izmišlja. Postojeće strože uredničke kontrole ostaju na snazi.

**ASG-AI-05 — prava, privatnost i povjerljivost.** Bez potrebne pravne osnove i sigurnosnih mjera ne slati osobne podatke, tajne, sudsku dokumentaciju, podatke klijenata, financijske tajne, pristupne ključeve i sadržaj zaštićen autorskim pravom u vanjske sustave. Primijeniti GDPR, ugovorne i druge odvojene obveze. AI Act nije zamjena za GDPR ili autorsko pravo.

**ASG-AI-06 — AI pismenost i odgovornost.** Voditi evidenciju AI alata, rizika, odgovornih osoba i poduzetih mjera osposobljavanja prema ulozi. Nakon izmjena u srpnju 2026. čl. 4. traži poduzimanje mjera za poticanje AI pismenosti, ne jamčenje specifične individualne razine. Specifična certifikacija ili AI službenik nisu opća obveza samo zbog članka 4. Za visokorizične uporabe zahtijeva se poseban stručni pregled i po potrebi osposobljavanje za ljudski nadzor.

**ASG-AI-07 — zabrana obmanjivanja.** Nema lažnih neovisnih preporuka, lažnih ljudskih autora, prikrivenih botova, deepfakeova koji se predstavljaju kao stvarni, netočnih poslovnih rezultata, izmišljenih izvora ili generičkog automatskog potpisivanja svake vijesti imenom Nermina Sefića.

**ASG-AI-08 — posebni postupci.** Zapošljavanje, rangiranje kandidata, ocjenjivanje radnika, kreditna sposobnost, osiguranje, obrazovanje, biometrija i druga osjetljiva područja imaju zasebnu procjenu prema odgovarajućim prilozima i člancima AI Acta. Prije uvođenja takvih primjena provesti pravnu i tehničku provjeru, bez pretpostavke da su sve zabrane ili high-risk obveze jednake.

**ASG-AI-09 — trag i odbijanje objave.** Ne objaviti uz nepoznat status AI uporabe; nedokumentirana ljudska provjera ne može se naknadno izmisliti. Pri sumnji stop/hold, dopuna dokaza pa novo odobrenje. Zadržati postojeći GitHub single-writer, release fence i exact-SHA postupak. **PR merge nije LIVE**.

**ASG-AI-10 — periodična pravna provjera.** Ovaj dokument prikazuje pravo poznato 17.10.2026.; revidirati kod regulatornih promjena, novog AI sustava i najkasnije prije 2.12.2026. Rokove ne premještati na temelju starijih medijskih članaka.

## Evidencija za svaki novi AI sadržaj (koristiti u internom candidate JSON-u)

```json
{
  "aiGovernance": {
    "usedAI": true,
    "role": "deployer",
    "purpose": "Urednički nacrt objave",
    "riskClassification": "not-high-risk",
    "prohibitedUse": false,
    "prohibitedUseScreenPassed": true,
    "aiLiteracyMeasuresReviewed": true,
    "publicInterest": true,
    "generatesOrAltersText": true,
    "deepfake": false,
    "humanEditorialReview": {
      "substantive": true,
      "reviewer": "ime odgovorne osobe",
      "approvedAt": "2026-10-17",
      "editorialResponsibilityAccepted": true
    },
    "disclosure": { "visible": false, "text": "" },
    "privacyAndRightsReviewed": true
  }
}
```

Ovaj primjer opisuje stvarnu, sadržajnu ljudsku kontrolu **samo ako je ona zaista provedena i dokumentirana**. Prazni/izmišljeni zapisi nisu dopušteni. U javnoinformativnim AI tekstovima bez dokumentirane kontrole **vidljiva AI oznaka je obvezna**. Deepfake mora biti odgovarajuće označen i uz ljudsku kontrolu. Potpis urednika ne pretvara generirani tekst u osobno autorsko djelo.

## Praktična provjera

```sh
node scripts/check-ai-act-governance-v1.mjs --candidate /path/to/candidate.json --strict
node scripts/test-ai-act-governance-v1.mjs
```

Pregledni alat je **read-only**; ne publikuje, ne šalje podatke, ne mijenja rute. Prolaz označuje samo da dostavljeni metapodaci zadovoljavaju ovaj interni ugovor — ne potvrđuje da se stvarna urednička kontrola dogodila. Čuvati zaseban dokaz o provjeri. Ne mijenjati stare objave retroaktivno na temelju pretpostavki. Za nove AI-kandidate ova provjera prethodi dozvoli objave.

## Rokovi i pravni status (na dan usvajanja)

| Primjena | Rok |
|---|---|
| Zabrane čl. 5. i mjere AI pismenosti čl. 4. | 2.2.2025. |
| Obveze pružatelja GPAI modela, gdje se primjenjuju | 2.8.2025. |
| Transparentnost čl. 50. | 2.8.2026. |
| Novouvedene zabrane i prijelaz za određen sadržaj po čl. 50(2) | 2.12.2026. |
| Određeni visokorizični AI iz Priloga III. | 2.12.2027. |
| Visokorizični AI ugrađen u regulirane proizvode iz Priloga I. | 2.8.2028. |

Učinak pojedinog roka ovisi o ulozi (provider/deployer), datumu stavljanja na tržište i kategoriji sustava. Neprecizno je tvrditi da svaka tvrtka već danas mora ispuniti sve obveze za visokorizične AI sustave.

## Izvori

- [Jutarnji list, 5.10.2026. — izvorna stručna novinska analiza](https://www.jutarnji.hr/novac/platforma/akt-o-umjetnoj-inteligenciji-ovo-su-glavna-pravila-ponasanja-za-tvrtke-15752887)
- [EUR-Lex: konsolidirani AI Act (27.7.2026.)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02024R1689-20260727)
- [Europska komisija: obveze transparentnosti iz čl. 50](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)
- [Europska komisija: AI Literacy Q&A](https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers)
- [AI Act Service Desk: vremenski plan](https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act)

**Nadzor:** interna pravila i pregled prava; ovo nije pravni certifikat, službena regulatorna presuda ni jamstvo da su trenutačni sustavi sukladni.
