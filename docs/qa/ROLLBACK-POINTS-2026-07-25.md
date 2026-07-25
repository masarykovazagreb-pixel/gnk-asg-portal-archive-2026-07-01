# TOČKE POVRATKA I IZOLACIJA — PR #762 rad (2026-07-25)

## 1. IZOLACIJA OD POSTOJEĆIH FUNKCIONALNOSTI — POTVRĐENO

Sav rad na Digital Workforce integraciji (gate, alias-fix, diagnostic
eksperiment, handback dokument) živi **isključivo** na grani
`release/digital-workforce-production-integration-20260725`
(PR #762), koja **nikad nije mergean** u `main`.

Provjereno upravo sada, izravnom pretragom `main` povijesti:
```
git log --oneline main | grep -E "b1426b0|65349a3|f3b3433|818a41a"
→ nema rezultata
```

Nijedan od tih commitova (preview gate, alias byte-copy fix, cleanup
revert, handback dokument) **ne postoji na `main`-u**. Sve postojeće
funkcionalnosti sajta (objave, komentari, galerija, sitemap, itd.)
potpuno su nepromijenjene tim radom.

**Jedina iznimka:** PR #764 (`language-routing.js` relativna-putanja
popravka) je mergean u `main`, jer je to bio stvaran, potvrđen
produkcijski bug (redirect je "bježao" na produkciju čak i za prave
posjetitelje na sporim/edge slučajevima), ne dio Digital Workforce
integracije. Taj popravak je zaseban, testiran (jsdom, 2 scenarija),
i verificiran audit skriptama prije merga.

---

## 2. TOČKE POVRATKA (ROLLBACK SHA)

### 2.1. Konzervativna točka — prije bilo kakve izmjene danas vezane uz PR #762/#764

```
SHA: 6b3340f966e386a52192d18d93ef834340c5588b
Poruka: "Refresh index market and business news data [skip ci]"
```

Ovo je stanje `main`-a **neposredno prije** PR #764 merge-a. Vraćanje
na ovu točku (`git revert` ili `git reset --hard` uz force-push, ovisno
o politici repozitorija) poništava i redirect-fix i sve što je poslije
toga automatski osvježeno (news/market podaci), ali NE dira ništa iz
PR #762 jer to nikad nije bilo na `main`-u.

### 2.2. Trenutna, preporučena sigurna točka — main HEAD upravo sada

```
SHA: 37c2a1a8162c370495cf95012ff0ac249d739605
Poruka: "Refresh index market and business news data [skip ci]"
```

Ovo je aktualni `main` HEAD, **uključuje** PR #764 popravak,
**isključuje** sav Digital Workforce integracijski rad. Upravo
provjereno:

```
node scripts/audit-public-portal-v1.mjs   → errors: 0, warnings: 0
node scripts/audit-seo-entity-integrity-v1.mjs → ok: true, failures: []
```

**Preporuka:** ovo je točka na koju se vraćati ako nešto vezano uz
Digital Workforce (PR #762, kad se jednom mergea) izazove problem —
`git revert <merge-commit-SHA-od-PR762>` vraća na ekvivalentno stanje
ovoj točki, bez gubitka ičega drugog što je mergeano do tog trenutka.

### 2.3. Grana PR #762 sama za sebe

```
Grana: release/digital-workforce-production-integration-20260725
HEAD: 818a41ab... (docs: handback dokument)
```

Ako se PR #762 ikad mergea, i onda treba potpuno povući natrag, dovoljno
je `git revert` samog merge commita — sve ostalo (main-linija razvoja)
ostaje netaknuto jer PR #762 dosad nije diralo ništa izvan svoje grane
i vlastitih 20 fajlova.

---

## 3. ŠTO JE ZAISTA "SIGURNO" U OVOM TRENUTKU

| Stanje | Status |
|---|---|
| `main` HEAD (2.2) | ✅ Zeleno, testirano, produkcijski siguran rollback target |
| PR #762 grana | ⚠️ Otvorena, CI i dalje crven (treći neizoliran uzrok), NE mergeati dok nije zeleno |
| Postojeće funkcionalnosti (objave, sitemap, galerija...) | ✅ Netaknute cijeli ovaj nastavak rada |
| Backend/write integracija za Digital Workforce | ⛔ Nije ni započeta — nema što ni vraćati |

**Zaključak:** trenutni `main` je siguran, verificiran, izoliran od
nedovršenog PR #762 rada. Ako bilo što krene po zlu na PR #762 grani
ubuduće, `main` ostaje netaknut sve dok se taj PR eksplicitno ne
mergea — što se prema uputama ne smije dogoditi dok `Public Portal
Audit` nije potpuno zelen.
