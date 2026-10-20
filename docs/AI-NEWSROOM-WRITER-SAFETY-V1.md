# AKTUAL MEDIA — AI newsroom writer: sigurnosni i urednički model

**Status:** draft-only; produkcijsko generiranje isključeno zadano.  
**Sustav:** `workers/gnk-asg-ai-newsroom-writer/`  
**Vlasnik objave:** stvarni ovlašteni urednik kroz postojeći urednički postupak.  
**Ovo nije dokaz odobrenja sadržaja, licence, pravne usklađenosti ili produkcijskog deploya.**

## Što worker radi

- Čita isključivo postojeći `https://gnk-asg.hr/api/public-news-feed` i koristi ograničene RSS metapodatke: izdavača, naslov, kratki sažetak i poveznicu.
- Ne dohvaća puni tekst izvornog članka, ne kopira ga i ne preuzima fotografiju izdavača.
- Može pripremiti dnevni paket od 10 vijesti/pregleda i 3 izvorna komentara; komentar mora imati 10–15 rečenica. Paket se zaustavlja ako nema 13 prihvatljivih stavki iz najmanje četiri izdavača. Ne izmišljaju se stavke radi ispunjenja kvote.
- Ograničava broj stavki po izdavaču, uklanja duplicirane URL-ove, ignorira stavke starije od 36 sati i zaustavlja teme s određenim pravnim, osjetljivim ili osobnim rizicima za zasebnu provjeru.
- Za svaki nacrt stvara lokalnu generiranu SVG uredničku ilustraciju. Ilustracija je jasno navedena kao ilustracija, ne fotografija događaja.
- Predaje vanjske izvore isključivo u `manual_review`. Nacrt nosi AI oznaku, izvorni URL, provenance i stanje prava/ljudske provjere. Ako prethodni paket od 13 nacrta još čeka ljudsku provjeru, novi se paket ne generira.
- Ne objavljuje na AKTUAL MEDIA, ne odobrava sadržaj i ne piše komentare na stranicama drugih medija.

## Zadane blokade

`workers/gnk-asg-ai-newsroom-writer/wrangler.toml` postavlja:

- `workers_dev = false` i nema javne rute;
- `NEWSROOM_DRAFT_GENERATION_ENABLED = false`;
- `NEWSROOM_CLOUDFLARE_AI_APPROVED = false`.

Zakazani događaj je zato bez mrežnih poziva dok obje runtime zastavice nisu zasebno odobrene i postavljene. Ručno pokretanje dodatno zahtijeva zaseban `NEWSROOM_TRIGGER_TOKEN`; token se ne sprema u repozitorij. AI servis u ovoj konfiguraciji je **Cloudflare Workers AI**. Njegovom se endpointu šalju naziv izdavača, naslov i kratki RSS sažetak. Dok nema zasebnog odobrenja za takvu obradu, generiranje ostaje isključeno.

## Objava i autorstvo

- AI nacrt nema evidentiranog ljudskog recenzenta, uredničku odgovornost ni provjerena prava. Klasifikacija rizika i provjera zabranjene uporabe ostaju neprocijenjene (ograničeni keyword filter nije pravna procjena). Nacrt mora ostati u pregledu; samo postojanje testa, rasporeda, izvornog linka ili AI oznake nije odobrenje.
- Odobreni paket može se predati kanonskom Content Factoryju samo skriptom `scripts/newsroom-content-factory-export-v1.mjs`. Skripta po zadanom radi dry-run; `--apply` je potreban za lokalno stvaranje datoteka. Traži svih 13 pojedinačnih provjera, svježe izvore, licencu/uvjete, potvrdu da izvorni tekst nije kopiran, pregled izvornosti/atribucije, potvrdu prava na lokalnu ilustraciju, SEO metapodatke i točan hash sadržaja koji je urednik pregledao.
- Izvoz prihvaća paket `{batchId, posts:[13 stavki], approvals:{[postId]:{...}}}`. Svaka stavka mora i dalje biti u `manual_review` i sadržavati stvarni AI/provenance zapis; za nju zasebno se traže recenzent/vrijeme, hash točno pregledanog nacrta, sadržajna odgovornost, prava/uvjeti izdavača, neprepisivanje izvornika, izvornost/atribucija, prava ilustracije, privatnost, zabrane/rizik i vidljiva AI objava. Nedostajući ili proturječan dokaz zaustavlja cijeli paket.
- Pokretanje bez zastavice je dry-run: `node scripts/newsroom-content-factory-export-v1.mjs --input=/putanja/do/pregledanog-paketa.json`. `--apply` lokalno priprema PR-prve stavke u `content/factory-queue/`; ne objavljuje, ne deploya i ne piše `apps/portal/data/news.json`. `scripts/content-queue-preflight-v1.mjs` blokira AI članak ako urednički zapis provjere/pravâ nedostaje ili se hash HTML-a promijenio. Sidecar u repozitoriju samo je urednička atestacija, nije autentifikacija identiteta i sam ne dokazuje da je imenovana osoba pregledala sadržaj; mora biti potvrđen stvarnim, neovisnim uredničkim pregledom PR-a. Nakon uredničkog PR-a objava ostaje u postojećem Content Factory rasporedu i exact-SHA release postupku.
- Backend za dinamične zapise postavlja neutralan potpis `AKTUAL MEDIA uredništvo` i `editorialApproval: null`. Ne može se kroz enqueue payload izmisliti Nerminovo autorstvo ili odobrenje.
- Osobni potpis Nermina Sefića smije se koristiti samo za stvarno autorski tekst uz potvrđeni pojedinačni byline. Urednička uloga nije autorstvo.
- Admin pregled služi za čitanje nacrta i izvora; nema tipku za odobravanje ili objavu. Za dinamičnu stavku ne postoji automatski prečac iz `manual_review` u javni status.
- Svako buduće odobrenje mora zabilježiti stvarnog recenzenta, vrijeme, sadržajnu provjeru, izvor/provenance, prava vizuala i zasebnu objavnu odluku kroz ovlašteni urednički postupak.

## Granice distribucije

- Zabranjeno je masovno komentiranje na člancima Jutarnjeg, Poslovnog, Lidera, Večernjeg, Indexa ili drugih izdavača. Komentar za vlastitu rubriku `komentari` nije komentar objavljen na tuđoj platformi.
- Puni tekst ili tuđa fotografija ne preuzimaju se bez izričite licence/dozvole. Izvor se navodi i povezuje; za vizual se koristi dopuštena licenca ili vlastita označena ilustracija.
- Nisu konfigurirani niti dodani novi RSS izvori tabloida. Novi izdavači zahtijevaju provjeru feeda, uvjeta korištenja, dozvoljenog sažimanja, atribucije i prava na slike prije dodavanja. Sama dostupnost RSS-a nije licenca.
- Hashtagovi, ako se naknadno odobre za društvenu distribuciju, nisu SEO ključne riječi. Ovaj worker ih ne šalje vanjskim platformama.

## Preduvjeti prije aktivacije

1. Odvojeno odobriti ili zamijeniti Cloudflare Workers AI obradu; ranije ograničenje na dijeljenje s trećim AI servisima ostaje na snazi.
2. Provjeriti uvjete i prava za svaki izdavač/izvor, uključujući svaki novi poslovni ili tabloidni feed i vizual.
3. Osigurati stvarni, autentificirani urednički postupak koji bilježi tko je sadržajno pregledao i odobrio pojedini tekst. Ne koristiti ime urednika kao placeholder.
4. Testirati batch, source provenance, AI disclosure, originalne vizuale, SEO metapodatke i eventualnu verifikaciju javne objave prije bilo kakvog production enablementa.
5. Zadržati glavni single-writer, release-fence, exact-SHA i live-verification postupak. Deploy koda nije isto što i objava sadržaja.

## Provjere

```sh
node scripts/test-newsroom-writer-safety-v1.mjs
node scripts/test-content-source-governance-v1.mjs
node scripts/test-news-publication-seo-contract.mjs
node scripts/test-ai-act-governance-v1.mjs
node tests/test-content-queue-preflight-v1.mjs
node --test tests/content-queue-preflight-holds.test.mjs
node tests/test-newsroom-content-factory-export-v1.mjs
```
