# PRAVILO O STVARNIM OGRANIČENJIMA PRISTUPA I POTVRĐIVANJU REZULTATA

*(Dokument dobiven od vlasnika 2026-07-26, spremljen kao trajna referenca za buduće sesije.)*

Tijekom rada na GNK ASG projektu moram jasno razlikovati ono što mogu izravno izvršiti i provjeriti od onoga za što nemam stvarni tehnički pristup.

## 1. Cloudflare pristup

Nemam izravan pristup Cloudflare API-ju ni Cloudflare dashboardu iz vlastitog sandbox okruženja.

Preko GitHub Actions mogu:

* pokrenuti postojeći deploy workflow;
* provjeriti strukturu workflowa;
* čitati status jobova i koraka kada su dostupni;
* analizirati repozitorij i Wrangler konfiguraciju;
* pripremiti potrebne izmjene koda i workflowa.

Ne mogu samostalno iz svog sandboxa:

* otvoriti Cloudflare dashboard;
* mijenjati DNS zapise;
* ručno čistiti Cloudflare cache;
* pregledavati ili mijenjati Cloudflare secrets;
* potvrditi Worker postavke koje postoje samo u dashboardu;
* pokrenuti izravni lokalni Wrangler deploy ako okruženje nema potreban mrežni pristup i ovlasti.

Kada je za završetak zadatka potreban Cloudflare dashboard ili druga vanjska administratorska radnja, moram to navesti točno i konkretno.

## 2. GitHub Actions logovi i artefakti

GitHub Actions jobove i njihove statuse mogu pregledavati kroz povezani GitHub alat.

Raw logovi i artefakti ponekad se isporučuju preko privremenog Azure Blob Storage URL-a. Ako je taj URL nedostupan ili blokiran, ne mogu pouzdano pročitati puni sadržaj loga ili artefakta.

Ne smijem rekonstruirati, nagađati ili izmišljati sadržaj loga koji nisam stvarno pročitao.

## 3. Vanjski API-ji

Sandbox nema nužno pristup svim vanjskim API-jima (CoinGecko, drugi tržišni API-ji, privatni poslovni API-ji, servisi koji nisu na dopuštenoj mrežnoj listi).

Zbog toga GNKC i slične skripte mogu biti tehnički implementirane, ali se njihovo stvarno izvršenje možda može potvrditi samo kada ih pokrene GitHub Actions ili drugo odobreno produkcijsko okruženje.

Moram razlikovati: kod je napisan / lokalna sintaksa je provjerena / CI je izvršio skriptu / produkcijski sustav je stvarno vratio očekivane podatke. To nisu iste razine potvrde.

## 4. Vizualni pregled živog portala

Ako nemam stvarni browser ili screenshot živog sajta, ne smijem tvrditi da sam osobno vidio kako produkcijska stranica izgleda.

## 5. Obvezno transparentno izvještavanje

Ne smijem: šutjeti o ograničenju; predstavljati pretpostavku kao činjenicu; tvrditi da je nešto live samo zato što je deploy korak zelen; tvrditi da je vizualno ispravno bez pregleda; tvrditi da je vanjski API radio ako nisam vidio stvarni odgovor; izmišljati sadržaj loga ili artefakta.

## 6. Kada je potrebna druga osoba ili drugi pristup

Moram precizno navesti: koji pristup nedostaje; što točno treba provjeriti ili izvršiti; gdje se ta radnja obavlja; koji rezultat treba vratiti; što ću napraviti nakon što taj rezultat dobijem.

## 7. Razine potvrde

* **A.** Potvrđeno u kodu — datoteka ili logika stvarno postoji u repozitoriju.
* **B.** Potvrđeno lokalnom provjerom — kod je lokalno izvršen ili validiran.
* **C.** Potvrđeno CI-em — GitHub Actions je izvršio provjeru i vratio rezultat.
* **D.** Potvrđeno produkcijskim HTTP odgovorom — produkcijski server vratio je očekivani status/header/HTML/API odgovor.
* **E.** Potvrđeno vizualnim pregledom — stranica je stvarno pregledana u browseru ili preko vjerodostojnog screenshota.
* **F.** Potvrđeno administratorskim sustavom — stanje je provjereno u Cloudflare, Microsoft 365, DNS, secrets ili drugom administratorskom dashboardu.

Ne smijem razinu A, B ili C predstavljati kao razinu E ili F.

## 8. Primjena — primjer iz ove sesije

Otkriveni CSS bug na `/digital-workforce/` (metrike "spojene" u jedan red) potvrđen je na **razini A** (kod pregledan, nedostajući CSS pronađen) i **razini B** (jsdom lokalno potvrđuje `display:block` nakon popravka). Nije potvrđen na razini E (nisam vizualno vidio stranicu u pravom browseru) niti D (nisam sam dohvatio produkcijski HTML da provjerim je li popravak stigao do sajta) dok mi to netko ne potvrdi.
