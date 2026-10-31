# Tabla tvorničkih agenata (V1)

Grana: `arena/3c5bc634-gnk-asg-portal-archive-2026-07`. Generirano: 2026-10-31T16:20:54Z. Naredbe pokrenute: False.

Stanje: done 11, human 1, ready 1, waiting 3

| Agent | Naziv | Stanje | Provjera | Čeka |
|---|---|---|---|---|
| A00 | Orkestrator | ✅ done | scripts/factory/orchestrator_v1.py postoji |  |
| A01 | Registar država | ✅ done | config/world-countries-v1.json postoji |  |
| A02 | Izvori (K1) | 🔧 ready | W1: 0/7 država ispunjava uvjete (najmanje 1 odobrenih izvora) |  |
| A03 | Licence i prava (K2) | ⏳ waiting | provjera nije pokrenuta: čeka ovisnosti | A02 |
| A04 | Predložak kanala | ⏳ waiting | provjera nije pokrenuta: čeka ovisnosti | A02, A03 |
| A05 | Dizajn i funkcije | ✅ done | scripts/factory/audit_portal.py postoji |  |
| A06 | Meta, SEO i hashtagovi | ✅ done | pages_with_owner_hashtags=9021, indexable_pages=9021 |  |
| A07 | Kvaliteta slika | ✅ done | summary.flag_counts.necitljiva=5 (najviše 5) |  |
| A08 | Usklađenost AI (Članak 50) | ✅ done | scripts/check-ai-act-governance-v1.mjs postoji |  |
| A09 | Vidljivost i sitemap | ✅ done | scripts/factory/test_factory_v1.py postoji |  |
| A10 | Radio | ✅ done | stranica s radio blokom: 9481 (najmanje 9000) |  |
| A11 | Pipeline čuvar | ✅ done | uzorak nađen |  |
| A12 | Stanje grane i povijesti | 🧑 human | main i grana nemaju zajednički predak; spajanje nije moguće bez odluke vlasnika |  |
| A13 | Konzistentnost podataka | ⏳ waiting | provjera nije pokrenuta: čeka ovisnosti | A12 |
| A14 | Distribucija (nacrti) | ✅ done | apps/portal/data/radio-promo-kit.json postoji |  |
| A15 | Revizor odobrenja | ✅ done | config/approvals-ledger-v1.json postoji |  |

## Sljedeće radnje

- A02 Izvori (K1): odraditi (W1: 0/7 država ispunjava uvjete (najmanje 1 odobrenih izvora))
- A12 Stanje grane i povijesti: čeka vlasnika (main i grana nemaju zajednički predak; spajanje nije moguće bez odluke vlasnika)
