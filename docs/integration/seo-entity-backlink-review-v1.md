# Pregled SEO-a, entiteta i povezivanja — GNK ASG i AKTUAL MEDIA

## Opseg i ograničenja

Lokalni statički pregled obuhvaća 22.111 HTML datoteka portala, 35 lokalnih datoteka sitemapova i 1.119.726 HTML oznaka slika. To su nalazi skenera, ne broj indeksiranih stranica niti dokaz pozicija u Googleu. Produkcijski deploy nije automatski jednak stanju repozitorija. Pregled vanjskog projekta temelji se na javno prikazanim stranicama; njegov izvorni kod ili administratorski pristup nisu pronađeni u ovom repozitoriju. Ne zaključivati da ovaj repozitorij upravlja vanjskom aplikacijom.

## Rezultati i provedene korekcije

- Početna HR/EN i profil Nermina Sefića imaju usklađene opise za tražilice, Open Graph i Twitter, s kontekstualnim povezivanjem osobe, GNK ASG i AKTUAL MEDIA bez ponavljanja nepovezanih ključnih riječi. Usklađene su i konfiguracijske vrijednosti starog SEO generatora; njegov se masovni zapis nije pokretao.
- U redovima oznaka na početnim HR/EN stranicama poveznice za `#AKTUALMEDIA` i `#GNKASG` vode na odgovarajuće stranice brendova, a osobne oznake na profil u odgovarajućem jeziku. Promjena je uključena u generator pariteta; postojeće podnožje nije prepravljano.
- Profil osobe povezuje na AKTUAL MEDIA i radio; engleskom profilu dodane su izravne poveznice, a s hrvatskog je maknuta zastarjela tvrdnja o osam gradova. I na početnim stranicama i na radiju uklonjen je zastarjeli broj izdanja bez upisivanja novog fiksnog broja.
- Radio HR/EN sada imaju uzajamne hreflang i x-default poveznice. Open Graph vrsta slike ispravljena je u PNG prema potpisu stvarne datoteke, uz stvarne dimenzije 1200 × 630. WORLD imenik dobio je opis i naslov za Twitter karticu.
- Ispravljen je revizijski skener: Unicode granice sada prepoznaju ime s `ć`, a povezanost entiteta provjerava stvarne interne `href` poveznice, ne tekst iz kojeg su prethodno izbačene oznake. Kanonik se prepoznaje neovisno o redoslijedu atributa. Dodani su regresijski testovi.

## Preostale lokalne nalaze treba pojedinačno pregledati

Skener nakon korekcije prijavljuje 3.243 moguće nepovezanosti entiteta: 1.924 za GNK DINAMO Ltd., 1.309 za AKTUAL MEDIA, osam za Nermina Sefića i dva za GNK ASG. To nije broj pokvarenih linkova: alat provjerava samo točno definirani ciljni profil i ne procjenjuje je li dodavanje poveznice smisleno u kontekstu. Dio poveznica na ekvivalentne stranice ili jezične inačice može zahtijevati ručni pregled. Osam prijava za osobu uključuje stranice radnika, sinkronizacije i demonstracije; ne treba ih automatski mijenjati niti pripisivati autorstvo.

Još 207 kanoničkih URL-ova nije pronađeno doslovnim pretraživanjem lokalnih sitemapova; to nije dokaz da su izostavljeni iz svih objavljenih ili udaljenih sitemapova. Šest prijava bez kanonikala odnosi se na četiri HTML datoteke u `assets/` i dvije Google verifikacijske datoteke; ne tretirati verifikacijske datoteke kao obične stranice. Jedanaest prijava bez OG slike uključuje te pomoćne datoteke te statusne i inventarske stranice. Provjeriti namjenu, robots politiku i izvor svakog predloška prije izmjena.

## Vanjski pregled i povratne poveznice

- Vanjski pregled Hrvatske i njegova početna stranica sadrže obične vidljive poveznice na `https://gnk-asg.hr/gnk-aktual/` i `https://gnk-asg.hr/nermin-sefic/`; glavna stranica i WORLD imenik na GNK ASG-u povezuju natrag na vanjski pregled. Ovo dokazuje postojanje opaženih poveznica, ne njihovu indeksiranost, Googleovu atribuciju ni SEO učinak. Puni profil dolaznih poveznica treba provjeriti kroz Search Console ili sličan alat.
- Na vanjskom pregledu demo vijesti postoje i označene su u glavnom prikazu, ali se demo naslovi pojavljuju i u traci uz druge vijesti. Dio bot-sadržaja iznosi činjenične tvrdnje bez vidljivog izvora u pregledanom prikazu. Prioritet je ukloniti izmišljene primjere iz javnog feeda ili ih zasebno jasno označiti na svakoj kartici i u traci; ne promovirati ih kao potvrđene vijesti. Prije objave osigurati izvore, prava i stvarni urednički pregled prema pravilima projekta.
- Vanjski `robots.txt` upućuje na `https://aktual.media/sitemap.xml`, a njegov javni sitemap navodi URL-ove na `https://aktual.media/`, iako se pregled otvara na `j1hex9qg03f0-d.space-z.ai`. Pokušaj dohvaćanja domene `aktual.media` nije uspio u ovom pregledu; to samo po sebi ne dokazuje da domena ne postoji. Vlasnik vanjske aplikacije treba provjeriti vlasništvo domene, DNS, HTTPS, kanonikale, robots i sitemap te uskladiti javni host. Ne upisivati zamišljenu kanoničku domenu.
- Vanjski pregled navodi 391+ izvora, a lokalni WORLD imenik 435 konfiguriranih izvora. To mogu biti različiti registri, pa ih ne treba proglašavati istovjetnima bez usporedbe; niti jedan broj sam po sebi ne dokazuje dostupnost ili prava izvora.
- Vanjski se pregled oslanja na tuđe RSS-ove, fotografije i radijske streamove. Link na izvor ili dostupan stream nije dokaz prava za reprodukciju. Provjeriti licence, atribuciju i javne navode za svaki izvor; ne tvrditi da su tuđi streamovi vlasništvo GNK ASG-a.

## Provjera

Pokrenuti `node --test tests/test-entity-navigation-seo-v1.mjs tests/test-seo-coverage-helpers-v1.mjs`, `node scripts/build-index-parity.mjs --check`, `node scripts/audit-core-entity-seo-v1.mjs`, `node scripts/test-website-jsonld-v1.mjs` i `node scripts/test-aktual-world-directory-v1.mjs`. Novi ciljani testovi uključeni su i u obavezni `scripts/test-all-v1.mjs`. Objavu na javnoj stranici treba potvrditi zasebno nakon odobrenog deploya točnog SHA-a.

### Puni testni prolaz

U izdvojenoj radnoj kopiji, s izgrađenim WORLD, ARHIVA i DNEVNIK izlazima, prošle su 104 od 110 obaveznih provjera. Šest nije prošlo: dvije provjere javnog statusa zbog zastarjelog snimka, te dizajn, brend, tvornica i osvježavanje zbog nedostajućih slojeva na HR/EN stranicama autonomije. Ti izlazi nisu osvježavani niti je datum statusa umjetno mijenjan u sklopu ovog SEO prolaza. Puni test bio je pokrenut prije završnog dodatka kontekstualnih poveznica na profilu i Twitter metapodataka WORLD imenika; završni ciljani testovi pokrivaju i te dodatke.

### Naknadni popravci

Na HR i EN stranice autonomije vraćeni su favicon, dizajnerski i radijski sloj, modul osvježavanja s podatkovnim danom te vidljiva poveznica na GNK DINAMO Ltd. Generator te slojeve sada čuva; kod radijske promocije odbija rad ako postojeći sloj nedostaje ili je dupliciran, umjesto da ga tiho izbriše. Dodane su regresijske provjere. Hrvatskom indeksu komentara vraćena je poveznica `rel=author` na profil Nermina Sefića i ugovor javnog SEO-a ponovno prolazi.

Statusni snimak nije mijenjan: sistemski datum izvršnog okruženja i datum sesije nisu usklađeni, a postojeći repozitorijski podaci nose kasnije datume. Dok se stvarno vrijeme i izvori ne provjere, novo vremensko obilježje ne bi bilo pouzdano. Provjere svježine nisu oslabljene.
