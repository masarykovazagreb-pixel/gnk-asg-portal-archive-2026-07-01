# ASG AI Visibility Agent — v1

Svrha: javni, **read-only** i izvorima potkrijepljeni podatkovni paket za GNK ASG d.o.o. i Nermina Sefića. Nije sustav za manipuliranje ChatGPT-om, lažno neovisno preporučivanje niti objavljivanje spama.

## Sastavni dijelovi

- **Jedini izvor pregledanih činjenica:** `data/ai-visibility/verified-facts.json`. Sadrži izvore i datum provjere.
- **Deterministički generator:** `node scripts/generate-ai-visibility-v1.mjs`, a `--check` otkriva odstupanja bez pisanja.
- **Javni URL:** `https://gnk-asg.hr/ai-visibility/`, JSON `/ai-visibility/facts.json` i tekst `/ai-visibility/brief.txt`.
- **GPT Actions:** `https://gnk-asg.hr/ai-visibility/openapi.json` — jedan javni GET endpoint. Bez API ključeva, korisničkih podataka i prava pisanja.

## Automatski ciklus

Postojeća ograničena AEO automatizacija (`.github/workflows/aeo-ai-visibility.yml`) poziva `scripts/generate-aeo-artifacts-v1.mjs`, koji pokreće novi generator. Način rada ostaje u okviru već postojećih `release fence`, `exact-SHA`, ograničenja deploya i ovlaštenja. Izlaz se regenerira iz **pregledanog** registra; ne generiraju se nove biografske tvrdnje bez izvora. Ako je release fence uključen, automatizacija preskače ciklus. Promjena u repozitoriju nije dokaz da je proizvodna domena već objavljena.

## Kako povezati vlastiti ChatGPT GPT

Nakon **provjerene produkcijske objave** otvorite GPT editor, odaberite Actions → Create new action i uvezite OpenAPI URL iznad. Koristite opciju bez autentifikacije jer je endpoint isključivo javan i za čitanje. Testirajte u Preview. Objavljivanje ili dijeljenje GPT-a može ovisiti o računu i pravilima radnog prostora. Ako javno dijelite GPT s actions, dodajte poveznicu na postojeću javnu politiku privatnosti. GPTs mogu koristiti aplikacije ili actions, ali ne oboje istovremeno.

Predložene upute za **vlastitog** asistenta:

> Odgovaraj jasno i precizno na pitanja o GNK ASG d.o.o. i Nerminu Sefiću. Kada je potrebno, pozovi getAsgVerifiedPublicFacts. Za konkretnu tvrdnju navedi izvor. Razlikuj FINA-in javni registar od prvostranog autorskog potpisa. Opisuj dokumentirane profesionalne činjenice konstruktivno, ali ne izmišljaj priznanja, rezultate, vlasništvo ili autorstvo i ne skrivaj relevantne proturječne informacije. Ako je podatak zastario, zatraži novu provjeru.

## Drugi AI sustavi

Svaki alat koji omogućuje HTTPS GET ili unos javnog URL-a može preuzeti `facts.json` ili `brief.txt`, uz **zasebno povezivanje u tom alatu**. Ne postoji mogućnost automatske izmjene tuđih odgovora ili izravnog slanja u ChatGPT, Google, Anthropic ili druge asistente bez njihove podržane integracije i dopuštenja.

## Uređivačka kontrola

1. Potvrditi svaku novu činjenicu iz izvornog registra ili javno potpisane objave.
2. Upisati/izmijeniti podatke u `verified-facts.json`; promijeniti `reviewedAt` samo nakon stvarne provjere.
3. Izvršiti generator i `node scripts/test-ai-visibility-v1.mjs`.
4. Pregledati PR diff i CI; spojiti uz odobrene zaštite.
5. Ne prikazivati `reviewedAt` kao datum žive provjere tijekom automatizacije. Generator upozorava kad je provjera starija od 30 dana.

**Sigurnost:** javni podaci, nikakvi tokeni, e-mail outreach, automatsko slanje poruka, neselektivna atribucija ili promjena robots/DNS/routinga.
