# Galerija i vizualni indeks — pristupačnost

## Provedeno

Na 160 HTML stranica u `/galerija/` i 244 u hrvatskom i engleskom `/visual-index/` dodane su prva poveznica za preskok navigacije i jednoznačna meta na postojećem `<main>` elementu. Poveznica je na jeziku dokumenta i koristi postojeći vanjski dizajnerski list. Sadržaj, slike, metapodaci, podnožja, atribucije i drugi postojeći slojevi nisu namjerno regenerirani. Dva generatora galerije proizvode istu dostupnu strukturu za nove stranice. Generatori su provjereni u izoliranom direktoriju, ne pokrenuti nad javnim izvornim stablom.

`node --test tests/test-gallery-a11y-v1.mjs` provjerava 404 postojeće datoteke i izlaz obaju generatora, uključujući hrvatski i engleski. `node tests/test-design-system-v1.mjs` i `node tests/test-a11y-skip-v1.mjs` dodatne su provjere postojećih ugovora. One ne dokazuju vizualni prikaz, pristupačnost svim korisnicima ili funkcioniranje produkcijskog deploya.

## Opseg ostatka

Na trenutačnoj lokalnoj snimci `node scripts/audit-portal-design-basics-v1.mjs` našao je 23.692 HTML datoteke u svim svojim skupinama. Za 23.449 datoteka u skupini ostalih portalnih ruta (uključujući 8 meta-refresh preusmjeravanja) heuristika nakon ovih izmjena javlja 1.606 kandidata bez prepoznate veze za preskok, 49 bez `<main>` i 12 bez `<h1>`. Broj datoteka promijenio se u odnosu na raniji pregled zbog novije snimke portala. Nalazi su kandidati, a ne potvrđene greške i ne obuhvaćaju dodatne grupe poput administracije i previewa.

Od kandidata u ovoj snimci 768 je pod `/podijeli/`, uključujući zabranjeni `podijeli/vijest`; te stranice nisu mijenjane. Preostali kandidati uključuju članke, komentare, automatizirane sadržaje i posebne stranice koje zahtijevaju pregled predloška, jezika, stvarne mete i vlasnika generatora prije izmjena. Nisu sve stranice ručno pregledane niti renderirane u pregledniku. Javna objava zahtijeva zasebnu potvrdu exact-SHA deploya i pregled javnih URL-ova.
