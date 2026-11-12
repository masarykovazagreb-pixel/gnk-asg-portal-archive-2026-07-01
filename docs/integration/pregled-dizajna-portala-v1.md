# Pregled dizajna i pristupačnosti — izvorni portal

## Opseg i ograničenja

`node scripts/audit-portal-design-basics-v1.mjs` pregledava lokalne HTML datoteke portala bez izmjena. Traži osnovne oznake viewporta, glavnog sadržaja, naslova i moguću vezu za preskok. To su jednostavne tekstualne heuristike: mogu imati lažno pozitivne ili negativne nalaze, ne izvode JavaScript, ne prikazuju stranice u pregledniku i nisu WCAG audit. Uključuju i nejavne, pomoćne ili noindex datoteke; ne dokazuju da su te datoteke javno objavljene. Preusmjeravanja označena meta refreshom broje se zasebno.

Na obrađenoj lokalnoj snimci: 22.481 HTML datoteka, uključujući 212 WORLD datoteka, 24 administrativne/alatske, 6 u assets/data i jedan preview. U 22.238 ostalih datoteka portalnih ruta postoji 8 meta-refresh preusmjeravanja. Za preostale datoteke te skupine heuristika je našla 49 bez `<main>`, 12 bez `<h1>` i 2.010 bez prepoznate veze za preskok. To su kandidati za pojedinačnu provjeru, ne potvrđene greške. Preostale skupine imaju dodatne kandidate u izvještaju. Nekoliko posebnih stranica, uključujući zamrznute članke i stranice dijeljenja, ne treba masovno prepisivati.

Nijedna datoteka u obrađenom opsegu ne nedostaje prepoznati viewport. Za 212 WORLD datoteka (imenik, 201 zemlja/područje i 10 gradova) nakon izmjena nisu pronađeni nedostajući viewport, `<main>`, `<h1>` ili prepoznata veza za preskok. Konkretno, na 211 stranica izdanja dodani su preskok, glavni orijentir, oznaka fokusa i prelamanje dugog sadržaja, a postojeća tamna oznaka hashtaga posvijetljena je zajedničkim stilom. Generiranje novih WORLD stranica prati isti ugovor; obnova postojećih stranica zadržava njihove druge slojeve.

Dodatne lokalne provjere: `tests/test-design-system-v1.mjs`, `tests/test-a11y-skip-v1.mjs`, `tests/test-image-alt-v1.mjs`, `scripts/test-aktual-world-directory-v1.mjs`, te `node --test tests/test-world-a11y-v1.mjs tests/test-portal-design-audit-v1.mjs tests/test-world-preservation-v1.mjs`. Ugrađena provjera slika ispituje atribute i postojanje datoteke, ne provjerava vizualni sadržaj niti prava. Izvršeni testovi ne potvrđuju izgled svih stranica u svim rezolucijama, čitljivost svih elemenata, rad preglednika ni javni deploy.

## Sljedeće provjere

- Pojedinačno pregledati preostale kandidate, razlikovati stvarne stranice od preusmjeravanja, widgeta, administracije i predložaka.
- Renderirati reprezentativne predloške, uključujući različite uređaje, širine, jezike, stanje tipkovničkog fokusa, duge naslove i učitane/neučitane slike; zatim sustavno pokriti ostale stranice.
- Izmjene objaviti postojećim exact-SHA procesom i potvrditi na javnim URL-ovima; lokalna datoteka ili spajanje u main nisu dokaz deploya.
