# Sigurna sinkronizacija engleskog WORLD imenika

`scripts/build-aktual-world-en-v1.mjs` sada za postojeće stranice zamjenjuje samo tri upravljana dijela: karticu podataka izdanja, popis izvora i redove imenika. Metapodaci, JSON-LD, pristupačnost, autorski i pravni slojevi, oznake i ostali HTML ostaju kakvi jesu. Novi izlaz u praznom direktoriju i dalje se može izgraditi u cijelosti. Skripta unaprijed provjerava sve postojeće stranice i prije bilo kakvog pisanja odbija neočekivani blok ili nejasan robots status.

`--check` sada provjerava **upravljane blokove, popis zemalja i sitemap**, ne potpunu jednakost svih bajtova cijele stranice. Provjere opisa, hashtagova, canonicala, slojeva i sitemapa ostaju zasebni testovi, uključeni u workflow. Sitemap se izrađuje prema stvarnom postojećem robots statusu stranica: sinkronizacija izvora ne pretvara `noindex` u `index` niti označava neovisnost vlasništva. Ako se doda potpuno nova stranica, početni robots status dolazi iz postojećeg pravila generatora.

```sh
node scripts/build-aktual-world-en-v1.mjs --check
node --test tests/test-aktual-world-en-v1.mjs tests/test-aktual-world-meta-v1.mjs tests/test-world-hashtags-sitemap-v1.mjs
# Primjena samo kada je promjena namjerno pregledana:
node scripts/build-aktual-world-en-v1.mjs
```

Workflow za provjeru nema GitHub write ovlasti, ne regenerira stranice u checkoutu i ne radi commit ili push. Za 200 postojećih stranica izvorni blokovi koriste neutralnu oznaku vanjskog izdavača i pokazuju broj različitih hostova, ne nepotvrđenu neovisnost ili broj vlasnika. Skripta ne provjerava licence, mrežnu dostupnost ni istinitost izvora. Testovi rada na izoliranoj kopiji provjeravaju očuvanje vanjskih slojeva, fail-closed i usklađenost s robots pravilima; sami testovi nisu potvrda deploya ili rada uživo.
