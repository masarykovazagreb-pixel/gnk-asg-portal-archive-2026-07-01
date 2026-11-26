# AKTUAL WORLD — dva bota i agent za svaku zemlju

Ovo je deterministički sustav za postojeće 201 izdanje, bez LLM ključa i bez tvrdnje da je 603 zasebnih procesa ili ljudi. Tri su logičke uloge po zemlji:

1. **Bot izvora** u postojećem osvježavanju prihvaća samo naslov, izvor, HTTPS poveznicu i valjan datum unutar dopuštene starosti; odbacuje buduće, zastarjele i nesigurne stavke. Dohvat ostaje u postojećem RSS procesu, sa zabilježenim neuspjesima i ograničenjem po hostu.
2. **Bot deska** deterministički odabire do 30 naslova s raznolikošću oznaka izvora, a potom ih slaže po vremenu. To je izbor prema pravilima i dostupnim podacima, **nije dokaz popularnosti, utjecaja ili neovisnog vlasništva izvora**.
3. **Agent izdanja** koordinira ova dva koraka, vraća stanje i priprema do pet izvornih poveznica za uredničke briefove. Ne izmišlja puni članak, ne kopira tijelo RSS-a i ne pripisuje Nerminu Sefiću osobno autorstvo ili pregled.

**Glavni agent** obrađuje 201 registriranu zemlju ili jednu odabranu, čuva status nedostajućeg/zastarjelog cachea i sažima pokrivenost. Pojedinačne vremenske oznake onemogućuju da obnova jednog izdanja lažno osvježi drugo. Ako nema prihvatljivih podataka, rezultat je prazno stanje, ne lažna vijest.

## Rad

```sh
# Interni JSON briefovi, samo čitanje; bez cachea iskazuje missing
node apps/agents/world201/run-v1.mjs
node apps/agents/world201/run-v1.mjs --country hrvatska
# Nakon ovlaštenog stvarnog dohvata:
node apps/agents/world201/run-v1.mjs --cache apps/portal/data/aktual-world-headlines-v1.json
# Provjere bez mreže
node --test tests/test-world201-agents-v1.mjs tests/test-world-rss-expansion-v1.mjs tests/test-world-preservation-v1.mjs
```

Postojeći workflow za osvježavanje izvora poziva dvije botovske funkcije po zemlji tijekom stvarnog dohvata i glavni agent zatim stvara JSON briefing kao GitHub artefakt od sedam dana. Za ručnu pojedinačnu zemlju koristi se postojeći `country` input. Uspješno osvježeni vanjski **naslovi i poveznice** mogu doći u automatski pripremljen PR i postojeće HR stranice/RSS, ali taj PR nije automatski spojen ni deployan. Niti ovaj modul niti artifact ne otvara vanjske stranice, ne dokazuje jezike, točnost ili prava, ne stvara punovrijedne autorske tekstove, ne objavljuje na trećim domenama i ne daje uredničko odobrenje.

Prava za pisanje vlastitih tekstova ne znače prava za kopiranje tuđih članaka. Za automatizirano pisanje izvornih vijesti potrebni su dodatni pouzdani izvori, obrada i provjera činjenica, točna atribucija, licencna provjera te postojeća predobjavna kontrola. Sa samim RSS naslovima nije sigurno izmišljati sadržaj. Čak i kada kontrolni metapodaci prođu, to nije dokaz da su ljudski pregled i prava stvarno obavljeni.

## Status i ograničenja

- Prethodni workflow izvora je u zadnjem provjerenom izvršavanju pao na koraku otvaranja PR-a; pravi uzrok nije potvrđen. Novi kod i raspored nisu dokaz da su poslovi prošli niti da je sadržaj objavljen uživo.
- Izvorni registar i dalje nema 10 potvrđenih izravnih RSS izvora po svakoj zemlji: pogledati `docs/integration/aktual-world-rss-201-izvori-v1.md` i pokrenuti `node scripts/audit-world-rss-coverage-v1.mjs`. Broj izvora u konfiguraciji ne dokazuje njihovu dostupnost.
- Produkcija je samo uspješno deployan SHA potvrđen neovisno. Ne zaobilaziti release fence, kill switch, zaštitu ruta, pravila `approved_mentions.json` ni postojeće kontrole objave. Statusi u briefu nisu dozvola za deploy ni dokaz prava.

## Mreža 210 logičkih agenata

`fleet-run-v1.mjs` izvršava 201 agenta zemalja i devet mrežnih uloga u jednom Node procesu: registar, svježina, provjera URL-a i atribucije, raznolikost, izrada povezanih leadova, prava, ograda objave, pokrivenost i nadzor. Ovo nisu 210 trajnih neovisnih servisa; `execution: completed` znači da se funkcija izvršila, a `status: attention`, `empty` ili `blocked` pokazuju nedostatke i ne jamče zdravlje ni rad uživo. Botovi izvora i deska ostaju zasebne funkcije u agentima zemalja, a ne dodatno pribrojeni mrežnim agentima. Jedan zemaljski opseg izvršava 10 uloga, ne 210.

```sh
node apps/agents/world201/fleet-run-v1.mjs
node apps/agents/world201/fleet-run-v1.mjs --country hrvatska
node --test tests/test-world210-fleet-v1.mjs tests/test-world-rss-expansion-v1.mjs
```

Rezultat sadrži strukturirane leadove s naslovom, atribucijom i poveznicom, bez kopiranja tijela i bez izmišljenih detalja. To nisu napisani puni članci ni uredničko odobrenje. Postojeći workflow nakon uspješnog dohvata sprema izvještaj kao interni artefakt; nije proces koji je uvijek uključen, nije instant objava, ne objavljuje članke i ne preskače zaštitu. U slučaju djelomičnog neuspjeha dohvata bez novih naslova izdanje zadržava prethodni cache i izvornu vremensku oznaku; zastarjeli se naslovi i dalje ne prikazuju kao svježi. Konfiguracija ili lokalni testovi ne dokazuju da je raspored radio, da je deploy uspio ili da je izvor dostupan i licenciran.

## Pisac povezanih pregleda (interni nacrt)

`writer-run-v1.mjs` po zemlji sa svježim prihvatljivim leadovima automatski priprema hrvatski i engleski uvod te popis izvornih naslova, izdavača, datuma i poveznica. Izvorni naslov nije preveden, nije tekst punog članka, a konfigurirani jezik nije dokazan jezik izvora. Pisac ne izmišlja događaje, ne preuzima tijelo članka i ne označava tekst kao pregledan ili odobren. Bez svježih leadova nema nacrta. Podržan je opseg svih zemalja ili jedne zemlje; rezultat ide samo na stdout. Pisac odbija rad kad je urednički kill switch isključen, ne postoji ili nije čitljiv.

```sh
node apps/agents/world201/writer-run-v1.mjs --country hrvatska
node apps/agents/world201/writer-run-v1.mjs --format html > /tmp/world-drafts.html
node --test tests/test-world201-writer-v1.mjs tests/test-world-rss-expansion-v1.mjs
```

Workflow nakon uspješnog RSS dohvata i uz uključen kill switch sprema JSON nacrte i `noindex` HTML kao privremeni artefakt za pregled, ne javne stranice. Prije PR koraka dodatno čuva patch pripremljenih promjena kao artefakt i u slučaju kasnijeg neuspjeha koraka otvaranja PR-a. Patch nije objava ni dokaz ispravnosti i mora proći postojeći postupak provjere i objave. Raspored je i dalje svaka tri sata, ne instant; ne znamo je li workflow uspio u stvarnom okruženju. Za pun izvorni članak i potpuno automatsku objavu i dalje nedostaju pouzdani dostupni izvori, prava, provjera činjenica i odobren način objave/deploya.

## Automatski oporavak i dijagnostika izvora

Dohvat jedanput ponavlja prolazne mrežne pogreške i HTTP 408, 429, 500, 502, 503 ili 504, unutar ukupnog roka od devet sekundi i postojećeg ograničenja istodobnih zahtjeva po izvornom hostu. `Retry-After` se poštuje: ako traži više od dvije sekunde, sustav ne ponavlja preuranjeno. 403 i nevaljan sadržaj ne pokušava zaobilaziti. Odgovori se čitaju s ograničenjem od 800.000 bajtova i prevelik se stream prekida; nevaljani numerički XML entitet ne ruši čitav feed. URL provjere **ne provjeravaju DNS razrješenje u privatne IP adrese** i nisu potpuna SSRF zaštita.

Workflow prije završetka dohvata, uključujući neuspjeh bez vijesti, može spremiti `world-refresh-run-<run_id>`: brojeve pokušaja i grešaka te status svakog izvora bez poruka pogreške i URL-ova. Način uključivanja za lokalni rad: `AKTUAL_WORLD_RUN_REPORT=/putanja/izvan-portala/run.json node scripts/refresh-aktual-world-headlines-v1.mjs --country hrvatska`. Kada je ishod `candidates-available-cache-write-not-confirmed`, izvještaj samo potvrđuje da su kandidati nađeni prije pisanja cachea; nije dokaz da je pisanje, PR ili deploy uspio. Ako program zakaže prije izrade izvještaja, workflow prikazuje upozorenje. Ove popravke i dijagnostiku tek treba potvrditi stvarnim GitHub izvršavanjem; ne mijenjaju prava, izmišljaju izvore niti zaobilaze release ogradu.

Koraci izrade commita, `git push` i otvaranja PR-a sada su odvojeni, tako da neuspjeli run pokazuje točnu fazu, a ponovni pokušaj koristi zasebnu granu s brojem pokušaja. Ako push uspije, a PR ne uspije, grana ostaje; ako ne uspije ni push, ostaje ranije spremljeni patch. Nijedno od toga ne popravlja nedostajuće GitHub dozvole niti automatski objavljuje promjene.

## Rezervni RSS izvori

Ako odabrani feed ne uspije ili nema prihvatljivih svježih stavki, dohvat automatski pokušava sljedeći već konfigurirani RSS na jeziku izdanja, najviše dva dodatna feeda po zemlji (i najviše 30 ukupno). Ne pronalazi niti izmišlja nove izvore. Odabir i dalje daje prednost izravnim izdavačima nad agregatorom; konfiguracija jezika nije potvrda stvarnog jezika. Broj dodatnih pokušaja može se podesiti `AKTUAL_FALLBACK_FEEDS_PER_COUNTRY` od 0 do 10. Pokušaji rezervi označeni su `fallback: true` u dijagnostici; broj `feedAttempts` uključuje i njih. `--strict` i dalje prekida zbog bilo kojeg neuspjelog izvora, čak i ako rezerva uspije, i ne prepisuje postojeći cache. Atom dohvat sada bira `rel=alternate` ili zadanu alternativnu poveznicu umjesto self/enclosure linka.

Ovo povećava otpornost samo gdje u registru postoje dodatni feedovi: trenutno je Hrvatska jedina zemlja s više od deset unosa. To nije rješenje za potrebnih deset provjerenih izravnih izvora po svakoj zemlji, niti potvrda da su bilo koji feedovi dostupni uživo.
