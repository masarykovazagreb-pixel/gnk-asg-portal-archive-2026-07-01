# SEO Knowledge Graph V1 — foundation

Datum: 1. kolovoza 2026.

## Opseg ove faze

- uvodi se strojno čitljiva mapa pillar tema i povezanih zbirki;
- uvodi se progresivni browser sloj za BreadcrumbList i Related Content;
- uvodi se validator konfiguracije i editorial registryja;
- uvodi se inventory/apply alat za kontrolirano dodavanje asseta na uredničke stranice;
- uvodi se read-only CI ugovor na Node 24.

## Sigurnosna granica

Ova faza ne mijenja postojeće uredničke HTML stranice i ne aktivira novi browser sloj u produkciji.
Masovno umetanje asseta ide tek u zasebnom PR-u nakon pregleda inventory izvještaja.

Nisu mijenjani:

- mail slanje, tracking, automatski odgovor, MIME, potpisi i Mail Studio;
- Cloudflare, DNS, routes, bindings i secrets;
- market, macro, GNKC i digital-asset Workeri;
- Blogger, Dev.to i Tumblr produkcijski rasporedi;
- canonical i hreflang postojećih stranica.
