# AUTOMATIZAM — kolumne od reda do bloga
## Arhitektura, spremno za pregled. Ništa nije aktivirano.

---

## 1. CIJELI LANAC, U JEDNOJ SLICI

```
.md datoteka u data/kolumne-red/          (ti ili netko drugi napiše kolumnu)
        │
        ▼
kolumne-publish-v1.mjs                     (nova skripta, ovdje pripremljena)
        │
        ├──► poziva Worker gnk-asg-image-proxy   (Pexels sa serverske strane)
        │
        ├──► piše apps/portal/data/kolumne.json           (prikaz na AKTUAL-u)
        │
        └──► piše apps/portal/data/editorial-registry.json (isti registar
                                                              koji već koristi
                                                              blog automatika)
                        │
                        ▼
        blog-publish-v1.mjs — POSTOJI, NE DIRA SE
                        │
                        ▼
        nermin-sefic.blogspot.com — objava se pojavi sama, u roku sat vremena
```

**Ključna stvar:** dva od tri dijela lanca već postoje i rade. Novo je
isključivo ono što spaja kolumnu s tim postojećim dijelovima — sama skripta
i Worker za sliku. Blog automatika se ne dira nijednim retkom.

---

## 2. ŠTO JE SPREMNO, PO KORACIMA

| Korak | Datoteka | Stanje |
|---|---|---|
| Slika sa servera | `worker-pexels-image-proxy/index.js` + `wrangler.toml` | Napisano, **nije deployano** |
| Spajanje kolumne u oba registra | `scripts/kolumne-publish-v1.mjs` | Napisano, radi ručno s `--uzivo` |
| Tjedni automatski okidač | `.github/workflows/kolumne-tjedni-ciklus.yml` | Napisano, **isključeno** (`if: false`, cron zakomentiran) |
| Prijenos na blog | `scripts/blog-publish-v1.mjs` | **Već postoji, ne dira se** |

---

## 3. ŠTO TREBA DA OVO ZAŽIVI, REDOSLIJEDOM

1. **Deploy Workera** — netko s ovlastima pokreće `wrangler deploy` za
   `gnk-asg-image-proxy`, i postavlja secret:
   `wrangler secret put PEXELS_API_KEY --name gnk-asg-image-proxy`
   (ključ koji je prošao kroz razgovor treba prije toga poništiti i zamijeniti)
2. **Ruta u Cloudflare zoni** — `gnk-asg.hr/api/slike*` mora biti aktivna,
   isto kao i kod ostalih Workera u repozitoriju
3. **Mapa reda kolumni** — netko puni `apps/portal/data/kolumne-red/` .md
   datotekama, jedna po nadolazećoj kolumni, po formatu opisanom u
   `kolumne-publish-v1.mjs`
4. **Ručno testiranje prvo** — pokrenuti skriptu BEZ `--uzivo` i pogledati
   ispis, zatim jednom s `--uzivo` na jednoj kolumni, provjeriti da se
   pojavila i na AKTUAL-u i da ju je blog automatika pokupila unutar sat
   vremena
5. **Tek nakon toga** — uklanjanje `if: false` i otkomentiravanje `schedule:`
   u workflowu, čime kolumna počinje izlaziti sama svake subote u 08:00

Svaki od ovih pet koraka je odluka za sebe. Ništa se ne uključuje u paketu.

---

## 4. ŠTO OSTAJE NEPROMIJENJENO

- `blog-publish-v1.mjs` se ne dira nijednim retkom
- `news-refresh.yml` i vijesna skripta nisu dio ovog lanca — to je zaseban
  posao, opisan u ranijoj strategiji
- Format zapisa u `editorial-registry.json` prati postojeći oblik
  (`slug, type, collection, path, url, title, description, keywords,
  hashtags, image, publishedAt, inPlan, seoComplete`) — samo `type` dobiva
  novu vrijednost, `"kolumna"`, uz postojeće `"objava"`, `"komentar"`,
  `"analiza"`

---

## 5. SIGURNOSNA NAPOMENA, PONOVLJENA JER JE VAŽNA

Ključ koji je stigao u ovaj razgovor (Pexels) treba poništiti u Pexels
panelu prije nego što bilo koji od ovih koraka krene, bez obzira hoće li
uopće ući u Worker. Sve što je prošlo kroz čavrljanje smatra se izloženim,
neovisno o tome je li stvarno zlorabljeno.
