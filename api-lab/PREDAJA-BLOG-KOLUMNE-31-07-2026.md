# PREDAJA: Kolumne → Blog (Blogger) — tehnički detalji
## Za drugog informatičara, 31.07.2026.

---

## 1. MEHANIZAM, TOČNO

Skripta: **`scripts/blog-publish-v1.mjs`**

Tok autentifikacije — OAuth2 refresh-token:
```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

client_id=<BLOGGER_CLIENT_ID>
client_secret=<BLOGGER_CLIENT_SECRET>
refresh_token=<BLOGGER_REFRESH_TOKEN>
grant_type=refresh_token
```
Vraća privremeni `access_token`, koristi se za samu objavu:
```
POST https://www.googleapis.com/blogger/v3/blogs/<BLOGGER_BLOG_ID>/posts/
Authorization: Bearer <access_token>
Content-Type: application/json

{ "kind": "blogger#post", "title": "...", "content": "<html>", "labels": [...] }
```

### Pristupni podaci (GitHub Actions secrets, samo imena)
```
BLOGGER_BLOG_ID
BLOGGER_CLIENT_ID
BLOGGER_CLIENT_SECRET
BLOGGER_REFRESH_TOKEN
```
Vrijednosti nisu meni dostupne niti su ikad prošle kroz mene — postavljene su
izravno u GitHub repozitoriju. Ako trebaju rotaciju, to ide preko Google
Cloud Console (OAuth klijent) i Blogger API-ja za novi `refresh_token`.

### Identitet objave, fiksno u kodu
- Autor: `Nermin Sefić`
- Izdavač: `GNK ASG d.o.o.`
- Blog: `NERMIN SEFIĆ - GNK ASG`, `https://nermin-sefic.blogspot.com`
- Svaka objava uvijek nosi oznake: `GNKASG`, `GNKDINAMOLtd`, `NerminSefic`,
  `BusinessIntelligence`, plus ključne riječi članka kao dodatne oznake
- Svaka objava završava poveznicom natrag na izvornik na gnk-asg.hr

### Ritam
Workflow `.github/workflows/blog-mirror-publish.yml`, **svaki sat**.
Šalje do **6 objava po pokretanju** (`BLOG_PER_RUN`, default 6) — Googleovo
ograničenje na broj objava sprječava slanje svih odjednom. Pauza od
**8 sekundi** između svake objave (`BLOG_PAUSE_MS`), jer Blogger vraća
grešku 429 na prebrze uzastopne zahtjeve.

### Red čekanja i stanje
- `apps/portal/data/editorial-registry.json` — svi tekstovi koji **trebaju**
  otići na blog. Redoslijed: najstariji prvi (kronološki kao i sajt).
- `apps/portal/data/blog-content/published.json` — evidencija što je **već**
  objavljeno (`posted[path] = { at, blogUrl, id }`). Skripta ovo čita svaki
  put da ne objavi isto dvaput.
- `apps/portal/data/blog-content/queue.json` — snimka zadnjeg pokretanja,
  za dijagnostiku.

---

## 2. KRITIČAN NALAZ — ZAŠTO KOLUMNE NE STIŽU NA BLOG

**Provjereno danas, izravno u `published.json`: 153 objave stigle, nijedna
od tri objavljene kolumne (`/gnk-aktual/kolumne/...`) nije među njima.**

**Uzrok, tehnički:** funkcija `readArticle()` unutar `blog-publish-v1.mjs`
prije slanja na Blogger **traži pravu HTML datoteku** na disku:
```js
const file = resolve(PORTAL, '.' + routePath, 'index.html');
if (!existsSync(file)) return null;
```
Za `/objave/...` i `/komentari/...` te datoteke postoje — svaka objava ima
svoju pravu stranicu. **Kolumne nemaju.** One postoje isključivo kao zapisi
u `apps/portal/data/kolumne.json`, koje JavaScript prikazuje dinamički na
jednoj zajedničkoj stranici `/gnk-aktual/`. Nijedna datoteka ne postoji na
putu `apps/portal/gnk-aktual/kolumne/01-ai-za-male-tvrtke/index.html`.

Rezultat: `readArticle()` vrati `null`, kolumna upadne u `summary.skipped`
s razlogom `"stranica nije nadena ili nema dovoljno teksta"`, **svaki sat,
zauvijek**, dok se to ne riješi.

### Kako se to rješava (dvije opcije, izbor ostaje na vama)

**Opcija A — generirati pravu stranicu po kolumni.** Kad
`kolumne-publish-v1.mjs` upiše novi zapis u `kolumne.json`, neka istovremeno
generira i `apps/portal/gnk-aktual/kolumne/<slug>/index.html` — statičku
stranicu s naslovom, tekstom, meta oznakama, koja postoji neovisno o
JavaScriptu. Time se rješava i blog i SEO (Google inače teže indeksira
sadržaj koji postoji samo u JSON-u).

**Opcija B — proširiti `readArticle()`** da za `type: "kolumna"` zapise
umjesto čitanja HTML datoteke, čita izravno iz `kolumne.json` po slugu.
Brže za implementirati, ali kolumne i dalje neće imati vlastitu indeksiranu
stranicu na sajtu — samo rješava blog nogu, ne i SEO nogu.

**Preporuka:** Opcija A, jer rješava oboje odjednom.

---

## 3. KAKO SE OVO RADI UBUDUĆE — KORAK PO KORAK

Za svaku novu kolumnu:

1. Napisati `.md` datoteku u `apps/portal/data/kolumne-red/`, format:
   ```
   ---
   slug: 09-primjer
   naslov: ...
   seo_naslov: ...
   meta_opis: ...
   kljucne_rijeci: a, b, c
   hashtagovi: TagJedan, TagDva
   slika_upit: ...
   slika_fallback: /assets/... (opcionalno)
   red: 9
   ---
   Tekst kolumne...
   ```
2. Pokrenuti: `node scripts/kolumne-publish-v1.mjs --slug 09-primjer --uzivo`
   — upisuje u `kolumne.json` i `editorial-registry.json` odjednom
3. **Dok se ne riješi nalaz iz točke 2**, ručno provjeriti je li kolumna
   stvarno stigla na blog nakon sat vremena — trenutno neće, dok jedna od
   dvije opcije gore ne bude implementirana
4. Sve ide kroz PR → restore point tag → merge → `deploy-admin-auth-v6.yml`
   s potvrdom `DEPLOY_ADMIN_AUTH_V6`

### Za API-je i ostale izvore (AKTUAL vijesti)
Isti princip — novi izvor se dodaje u `apps/portal/scripts/refresh_news.py`,
u `SOURCES` popis, format `(grupa, kategorija, naziv, url)`. Ako je nova
grupa, doda se i u `RUBRIKA_RED` / `RUBRIKA_NASLOV` u
`apps/portal/gnk-aktual/index.html` da dobije vlastiti naslov na stranici.
**Uvijek provjeriti da izvor vraća slike** (`media:content`, `enclosure` ili
`<img>` u opisu) — stranica odbacuje sve članke bez slike. Google News RSS
sam po sebi obično nema slike; treba mu par pravi medijski izvor uz sebe.

**Prije bilo kakve izmjene `refresh_news.py`:** provjeriti da `git log -1`
pokazuje stvarno svježe stanje (`git fetch origin main && git reset --hard
origin/main`), ne stari lokalni klon — to je uzrokovalo jedan ozbiljan bug
danas (obrisane obradne funkcije).

---

## 4. SVE POVEZANO S OVIM, NA JEDNOM MJESTU

| Što | Gdje |
|---|---|
| Skripta za blog | `scripts/blog-publish-v1.mjs` |
| Workflow za blog | `.github/workflows/blog-mirror-publish.yml` |
| Skripta za kolumne | `scripts/kolumne-publish-v1.mjs` |
| Red budućih kolumni | `apps/portal/data/kolumne-red/*.md` |
| Prikaz kolumni na sajtu | `apps/portal/data/kolumne.json` |
| Registar za blog | `apps/portal/data/editorial-registry.json` |
| Evidencija objavljenog | `apps/portal/data/blog-content/published.json` |
| Izvori vijesti | `apps/portal/scripts/refresh_news.py` |
| Prikaz rubrika | `apps/portal/gnk-aktual/index.html` (traži `RUBRIKA_RED`) |
| Worker za slike | `workers/gnk-asg-image-proxy/` |
| Tajni podaci (nazivi) | `docs/BLOG_I_TAJNE.md` |
