# AKTUAL MEDIA — poveznice, vidljivost vijesti i SEO

## Što je promijenjeno

- Na HR/EN naslovnici GNK ASG, podatkovnom desku `/aktual-media/` i glavnom news hubu `/gnk-aktual/` postoje izravne, vidljive poveznice na korisnikov vanjski `?country=hrvatska`. Označene su kao **vanjsko probno izdanje**, ne kao jamstvo dostupnosti ili uredničke provjere. Unutarnje poveznice na svjetski imenik i izvore ostaju.
- U HR news hubu usklađena su tri opisa: `description`, `og:description`, `twitter:description`. Opis navodi rubrike i izvore bez promjenjivih brojki koje mogu zastarjeti; ime urednika je puno. Isti tekst je u generatoru. Postojeći canonical, strukturirani podaci, hashtagovi, trake, CSS i sadržaj nisu uklonjeni.
- Interaktivni feed pokušava ponovo nakon mrežne pogreške, neispravnog JSON-a, praznog odgovora ili HTTP pogreške, s vremenskim ograničenjem. Odbacuje nesigurne URL-ove, izričito neprovjerene stavke, nedatirane, buduće i one bez naziva izvora; vijest bez slike i dalje se može prikazati s neutralnom plohom. Ako nema prihvatljivih naslova, umjesto praznog glavnog područja prikazuje se poruka i poveznice na hrvatske izvore i vanjsko probno izdanje. Feed stariji od 48 sati je označen, ne proglašava se svježim.
- Postojeći prikaz bez JavaScripta nazvan je spremljenom snimkom koja može zastarjeti. Popravljeno je i ponavljano dodavanje praznih redova pri njegovu generiranju. Vremenske oznake u feedu ostaju oznake izvora, ne dokaz nezavisne provjere činjenica.

## Što je opaženo, a nije pretpostavljeno

Vanjska stranica za Hrvatsku je pri tekstualnom dohvaćanju prikazala nacionalni pregled i poveznicu na GNK hub. Njezina zasebna RSS adresa je vratila drugačije, automatski označene stavke i poveznice prema `aktual.media`; dio izgleda generički ili demonstracijski. Razlike nisu dokaz da se dva toka sinkroniziraju ili imaju iste izvore i prava. Vanjski RSS se ne kopira, ne prikazuje kao urednički potvrđena vijest i ne ubacuje u vlastiti sitemap. Lokalna stranica `/gnk-aktual/media/hrvatska/` zasebno navodi izvore i poruku kada nema provjerenih svježih naslova. Provjera prikaza nije preglednik ni provjera sadržaja svih povezanih izvora.

## Daljnje mogućnosti

1. Za pojedinačne vijesti provjeriti uvjete izvora, vrijeme, stvarni izvorni URL i eventualnu uredničku obradu prije daljnje distribucije. Ne preuzimati RSS sažetke kao pune članke bez dopuštenja.
2. Pratiti Search Console, ali bez pristupa njegovim podacima ne tvrditi indeksiranje ni rangiranje. Sitemapi i canonical oznake olakšavaju otkrivanje, ne jamče ga.
3. Prikazati stanje izvora i vrijeme posljednje uspješne obnove na temelju stvarnog monitoringa; ne izmišljati svježinu ili neovisnu provjeru.
4. Istražiti razliku hrvatskog vanjskog HTML pregleda i RSS-a prije bilo kakve automatizirane integracije. Nepotvrđeni izvorni slugovi ostaju na sigurnom fallbacku.

Lokalni audit sitemapa gradskih izdanja na početnoj snimci pregledao je 17 izdanja i 38.335 URL-ova, uključujući 38.003 članka: nula prijavljenih kritičnih nedostataka datoteke, canonicala, noindex oznake ili registracije sitemapa. To nije potvrda indeksiranja ni dohvat svih javnih URL-ova.

Testovi: `node --test tests/test-aktual-feed-recovery-v1.mjs tests/test-aktual-croatia-connection-v1.mjs tests/test-central-description-v1.mjs` te postojeće provjere news huba, no-JS prikaza, imenika, podatkovnog deska i HR/EN početne stranice. Ove provjere ne predstavljaju dokaz javnog deploya, prikaza na svim uređajima ili promjene rezultata pretrage.
