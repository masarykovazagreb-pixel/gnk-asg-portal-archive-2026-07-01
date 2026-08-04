# PROJECT HEALTH — GNK ASG Portal
Ažurirano: 4. kolovoza 2026.

| Područje | Ocjena | Napomena |
|---|---|---|
| CI / Deploy | ★★★★☆ | Ručni gate (Deploy Admin Auth V6), potvrđen revision header svaki put; nema formalnih GitHub Checks |
| Portal (javne rute) | ★★★★★ | 503/503 sitemap URL-ova 200, 0 slomljenih hreflang parova, 0 slomljenih JSON-LD |
| SEO — tehnički | ★★★★☆ | Riješeno: /en/en/ bug, share-link redirect, 404 branding, security.txt, webp; otvoreno: 5xx i duplikat-kanonska iz GSC-a (URL-ovi nedostupni) |
| SEO — sadržajna dubina | ★★☆☆☆ | 69/309 tankih tekstova prošireno (22%), u tijeku |
| Slike / entitet | ★★★★☆ | 26 fotografija s XMP/EXIF, 7 slomljenih referenci popravljeno, FAQ+Book+Person shema na profilu |
| Workeri | ★★★☆☆ | Postoje i rade; nije proveden pun audit svih ugovora/health signala |
| Automatizacije | ★★★★☆ | Svedeno s ~213 na ~20 poziva/dan, spašeno u logičan redoslijed |
| Backlinkovi | ★★☆☆☆ | ict.hr dokumentiran; nema pravih vanjskih backlinkova izvan vlastite kontrole |
| Distribucija (Blogger/Aktual) | ★★★☆☆ | Radi; AKTUAL MEDIA EN verzija nedostaje 3-4 cjeline (poznat, neriješen gap) |
| Sigurnost | ★★★★☆ | Mail read-only poštovan, secrets nedirani, admin token popravak mergean (#820) |

**Ukupna procjena: ~72% zrelosti** prema izvornom P0-P4 planu.
