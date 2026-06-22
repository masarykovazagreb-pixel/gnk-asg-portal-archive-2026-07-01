# GNK ASG portal — noćni audit frontenda i SEO-a

Datum: 22. lipnja 2026.
Radna grana: `work/20260622-overnight-seo-ui`
Backup grane: `backup/20260622-overnight-start`, `backup/20260622-before-seo-ui-2`
Produkcija: nije dirana.

## Sažetak prvog ciklusa

Prvi pregled aktivne baze `apps/portal` potvrdio je da HR i EN početna stranica dijele glavni frontend, ali nisu tehnički potpuno usklađene. Na obje stranice postoje višestruki naknadno umetnuti inline CSS i JavaScript slojevi za isti izbornik, AI gumb i uklanjanje starih dinamičnih elemenata. Zbog toga završni izgled ovisi o redoslijedu učitavanja i specifičnosti selektora, što povećava rizik od praznina, dvostrukih elemenata i različitog ponašanja na mobilnim uređajima.

## Potvrđeni problemi

1. EN početna stranica završava oznakom `SEO:END`, ali nema cjelovit generirani SEO blok kakav postoji na HR verziji.
2. Više zasebnih stilova mijenja `.gnk-asg-final-menu` iz svijetle u tamnu i ponovno u svijetlu verziju.
3. Postoje najmanje dva navigacijska sustava: fiksni gornji izbornik i globalni floating dock.
4. Postoje najmanje dva kandidata za javni AI gumb: poseban `#gnk-asg-ai-help-float` i ASG gumb u globalnom docku.
5. U dokumentu postoje prazni HTML čvorovi i zatvarajući elementi bez pripadajućeg sadržaja, što može stvarati vizualne rupe.
6. HR i EN navigacija nisu potpuno semantički usklađene. EN stavka Insights vodi na `/objave/`, iako projekt predviđa funkcionalnu rutu `/publications/` koja čita isti izvor sadržaja.
7. Velika količina inline zakrpa otežava održavanje, testiranje i rollback.

## Izvršena sigurna promjena

Ažuriran je zajednički sloj:

`apps/portal/assets/brand/gnk-asg-global-layer.css`

Promjena:

- konsolidira premium tamni izgled gornjeg izbornika;
- koristi selektore veće specifičnosti kako bi neutralizirala međusobno suprotne inline stilove;
- na desktopu zadržava gornji izbornik i samo jedan ASG/AI gumb;
- na mobilnom prikazu skriva gornji izbornik i koristi floating dock MENU/HOME/ASG;
- skriva dodatni `#gnk-asg-ai-help-float` i druge označene duplikate;
- uklanja prazne izravne čvorove u glavnom sadržaju;
- rasteže kartice unutar zajedničkih gridova radi smanjenja rupa između kartica;
- ne mijenja sadržaj, backend, podatke, e-mail potpis ni produkcijski deploy.

Commit: `5ec581c0ed9c14c7f408dac7f00718fa2761b16e`

## Sljedeći prioriteti

1. Dodati cjelovit SEO blok u EN `index.html`:
   - canonical;
   - hreflang HR/EN/x-default;
   - OpenGraph;
   - Twitter card;
   - Organization, WebSite i Person JSON-LD;
   - image metadata.
2. Uskladiti EN Insights rutu s `/publications/` uz zajednički izvor podataka i canonical politiku.
3. Napraviti automatski link checker za sve lokalne `href`, `src`, canonical i hreflang vrijednosti.
4. Izraditi registar slika s poljima `id`, `path`, `hash`, `alt`, `caption`, `credit`, `usedBy`, `firstUsedAt`, `lastUsedAt` i `usageCount`.
5. Dodati SEO quality gate za nove objave:
   - najmanje 500 riječi;
   - naslov, sažetak i puni tekst;
   - izvori;
   - slika koja nije već iskorištena;
   - alt, caption i credit;
   - canonical i Article schema;
   - HR/EN kontrola.
6. Konsolidirati inline stilove u zajedničke CSS module nakon vizualne usporedbe prije/poslije.
7. Napraviti Media Kit i PDF generator na memorandumu u odvojenom modulu bez utjecaja na homepage.

## Sigurnosna pravila

- Produkcija se ne mijenja bez zasebnog deploy koraka i provjere.
- E-mail potpis ostaje netaknut.
- Mass mail ostaje isključen dok se ne potvrdi PDF/MIME ispravnost i autorizacija.
- Secrets i operator tokeni ne pohranjuju se u GitHub.
- Svaka veća izmjena mora imati backup granu ili povratni commit.
