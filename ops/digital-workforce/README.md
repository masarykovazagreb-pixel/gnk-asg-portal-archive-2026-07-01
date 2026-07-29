# GNK ASG Digital Workforce Orchestration

Ovaj modul uvodi operativni sloj iznad postojećih workera.

## Što radi

- vodi jedinstveni registar digitalnih radnika i njihovih sposobnosti;
- održava red zadataka s prioritetima, ovisnostima i kontrolorom;
- dodjeljuje zadatak radniku koji ima odgovarajuću sposobnost i slobodan kapacitet;
- označava zadatak blokiranim kada ovisnosti nisu završene ili nema raspoloživog radnika;
- generira dnevni operativni izvještaj i strojno čitljivo stanje;
- izvršava se ručno ili svaka četiri sata.

## Statusi zadataka

`queued`, `assigned`, `in_progress`, `verification`, `completed`, `blocked`, `cancelled`.

## Pravila upravljanja

Svaki zadatak ima vlasnika, kontrolora, prioritet, dokaz izvršenja, ograničenje pokušaja i ovisnosti. Kontrolor je odvojen od izvršitelja kada se rezultat mora neovisno potvrditi.

## Sigurnost

Koordinator samostalno ne:

- šalje mail ili masovne obavijesti;
- objavljuje javni sadržaj;
- radi produkcijski deploy;
- mijenja DNS, bindinge, tokene ili secrete;
- izvršava plaćanja, ugovorne ili druge pravno obvezujuće radnje.

Takvi zadaci zahtijevaju posebno odobrenje i zaseban izvršni kanal. Orkestrator ih može evidentirati i dodijeliti, ali ih ne smije sam izvršiti.

## Datoteke

- `worker-registry.json` — radnici, uloge, sposobnosti i kapaciteti;
- `task-queue.json` — operativni red zadataka;
- `orchestrator-state.json` — rezultat zadnjeg ciklusa;
- `daily-report.md` — izvještaj Upravi;
- `scripts/digital-workforce-orchestrator.py` — deterministička dodjela zadataka;
- `.github/workflows/digital-workforce-orchestrator.yml` — raspored izvršavanja.
