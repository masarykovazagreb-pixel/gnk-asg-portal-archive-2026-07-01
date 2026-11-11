# 30 operativnih agenata — GNK ASG / AKTUAL MEDIA

Ovo je deterministička operativna dijagnostika, bez LLM ključa. Trideset agenata u `agents-v1.json` imaju točan zadatak i fiksnu provjeru; `run-v1.mjs` odbija izmjene naredbi izvan vlastite allowliste. Svaki agent stvarno pokreće navedeni postojeći test. Nisu to autonomni zaposlenici niti 30 neovisnih servisa. Rezultati su lokalni dokazi o provjerama, ne dokaz da sve stranice rade uživo, da su sadržaji točni ili da postoje prava.

## Pokretanje i sučelje

```sh
# JSON izvještaj za svih 30; izlaz 1 ako je barem jedna provjera pala
node apps/agents/operations/run-v1.mjs > artifacts/operations-30-v1.json
# Jedan agent; izvještaj jasno kaže complete=false
node apps/agents/operations/run-v1.mjs --agent O07
# Stvarni interni kandidat u postojećem JSON formatu:
node apps/agents/operations/run-v1.mjs --candidate /putanja/kandidat.json --as-of YYYY-MM-DD
node --test tests/test-operations-30-v1.mjs
```

JSON standardni izlaz je strojno sučelje za alate, **nije** javni HTTP API. Za pojedinačne kandidate zajedno se pozivaju postojeće stroge predobjavne i AI-govcheck kontrole. Datum je obvezan: operater mora potvrditi stvarni datum, osobito ako je sistemski sat nepouzdan. Nedostajuće datoteke, nevaljan datum, greške, rokovi i nepročitljiv odgovor blokiraju provjeru. Prolaz metapodataka ne potvrđuje istinitost sadržaja, stvarne licence ili da je ljudska kontrola obavljena. Kandidat uvijek ostaje bez automatske odluke o objavi.

Dnevni, već postojeći workflow `.github/workflows/network-agents-daily.yml` gradi mrežne izlaze i zatim pokreće agente te sprema `operations-30-<run_id>` kao GitHub artefakt na 30 dana. Rezultati pogreške ruše posao; nema direct-main pisanja ni novog crona. Ako gradnja mreže padne, provjera agenata se ne izvodi. Workflow aktivan na grani nije dokaz da je raspored na mainu ili u produkciji već aktivan. Niti jedan alat ovdje ne mijenja `podijeli/vijest`.

## Prava i urednički tijek

1. Postojeći `apps/agents/writer-agent-v1.mjs` i `control-agent-v1.mjs` stvaraju nacrte i strojne odluke u artefaktima. Postojeći `agent-editorial-daily.yml` je read-only prema GitHubu; generirane stranice sprema kao artefakt, ne kao automatski javni deploy. AI kontrola nije ljudsko odobrenje, a test procesa ne dokazuje prava sadržaja.
2. Prije javne objave urednik mora stvarno provjeriti činjenice, izvore, prava, datume, jezik, autorstvo, AI podrijetlo i preuzeti odgovornost prema postojećim pravilima. Koristiti postojeće kontrolne alate za kandidata. Ne potpisivati generički tekst kao osobno autorsko djelo Nermina Sefića niti tvrditi da je izvršio pregled ako nije. Vanjska promocija i distribucija traže postojeće pojedinačne dozvole.
3. Objavljivanje i izmjene preko postojećeg single-writer procesa: pregled diffa, potrebna odobrenja i neoslabljen CI; zatim točni odobreni SHA na mainu i zasebna provjera javne stranice. Spajanje nije deploy. Ne zaobilaziti kill switch, zaštite ruta, deploy fence ni pravila vlasnika.
4. Diagnostika proizvodi nalaze za popravak, ali ne mijenja kôd, ne instalira pakete, ne dodaje rasporede, ne šalje vanjske zahtjeve i ne objavljuje. Za samonadogradnju nalaz treba pretvoriti u zasebnu testiranu promjenu, s ljudskim nadzorom i postojećim postupkom; ova verzija ne implementira samostalno mijenjanje koda ni automatsku objavu na svim domenama.

## Evidencija namjene i rizika

Namjena: pregled tehničkog stanja i metapodataka kandidata; obuhvaća statičke repozitorijske izlaze obuhvaćene pojedinim testovima, ne jamči pokrivenost svih javnih URL-ova. Sustav se izvršava u Nodeu i postojećem GitHub runneru; nema vanjskog modela ni obrade zahtjeva javnosti. GNK ASG koristi alat kao deployer; pojedinačni postojeći testovi nisu pravni ni urednički pregled. Pogođeni su urednici i čitatelji ako se loša odluka naknadno objavi. Nema biometrije, zapošljavanja, bodovanja ni osjetljivih automatskih odluka. Ako se namjena proširi na takva područja ili vanjski AI, potrebna je nova procjena zabranjenih i visokorizičnih uporaba, privatnosti, prava i uloga prema `docs/governance/EU-AI-ACT-2026-POLICY.md`. Nemojte unositi tajne ili osobne podatke u kandidat niti objavljivati JSON izvještaje koji ih sadrže.
