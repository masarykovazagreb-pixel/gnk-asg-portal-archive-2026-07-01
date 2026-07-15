# Matrica konsolidacije otvorenih PR-ova

Datum: 15. srpnja 2026.

Ova matrica ne zatvara, ne spaja i ne mijenja nijedan postojeći PR. Služi kao kontrolni popis prije ručnog cleanup koraka.

## A — aktualni kandidat

| PR | Status | Postupanje |
|---|---|---|
| #467 | Aktualni V38 funkcionalni kandidat za same-origin tržišne podatke | Zadržati otvorenim; zasebno odlučiti o mergeu; nakon mergea novi audit punog `main` SHA-a |

## B — potrebna nova implementacija ili izričita poslovna odluka

| PR | Razlog | Postupanje |
|---|---|---|
| #397 | Otvorena Media Application registracija nije prenesena na aktualni V38; stari PR je konfliktan | Ne spajati izravno; ponovno implementirati na aktualnom `main` ili zadržati invitation/PIN model |
| #433 | Mobilni MENU/AI raspored nastao je na staroj osnovi | Usporediti s aktualnim mobilnim runtimeom; prenijeti samo nedostajući dio |
| #454 | Kontakt, AI auto-reply, CID logo i status dashboard djelomično se preklapaju s novijim V38 kodom | Napraviti gap analizu; ne spajati konfliktni PR izravno |

## C — supersedirano ili zamijenjeno

| PR | Razlog | Preporuka |
|---|---|---|
| #431 | Deploy verifier je kasnije zamijenjen V38 exact-SHA verifierom | Kandidat za zatvaranje kao supersedirano |
| #463 | Audit click-tracking praznine prethodio je implementaciji | Kandidat za zatvaranje nakon potvrde da je dokumentacija sačuvana |
| #464 | Starija click-tracking implementacija | Kandidat za zatvaranje; novija izvedba spojena je kroz #465 |
| #466 | Audit je vezan uz stariji `main` SHA | Zamijenjen aktualnim konsolidacijskim auditom; kandidat za zatvaranje nakon zelenog novog audita |

## D — povijesni cleanup kandidati

Sljedeće skupine treba pregledati prije zatvaranja:

- stari preview i release-candidate PR-ovi;
- stari index/homepage dizajni;
- connectivity i deploy dijagnostika;
- raniji Media Center i mail stabilization paketi;
- sadržajni PR-ovi čiji je sadržaj već objavljen ili zamijenjen;
- stare bazne grane koje više nisu `main`.

Minimalna provjera prije zatvaranja svakog PR-a:

1. sadrži li jedinstveni rollback podatak;
2. sadrži li jedinstvenu sigurnosnu dokumentaciju;
3. sadrži li funkciju koja nije na aktualnom `main`;
4. je li naslov ili tijelo već označeno kao supersedirano;
5. je li grana konfliktna ili stotinama commita iza aktualnog `main`.

## Pravilo cleanup koraka

Zatvaranje mora biti zaseban, pregledan korak. Ne koristiti masovno zatvaranje bez klasifikacije i kratkog komentara koji navodi noviji PR ili aktualni `main` koji je zamijenio rad.
