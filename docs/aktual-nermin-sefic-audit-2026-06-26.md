# Aktual.rs / Nermin Sefić — migracijski audit

Datum provjere: 26. lipnja 2026.

## Obuhvat

- 17 autorskih kolumni evidentirano je u `apps/portal/objave/aktual/<slug>/index.html`.
- Svaki članak ima zasebnu kanonsku adresu na GNK ASG portalu.
- Izvorni datumi objave standardizirani su na 2. listopada 2024. za najstariji tekst i 3. listopada 2024. za preostalih 16 tekstova.
- Autor: Nermin Sefić.
- SEO entiteti: Nermin Sefić / Nermin Sefic, GNK ASG d.o.o., GNK DINAMO Ltd.
- Izvorna objava i fotografija kreditiraju Aktual.rs / Shutterstock prema izvornom zapisu.

## Tehničke promjene

- `apps/portal/data/aktual-nermin-sefic.json` — jedinstveni manifest članaka i slika.
- `apps/portal/assets/aktual-archive-v1.css` — izolirani prikaz samo za Aktual članke.
- `apps/portal/assets/aktual-archive-v1.js` — vidljivi datum, izvor, kredit slike i semantičko formatiranje.
- `workers/gnk-asg-direct-operator/src/index-admin-hub-v23-aktual.js` — Article, ImageObject i BreadcrumbList strukturirani podaci.
- `apps/portal/assets/visual-index-full-gallery.js` — uključivanje 17 fotografija i njihovih ImageObject metapodataka u centralnu galeriju.
- `workers/gnk-asg-direct-operator/wrangler.toml` — aktivacija V23 sloja.

## Sigurnosni opseg

Nisu mijenjani javni index, navigacija, sadržaj vijesti, administracija, Mail Studio ni Media Command. Promjene su ograničene na `/objave/aktual/`, `/visual-index/` i pripadajuće SEO podatke.
