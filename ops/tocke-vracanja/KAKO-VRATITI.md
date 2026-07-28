# Kako vratiti naslovnicu

Točka vraćanja napravljena **28. srpnja 2026.**, prije preslagivanja rasporeda
naslovnice.

| | |
|---|---|
| Commit | `4163c1dd7` |
| Oznaka | `tocka-vracanja/naslovnica-20260728` |
| Grana | `sigurnost/naslovnica-20260728` |

Sve troje je na GitHubu i ne briše se samo od sebe.

## Vraćanje samo naslovnice (najčešći slučaj)

Vraća `index.html` i `en/index.html`, ništa drugo ne dira:

```
git fetch --all --tags
git checkout tocka-vracanja/naslovnica-20260728 -- apps/portal/index.html apps/portal/en/index.html
git commit -m "Vracena naslovnica na stanje od 28.07.2026."
git push
```

## Vraćanje cijelog repozitorija na to stanje

Samo ako je nešto šire pošlo po zlu:

```
git fetch --all --tags
git reset --hard tocka-vracanja/naslovnica-20260728
git push --force-with-lease
```

`--force-with-lease` odbija push ako je netko drugi u međuvremenu gurnuo
promjene, pa se tuđi rad ne može slučajno pregaziti.

## Ako git nije pri ruci

U ovoj mapi stoje i same datoteke:

- `index-20260728.html` → kopirati u `apps/portal/index.html`
- `en-index-20260728.html` → kopirati u `apps/portal/en/index.html`

## Provjera nakon vraćanja

```
node scripts/audit-public-portal-v1.mjs
```

Mora javiti 0 grešaka i 0 upozorenja.
