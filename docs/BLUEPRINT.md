# GNK ASG — nacrt sustava

Stanje na dan 28. srpnja 2026. — gdje sve živi, što se samo vrti, tko što
poslužuje i kako se prelazi na drugi repozitorij.

> **Osvježeno 2026-09-23:** tablice automatizacija u §2 su **povijesni presjek
> od 28.07.2026.** — neke kadence su se od tada promijenile (npr. aktualni cronovi
> i single-writer vlasništvo žive u `ops/CONTROL-PLANE.json` + `ops/MASTER_ASG_BACKLOG.md`).
> Neaktivna mapica `apps/portal/.github/workflows/` **nije registrirana** (GitHub čita
> samo korijenski `.github/workflows/`) i ne pokreće ništa.

Popis koji stroj čita nalazi se u `ops/repo-switch/manifest.json` i osvježava se
naredbom `node scripts/repo-switch-manifest.mjs`.

---

## 1. Što gdje živi

| Sloj | Gdje | Što radi |
|---|---|---|
| Kod i sadržaj | GitHub `beckuphome-gnk/gnk-asg-portal` | izvor svega |
| Pričuva | GitHub `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01` | zrcalo, Actions isključeni |
| Posluživanje | Cloudflare Workers, račun `beckuphome@gmail.com` | 16 workera, 50 ruta |
| Pohrana | Cloudflare | 8 KV prostora, 2 D1 baze, 1 R2 spremnik |
| Domena | gnk-asg.hr i www.gnk-asg.hr | |
| Blog | Blogger `nermin-sefic.blogspot.com` | preslika objava |

**Važno:** dio naslovnice ne dolazi iz `index.html` nego ga Worker ubacuje na
rubu (`index-unified-auth`). Kad nešto ne nestane iz HTML-a, prvo pogledati što
Worker dodaje.

---

## 2. Automatizacije koje se same vrte

| Ritam | Posao | Što radi |
|---|---|---|
| 1 h, :05 | Refresh index live data | podaci naslovnice |
| dnevno 05:35 | Sync Webshop Products | katalog trgovine |
| 1 h, :10 | Market Pulse Refresh | tržišni pokazatelji |
| 1 h, :20 | Publish Scheduled Editorial Content | objava zakazanih tekstova |
| 1 h, :20 | Refresh GNKC Index | GNKC indeks |
| 1 h, :30 | Blog Mirror Publish | prijenos objava na blog |
| 2 h, :17 | GNK ASG News Refresh | vijesti iz 73 RSS izvora |
| 2 h, :17 | SEO and News Visibility Cycle | SEO ciklus |
| 3 h, :25 | Macro Market Data Refresh | BTC, zlato, Brent, USD-EUR |
| 4 h | Mirror Sync to Masarykova | zrcaljenje u pričuvu |
| 6 h | Generate Digital Workforce Newsroom | newsroom stranice |
| 06:40 | Provjera workera | ispit javnih ruta |
| 06:40 | SEO Audit Refresh | revizija SEO-a |
| 06/12/18 | Site Health Check | zdravlje sajta |
| 09:00 | LinkedIn Daily Post Rotation | priprema objave, ne šalje |

Od 233 workflowa aktivno je 48. Ostalo su jednokratni i dijagnostički poslovi,
namjerno ugašeni 28.07.2026. jer su se palili na svaki push i punili povijest
lažnim padovima.

---

## 3. Kako nastaje sadržaj

**Vijesti** — `refresh_news.py` skuplja sa 73 RSS izvora, `refresh_news_policy.py`
dedupira, primjenjuje kvote po kategoriji i mediju te filtre za reklame, pa piše
`data/news.json`. Objavljeni skup je 150 vijesti. Stranica `/gnk-aktual/` čita tu
datoteku izravno; `/api/public-news-feed` je Worker koji poslužuje istu datoteku.

**Urednički tekstovi** — plan u `data/editorial-plan/`, objavljuje
`editorial-publish-scheduled-v1.mjs` svaki sat u :20. Registar svih objavljenih
tekstova je `data/editorial-registry.json`.

**Blog** — `blog-publish-v1.mjs` čita registar i prenosi na Blogger, 6 po prolazu.
Pravilo: sajt je izvor, blog je preslika. Bez stranice na sajtu nema objave na blogu.

---

## 4. Tajne

Jedanaest u GitHubu, osamnaest u Cloudflare Workeru. Imena i namjena u
`docs/BLOG_I_TAJNE.md`, odakle ih nabaviti u `docs/TAJNE_ZA_DRUGI_REPO.md`.
Vrijednosti se nigdje ne zapisuju u repozitorij.

Poštanski protokoli namjerno stoje isključeni — 21 zastavica na `false`, uz
obavezni BCC. Provjera *Site Functional Readiness* pada ako se promijene.

---

## 5. Protokol prelaska na drugi repozitorij

Oba repozitorija drže isti kod i iste tajne, ali automatizacije smiju raditi
**samo u jednom**. U oba bi svaki tekst otišao na blog dvaput, a podatkovne
datoteke bi se pregazile.

### Prije prelaska

```
node scripts/repo-switch-manifest.mjs     # osvježi popis
node scripts/repo-switch-preflight.mjs    # provjeri pričuvu
```

### Sam prelazak

```
bash scripts/prelazak.sh --apply                       # Linux, macOS
powershell -File scripts\prelazak.ps1 -Apply           # Windows
```

Skripta radi četiri koraka: zrcali, provjeri, zamijeni uloge, potvrdi blog.

**Ako GitHub Actions više ne rade** — potrošen račun, ugašene Actions — skripta
zrcali izravno s računala preko `git push --mirror`. Taj put ništa ne troši na
GitHubu, pa prelazak ostaje moguć i kad automatizacije stanu.

### Redoslijed koji se ne smije obrnuti

1. zrcaljenje, da pričuva ima najsvježije stanje — posebno evidenciju bloga
2. gašenje automatizacija u radnom repozitoriju
3. paljenje u pričuvnom
4. provjera prvog prolaza `blog-mirror-publish`

Radni repozitorij se **ne briše**. Ostaje s kodom i tajnama, bez uključenih
automatizacija.

---

## 6. Objava u produkciju

Push u `main` **ne znači** objavu. Kod i slike čekaju ručnu objavu:

```
gh workflow run deploy-admin-auth-v6.yml -f confirm_production_deploy=DEPLOY_ADMIN_AUTH_V6 -f approved_sha=<puni SHA>
```

Provjera traži da SHA bude **točno jednak** trenutnom `origin/main`. Drugi
automati commitaju gotovo neprekidno, pa SHA zna zastarjeti u minuti — tada se
uzme svježi i ponovi.

Automatski se objavljuju samo čiste uredničke promjene, kroz
`editorial-content-deploy`.

---

## 7. Točke vraćanja

| Oznaka | Što vraća |
|---|---|
| `tocka-vracanja/naslovnica-20260728` | naslovnica prije preslagivanja |
| `tocka-vracanja/naslovnica-prije-kartica` | prije novih slika kartica |
| `tocka-vracanja/prije-kartica-u-nizu` | prije slaganja kartica u niz |
| `tocka-vracanja/restorani-20260728` | restorani prije proširenja |
| `tocka-vracanja/prije-seo-dopune` | prije masovne dopune meta oznaka |
| `tocka-vracanja/prije-hashtagova` | prije čišćenja hashtagova |
| `tocka-vracanja/prije-ubrzanja` | prije uvjetovanog učitavanja |
| `tocka-vracanja/prije-mobilnog` | prije mobilnih dotjerivanja |

Vraćanje samo naslovnice:

```
git checkout <oznaka> -- apps/portal/index.html apps/portal/en/index.html
```

---

## 8. Otvoreno

- Tri workera ne odgovaraju na svojim rutama: `editorial-center`,
  `emergency-entry-redirect`, `scheduled-mail-sender`. Traže Cloudflare.
- `check-runtime-contract` pada na živim podacima objave.
- Blog puni arhivu sporo jer Google ograničava objave novim blogovima.
- Plan objava staje na 3. kolovoza.
- Ključevi korišteni pri postavljanju prošli su kroz razgovor s pomoćnikom i
  treba ih zamijeniti; OpenAI prvi, jer se njime troši novac.
