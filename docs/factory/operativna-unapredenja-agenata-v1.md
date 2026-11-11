# Operativna poboljšanja agenata i objave

Ovaj dokument razlikuje implementirano od prijedloga. Dijagnostički agenti i pomoćni urednički alati rade lokalno ili u postojećim read-only GitHub poslovima; ne dokazuju javnu objavu ni pregled sadržaja od strane osobe.

## Implementirano u ovom prolazu

1. **Zadaci iz dijagnostike:** iz 30 rezultata stvara se prioritetna lista s identifikatorima, razlogom, naredbom za ponovni pregled i obveznim ljudskim pregledom. Nedostajući rezultat nije uspjeh; nepoznat ili pogrešan SHA i nekonzistentni izvještaji zaustavljaju obradu. Nema automatskog popravljanja, deploya ni odobrenja.
2. **Urednički paket:** svaki tekući dnevni prolaz koristi izolirani red i prilaže nacrte, otiske i predložak kandidata. Prava, izvori, vizuali i ljudsko odobrenje nisu izmišljeni niti se strojna odluka pretvara u ljudsku. Paket je namijenjen uredniku, nije sadržaj spreman za javnu objavu.
3. **Zaštita pripreme statičkog pregleda:** neispravni identifikatori, vanjske poveznice kao interne, nevaljani izvori, nevaljani datumi i duplicirani ID-jevi blokiraju stavku. JSON-LD ne dopušta umetanje HTML skripte kroz sadržaj. Strojno pregledan tekst ne dobiva tvrdnju o pojedinačnoj ljudskoj uredničkoj provjeri. Testovi pokrivaju i pokušaj prolaska kroz putanju `podijeli/vijest`; ruta nije mijenjana.
4. **Sigurniji ručni odabir mrežnih agenata:** ulaz workflowa prenosi se kao podatak preko varijable okruženja, a ne ugrađuje kao naredba u shell.

## Predloženi sljedeći koraci — nisu automatski provedeni

- **P1: stvarni urednički pregled.** Dodati autenticirano sučelje i auditable evidenciju tko je pregledao koji otisak nacrta, izvore i prava, uz odvojenu odluku o objavi. Ne tretirati neprovjeren JSON kao dokaz identiteta osobe.
- **P1: pouzdan sat i status.** Uskladiti izvore vremena te tek nakon stvarnog mjerenja osvježiti statusni snimak; ne mijenjati datume samo da testovi prođu.
- **P1: ovlasti za produkciju.** Vlasnik GitHub integracije treba omogućiti odobreni exact-SHA deploy; poslije uspješnog izvođenja zasebno provjeriti javne URL-ove. Spajanje nije deploy.
- **P2: veza nalaza i izvedbe.** Za svaki dijagnostički zadatak prikazati zadnji SHA, ponovljeni test i pregledani diff. Automatizirano predlaganje popravaka držati odvojenim od izvršavanja, mergea i deploya.
- **P2: izvori i jezici.** Urediti izvornu evidenciju licenci i odobrenja te osigurati prijevode i lekturu prije širenja na nova tržišta; dostupnost RSS-a nije licenca.
- **P2: vanjska aplikacija.** Nakon utvrđivanja vlasništva i pristupa kôdu provjeriti robots, sitemap, kanonikale, demo sadržaj i prava prije bilo kakve produkcijske izmjene.
- **P3: javna transparentnost.** Prikazivati samo verificirani zadnji uspješni deploy i stanje stvarnih provjera, uz datum i ograničenja; ne prikazivati broj planiranih agenata kao broj ljudi ili neovisnih servisa.

Nijedan od ovih prijedloga ne predstavlja potvrdu da je bilo koji sadržaj objavljen ili da je projekt usklađen s propisima.
