# Digital Workforce — pristupačnost navigacije

Na 109 postojećih HR i EN stranica (podstranice i članci newsrooma) dodan je lokaliziran preskok na postojeći `<main>`, s fokusabilnim ciljem. Zajednički CSS bio je već prisutan; ostali bajtovi ovih stranica ostali su nepromijenjeni prema usporedbi s početnom verzijom. Dvije naslovne stranice prethodno su imale vlastiti preskok i ostale su netaknute. `podijeli/vijest` i zamrznuti 504M članak nisu dio zahvata. Ilustrativna priroda sadržaja nije promijenjena.

Predložak generatora newsrooma ažuriran je za nove HR/EN stranice; njegova se funkcija renderiranja testira izolirano, bez pokretanja generatora nad izvornim stablom. Generator i prije ovog zahvata može prepisati postojeće stranice kad se naslov promijeni, pa se ne tvrdi da pri takvom prepisivanju čuva sve naknadne slojeve. Test pristupačnosti obuhvaća postojeće rute, generator i oznaku simulacije, te je uključen u `scripts/test-all-v1.mjs`.

Lokalno prolaze 13 ciljanih testova uredničkih, galerijskih, WORLD i Workforce stranica, provjere design sustava i preskoka te `scripts/test-digital-workforce-production-integration-20260725.mjs`. Zasebni `scripts/test-digital-workforce-suite-v1.mjs` pada već na očekivanju verzije V2, dok je trenutačna verzija sustava V7; taj test nije mijenjan, niti su provjereni njegovi daljnji zahtjevi. Poznat je i neuspjeli SEO ugovor hrvatske zbirke komentara opisan u `autorske-objave-pristupacnost-v1.md`.

Statički audit na ovoj snimci nalazi 1.036 kandidata bez prepoznatog preskoka među 23.959 ostalih portalnih ruta, 49 bez main i 12 bez h1. Ovi brojevi su heuristički, uključuju rute izvan opsega i nisu vizualni ni sveobuhvatni WCAG audit. Ne dokazuju produkcijski deploy.
