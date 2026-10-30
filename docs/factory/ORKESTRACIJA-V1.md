# Orkestracija tvorničkih agenata (V1, 30. 10. 2026.)

Cilj: jedan izvor istine o tome što je gotovo, što je spremno, što čeka koga.
Konfiguracija: `config/factory-agents-v1.json`. Ledger odobrenja: `config/approvals-ledger-v1.json`.
Izvori po državi: `config/world-sources-v1.json`. Tabla: `docs/factory/TABLA-V1.md` (generirano).

## Principi

1. Nema novog crona ni deploy bota (AGENTS.md, pravilo 6). Orkestrator se pokreće ručno.
2. Nema LLM-a u kapijama. Svaka kapija je datoteka, JSON vrijednost, uzorak u logu, status izvora,
   zapis u ledgeru, git predak ili brojanje.
3. Agent ne objavljuje i ne spaja. Spajanje PR-a samo uz izričit OK, zapisan u ledgeru.
4. Agent ne briše objavljeni sadržaj i ne slabi gate. Neprolazna provjera je zadatak s razlogom.
5. Javno ide samo ono što prođe K1 (izvori), K2 (licence), K3 (urednik), K4 (naziv), K5 (test-all), K6 (status live).

## Agenti

| ID | Naziv | Način | Ovisi o | Kapija |
|---|---|---|---|---|
| A00 | Orkestrator | skripta | — | skripta postoji |
| A01 | Registar država | skripta | — | registar postoji i validator prolazi |
| A02 | Izvori (K1) | hibrid | A01 | svaka W1 država ima odobreni izvor |
| A03 | Licence i prava (K2) | čovjek | A02 | pravna potvrda u ledgeru |
| A04 | Predložak kanala | skripta | A02, A03 | država live s odobrenim izvorom |
| A05 | Dizajn i funkcije | skripta | — | audit_portal.py |
| A06 | Meta, SEO i hashtagovi | skripta | — | sve indeksabilne stranice imaju owner hashtagove |
| A07 | Kvaliteta slika | skripta | — | nečitljive slike ≤ 5 |
| A08 | Usklađenost AI (Članak 50) | hibrid | — | provjera AI oznake postoji |
| A09 | Vidljivost i sitemap | skripta | A06 | gate tvornice postoji |
| A10 | Radio | hibrid | — | ≥ 9.000 stranica s radio blokom |
| A11 | Pipeline čuvar | skripta | — | zadnji test-all zapis 82/82 |
| A12 | Stanje grane i povijesti | skripta | — | grana ima zajednički predak s main-om |
| A13 | Konzistentnost podataka | skripta | A12 | region audit: 0 grešaka |
| A14 | Distribucija (nacrti) | hibrid | A10, A09 | nacrti postoje i stanu u limite |
| A15 | Revizor odobrenja | skripta | — | ledger postoji |

## Tijek

```
A01 -> A02 -> A03 -> A04 -> (K1+K2+K3+K4+K5+K6) -> javni kanal
A06 -> A09
A10 + A09 -> A14 (nacrti; ručna objava nakon odobrenja)
A12 -> A13 (podaci; rekonstrukcija zapisa, ne brisanje)
A05, A07, A08, A11, A15: neovisni, pokreću se kad god
```

## Pokretanje

```bash
python3 scripts/factory/orchestrator_v1.py --check   # konfiguracija (DAG, polja)
python3 scripts/factory/orchestrator_v1.py           # tabla bez pokretanja naredbi
python3 scripts/factory/orchestrator_v1.py --run     # uključuje naredbe (sporo)
python3 scripts/factory/radio_promo_kit_v1.py        # A14: nacrti
```

## Stanje (30. 10.)

- Gotovo: A00, A01, A05, A06, A07, A08, A09, A10, A11, A15 (10 kapija); A14 nacrti zapisani (dodatno).
- Spremno za rad: A02 (W1: 0/7 država s odobrenim izvorom; Austrija blokirana po uvjetima).
- Čeka vlasnika: A03 (pravna potvrda za W1), A12 (main nema zajednički predak s granom).
- Čeka ovisnosti: A04, A13.

## Što orkestrator ne radi

- Ne piše u javne stranice niti u podatke kanala.
- Ne odlučuje o pravnim pitanjima. Ta odluka ide u ledger.
- Ne zaobilazi kapije. Ako kapija padne, zadatak ostaje u tablici.
