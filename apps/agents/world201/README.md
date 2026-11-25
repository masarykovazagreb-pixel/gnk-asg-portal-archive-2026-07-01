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
