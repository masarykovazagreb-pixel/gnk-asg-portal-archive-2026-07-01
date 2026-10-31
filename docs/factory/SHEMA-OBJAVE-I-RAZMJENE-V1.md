# Tvornica: shema objave i razmjene V1

## Što korisnik želi

Korisnik odabire **HR** ili **cijeli svijet** za vlastitu objavu. Prazno izdanje
može ponuditi svježu poveznicu na izvorni članak drugog izdanja, primjerice
Hrvatska → Italija. Prvo lokalne vijesti; tek ako su prestare ili nedostaju,
predložiti druge. Cilj je mreža GNK ASG-a i AKTUAL MEDIA-e s vidljivim izvorom,
datumom i stvarnim autorstvom, a ne lažno pripisivanje članka Nerminu Sefiću.

## Tok

```text
vlastiti članak / feed izdanja
          ↓
provjera adrese, datuma i statusa izdanja
          ↓
plan područja: HR | svijet            lokalni feed svjež?
          ↓                            ↓ da: lokalni pregled
kandidati i blokirana odredišta       ↓ ne: prijedlog drugih aktivnih izdanja
          ↓                            ↓
provjera izvora, prava, AI oznake, urednika i approved_urls gdje je primjenjivo
          ↓
odobrenje stvarnog sadržaja i odredišta → postojeći release / deploy postupak
          ↓
potvrda stvarne objave i povratna veza na kanonski članak
```

Svjetski opseg trenutačno uključuje sve države iz registra, ali **samo aktivna
izdanja** dobivaju status kandidata. Ostala su nedostupna, ne izmišljaju se
adrese ni Cloudflare projekti. Kandidat nije dozvola, nije obećanje deploya i
nije dokaz da stranica postoji ili da ima urednika. Plan ne objavljuje ništa,
ne šalje mrežne zahtjeve, ne mijenja registre, ne piše vijesti i ne prevodi.

## Prototip naredbi — samo planiranje

```sh
node scripts/factory/publication-plan-v1.mjs objavi hr --url https://gnk-asg.hr/objave/primjer/
node scripts/factory/publication-plan-v1.mjs objavi cijeli svijet --url https://gnk-asg.hr/objave/primjer/
node scripts/factory/publication-plan-v1.mjs razmjena --kanal zagreb
```

Prve dvije naredbe vraćaju `plan_only_not_published`. URL je primjer, ne dokaz
da članak postoji. Kandidati se nude samo ako je točna adresa označena `published`
u snimku `apps/portal/data/editorial-registry.json`; nedostajući ili neobjavljeni
zapisi ostaju na čekanju, a nedostupan registar zaustavlja plan. Taj registar ne
pokriva nužno sve regionalne feedove, pa izostanak nije dokaz da članak ne postoji. Razmjena čita lokalne feedove aktivnih kanala, bez mrežnih
poziva. Ako je lokalna vijest svježa unutar 48 sati, daje `local_fresh`; inače
predlaže najnoviju svježu objavu svakog drugog aktivnog kanala s izvornom
poveznicom i datumom. Budući datumi, zastarjele i neodgovarajuće adrese se
odbacuju. `candidates_require_review` nije objava. Ako nema kandidata, prikazuje
`no_fresh_candidates`; ne smije se izmišljati vijest.

## Preostalo prije stvarne objave

- Provjera postojanja i prava svakog izvora i vizuala, ne samo dostupnosti feeda.
- Potvrda uredničkog pregleda i stvarnog autorstva; `approved_mentions.json`
  ostaje obavezan gdje su spominjanja zaštićena tim pravilom.
- Nema automatskog pripisivanja autorstva Nerminu Sefiću; ime u uredničkom
  identitetu samo prema postojećem standardu, bez stvaranja lažnog potpisa.
- Novi projekti i ciljane domene moraju postojati i proći postojeće kapije.
- Vanjske objave, prijevodi i potpune kopije nisu obuhvaćeni ovim prototipom.
- Bez novog crona ili deploy bota; postojeći single-writer i exact-SHA fence.
- Ako se kasnije uvede AI pisanje, primijeniti `AGENTS.md`, AI oznaku i stvarnu
  ljudsku uredničku odgovornost. Ovdje nema modela ni AI generiranja teksta.

## Vidljivi obrazac

Na `/agenti/#tvornica` nalazi se obrazac **Plan objave: Hrvatska ili svijet**.
U pregledniku koristi istu čistu logiku kao naredbeni alat i lokalni snimak
registra država i dohvaća urednički registar s iste domene. Prikazuje plan po
državi, ne šalje URL na poslužitelj i ne objavljuje.
Ako JavaScript nije dostupan, korisniku se prikazuje objašnjenje. Urednički registar je snimak i rezultat ne provjerava javnu dostupnost uživo niti
predstavlja odobrenje sadržaja.
Stvarno pisanje, odobrenje i objava ostaju zasebni koraci koji ovdje nisu
implementirani; javne i besplatne Cloudflare projekte treba zasebno stvoriti i
provjeriti prije nego se smatraju postojećima.
