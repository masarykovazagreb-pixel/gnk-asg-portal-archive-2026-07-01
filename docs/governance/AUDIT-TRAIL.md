# AUDIT TRAIL — promjene vlasništva nad ključnim dokumentima (2026-09-23)

Ovdje se bilježi KADA i ZAŠTO je neki "izvor istine" promijenio ime/mjesto,
da se ne traže tri vremenske linije istog backloga/manifesta.

| Stari | Novi | Datum | Razlog |
|---|---|---|---|
| `ops/MASTER_ASG_BACKLOG_2026-09-06.md` | `docs/arhiva/backlog-MASTER_ASG_2026-09-06.md` | 2026-09-23 | zamrznut; spojen u `ops/MASTER_ASG_BACKLOG.md` |
| `ops/MASTER_ASG_99_BACKLOG.md` | `docs/arhiva/backlog-MASTER_ASG_99_2026-09-06.md` | 2026-09-23 | isto |
| `docs/*` jednokratni markeri (61 fajla) | `docs/arhiva/jednokratni/` | 2026-09-23 | čišćenje korijena (bez gubitka) |
| — (novo) | `ops/CONTROL-PLANE.json` | 2026-09-23 | strojno-čitljiv single-writer manifest |
| `docs/ROADMAP-2026-09-23.md` (plan) | — | 2026-09-23 | plan + dijagnostika |

## Pravilo

Kad se neki dokument više ne može samo čitati "kao jest", ne briše se —
preimenuje se u `docs/arhiva/` i upisuje ovdje. Nitko ne smije ponovno otvoriti
zamrznuti backlog kao aktivni izvor.
