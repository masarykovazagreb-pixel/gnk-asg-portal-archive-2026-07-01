# Kolumne: pristupačnost, meta opisi i sitemap

Na 55 HR/EN stranica kolumni s postojećim prepoznatim `<main>` dodani su lokalizirani preskok i fokusabilni cilj. Usporedba s bazom `4e86d249c2ba849a022221e99e8bf1a0c96bdc7b` potvrdila je da su svi ostali bajtovi ostali jednaki. Alat `node scripts/apply-column-skip-scoped-v1.mjs` je po zadanim postavkama read-only; `--apply` je izričit. Drugi prolaz nalazi 55 već obrađenih, dvije zaštićene i osam nepodržanih stranica. Drukčije predloške, rute zaštićene pravilom o bankama/SPT-u, članak 504M i `podijeli/vijest` nije mijenjao.

Izolirani test potvrđuje da postojeći generator indeksa kolumni čuva oba preskoka pri ažuriranju popisa. Stariji generatori pojedinačnih kolumni koriste drugi predložak i mogu prepisati stranicu, stoga ovaj zahvat ne jamči očuvanje pri njihovom pokretanju. Ne pokretati ih nad izvornim stablom bez zasebne provjere slojeva.

## Lokalni pregled meta opisa

Orijentacijski pregled 24.806 HTML stranica nakon isključenja nekih administrativnih i pomoćnih ruta, stranica s meta noindex i meta-refreshom: 24.750 opisa duljine 70–165 znakova, 42 kraća i 12 duljih; dvije datoteke bez opisa su Googleove verifikacijske datoteke `google3f31d1251c985c15.html` i `google46686328e30c759f.html`, a ne obične stranice. Pronađeno je 290 skupina jednakih opisa na ukupno 631 stranici. Prag je samo praktičan indikator, a podudaranje može biti opravdano kod aliasa ili galerije; znakovi nisu jamstvo načina prikaza u tražilici. Bez zasebne provjere sadržaja nije mijenjan nijedan meta redak, niti je zaključeno da će se promijeniti rangiranje.

Primjeri jednakih opisa nalaze se u parovima `galerija/digitalna-imovina--pregled-2-teal-stability-26/` i `galerija/digitalna-imovina-gold-navy-11/`, te `galerija/gnk-asg-globalna-mreza/` i `visual-index/gnk-asg-globalna-mreza/`. To su kandidati za provjeru, ne nužno pogreške.

## Sitemap i ograničenja

Postojeći read-only audit pregledao je 25.774 HTML datoteke i 35 lokalnih XML sitemap datoteka te prijavio 207 mogućih nedostataka poveznica, šest nedostajućih opisa i druge signale. Skupovi i isključenja dvaju pregleda razlikuju se; šest nalaza uključuje pomoćne asset i Google verifikacijske datoteke. U `seo-sitemap-kandidati-v1.md` navedeni su kandidati i jednostavna trijaža: 156 zahtijeva ručni pregled, 47 je samostalnih HTML datoteka, tri su operativne ili izvan javnog opsega, a jedan je zaštićeni sadržaj. Pojava kanonskog URL-a ne znači automatski da ga treba uključiti u sitemap; postojeći audit uključuje i slikovne sitemapove i ne dokazuje cijeli lanac otkrivanja. Sitemapi nisu mijenjani, nisu provjereni HTTP zaglavlja i stvarno indeksiranje.

Statički pregled dizajna: u skupini 25.528 ostalih portalnih ruta osam je kandidata za meta-refresh, 981 bez prepoznatog preskoka, 49 bez main i 12 bez h1. Brojevi su heuristički i uključuju zaštićene ili nejavne rute. Ciljani testovi, test životnog ciklusa kolumni u izolaciji, design sustav, preskok i autorski SEO prolaze. Vizualni pregled u pregledniku, cjelovit WCAG audit i produkcijski deploy nisu dokazani.
