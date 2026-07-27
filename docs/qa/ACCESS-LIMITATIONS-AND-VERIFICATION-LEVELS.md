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

**Nastavak (isti dan):** vlasnik je poslao stvaran screenshot (razina E) koji je pokazivao da popravak NIJE vidljiv — identično stanje kao prije. CI je potvrđivao uspjeh (razina C), kod je bio ispravan i na `main`-u (razina A), ali vizualni rezultat se nije poklapao. Nakon Cloudflare cache purgea, vlasnik je potvrdio da je popravak stvarno vidljiv (razina E, ovaj put pozitivna).

**Zaključak za buduće sesije:** za CORE TEMPLATE fajlove (npr. `index.html`, ne editorial sadržaj), uspješan deploy (razina C) **ne jamči** da će promjena biti odmah vidljiva (razina E) — Cloudflare edge cache može servirati stariju verziju unatoč `cache-control: no-store` headeru na origin odgovoru. Ako vlasnik prijavi da promjena "nije vidljiva" unatoč potvrđenom uspješnom deployu, **prvo pitati je li rađen cache purge**, prije daljnje dijagnoze koda — ovo se u ovoj sesiji dogodilo dvaput (editorial-order skripta, pa Digital Workforce metrike CSS) sa istim uzrokom i istim rješenjem.

## 9. ZAŠTIĆEN SUSTAV — mail (27.7.2026.)

Cijeli mail sustav (slanje, praćenje isporuke/otvaranja, Sent/Inbox evidencija, AI auto-odgovori) je **27.7.2026. temeljito istražen, popravljen, i testiran** kroz nekoliko iteracija tijekom jedne sesije, nakon što je otkriveno **pet preklapajućih, međusobno ovisnih podsustava** (vidi puni opis u `docs/qa/HANDOFF-2026-07-26-27.md`, sekcija "RIJEŠENO 27.7.2026."):

1. `outbound-mail-transport-v1.js` — `sendBrandedEmail()`, per-recipient tracking pixel
2. `email-status-tracking-v1.js`/`-v6.js` — praćenje isporuke/otvaranja (D1: `email_status_records`)
3. `mail-sync-center-v1.js` — INBOUND/OUTBOUND evidencija (D1: `mail_sync_messages`) — **ali ovaj sloj se u praksi NE ČITA za stvarni prikaz** (presreće ga stariji adapter, vidi #4)
4. `mail-studio-adapter-v1.js` — presreće SVE `/api/mail-sync/*` pozive prije nego stignu do #3
5. `manual-mail-service-v1.js` — **stvarni, autoritativni izvor** Sent popisa (D1: `manual_mail_messages`)
6. `gnk-asg-mail-center-worker/src/index.js` — zaseban Cloudflare Worker, prima stvarnu poštu, dijeli D1 bazu (`gnk_asg_operator_logs`) s `gnk-asg-direct-operator`

**Prije bilo kakve izmjene bilo kojeg od gornjih fajlova:**
- Pročitati punu povijest istrage u `docs/qa/HANDOFF-2026-07-26-27.md` prije pretpostavljanja da je nešto "jednostavan popravak" — arhitektura je namjerno, ne slučajno, slojevita, i naizgled logičan popravak na JEDNOM sloju lako promaši STVARNI, autoritativni izvor podataka na DRUGOM sloju.
- Svaka izmjena MORA biti testirana s mockiranim D1 + EMAIL bindingom (obrazac testova iz te sesije, uklj. `cloudflare:email` ESM loader mock) prije deploya, ne samo `node --check` sintaksa.
- Ne pretpostavljati da su tracking/sync/manual slojevi međusobno zamjenjivi — potvrđeno testovima da SVA TRI moraju biti ažurirana zasebno da bi cijeli lanac (praćenje + Sent popis + evidencija) radio ispravno.
- Vlasnikova eksplicitna uputa 27.7.2026.: "mailove stavi u neku kutiju, da se ne mogu slučajno više pomiješati" — ovaj odjeljak JEST ta "kutija". Bilo koja buduća sesija (ili druga Claude instanca koja radi paralelno na istom repozitoriju) treba pročitati ovo PRIJE diranja mail koda.
