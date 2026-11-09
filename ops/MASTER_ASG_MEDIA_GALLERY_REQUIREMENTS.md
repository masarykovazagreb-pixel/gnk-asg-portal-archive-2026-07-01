# MASTER ASG — jedinstvena multimedija i galerija (18.10.2026.)

Status: zahtjevi vlasnika za PR-first implementaciju; **nije potvrda implementacije ni produkcijske objave**.

## Opseg
GNK ASG / AKTUAL / Media / Dnevnik / Tjednik / Komentari, HR i EN. Jedinstvena galerija za postojeće i buduće slike uz audit prava, kvalitete i porijekla; ne objavljivati automatski slike nepoznate licence. Ne stvarati drugi writer ili raspored.

## Sadržaj i prikaz
- Svaka nova objava treba kontekstualnu, kvalitetnu sliku samo uz dokumentirana prava; ako je nema, generirati originalnu sliku u postojećem dopuštenom procesu i čuvati dokaz podrijetla. Ne koristiti tuđe fotografije bez prava.
- Izraditi zasebnu HTML stranicu slike s opisom, atribucijom, dimenzijama, alt tekstom i povratnom poveznicom na tekst; povezati galeriju i članak dvosmjerno.
- Galerija uključuje postojeće slike tek nakon inventure, deduplikacije, provjere licence i kvalitete; podržati HR/EN, mobilni prikaz, pristupačnost i razumnu optimizaciju datoteka.
- Prezentacija i video samo kada stvarno postoje; VideoObject nikada za statičnu sliku ili praznu video stranicu.

## SEO i atribucija
- Jedinstveni title, description, canonical, robots, OG i Twitter Card za svaki indeksabilan HTML prikaz; ImageObject i BreadcrumbList kada su činjenično točni; sitemap samo za stvarne javne URL-ove.
- Autor Nermin Sefić i brend GNK ASG samo u ulogama dopuštenim approved_mentions; ne pripisivati autorstvo slika bez dokaza.
- #NerminSefić i #NerminSefic najviše jednom svaki; #GNKASG samo kada je relevantan. Ne stavljati autorsko ime u meta keywords/news_keywords kao spam.

## Release gate
PR-first, CI green, single canonical writer. Svaka javna objava zahtijeva exact-SHA deployment i HTTP 200 za pojedinačni URL, listing, AKTUAL i relevantni sitemap prije statusa published ili mirrora. Poštovati publication-holds, source-gated queue i zaštićena područja. Bez promjene Cloudflare/DNS, secrets, maila, plaćanja ili aktivnih pravnih predmeta. Nema bypassa niti automatskog otpuštanja budućih paketa.

## Kriteriji prihvata
1. Inventar starih slika s licencom i statusom.
2. HR/EN galerija s originalnim URL-ovima i provjerenim slikama.
3. Provjere pristupačnosti, SEO-a, mobilnog prikaza, duplikata i prava.
4. Produkcijski exact-SHA i javni HTTP 200 za galeriju i reprezentativne slike.
5. Evidencija blokada i read-only audit kada se release gate ne može zadovoljiti.
