# GNK ASG — nacrt sustava

Stanje na dan 28. srpnja 2026. Dokument opisuje gdje sve zivi, sto se samo vrti,
tko sto poslužuje i kako se prelazi na drugi repozitorij.

Popis koji stroj cita nalazi se u `ops/repo-switch/manifest.json` i osvjezava se
naredbom `node scripts/repo-switch-manifest.mjs`.

---

## 1. Sto gdje zivi

| Sloj | Gdje | Sto radi |
|---|---|---|
| Kod i sadrzaj | GitHub `beckuphome-gnk/gnk-asg-portal` | izvor svega |
| Pricuva | GitHub `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01` | zrcalo, Actions iskljuceni |
| Posluzivanje | Cloudflare Workers, racun `beckuphome@gmail.com` | 16 workera, 50 ruta |
| Pohrana | Cloudflare | 8 KV prostora, 2 D1 baze, 1 R2 spremnik |
| Domena | gnk-asg.hr i www.gnk-asg.hr | |
| Blog | Blogger `nermin-sefic.blogspot.com` | preslika objava |

**Vazno:** dio naslovnice ne dolazi iz `index.html` nego ga Worker ubacuje na
rubu (`index-unified-auth`). Kad nesto ne nestane iz HTML-a, prvo pogledati sto
Worker dodaje.

---

## 2. Automatizacije koje se same vrte

| Ritam | Posao | Sto radi |
|---|---|---|
| 15 min | Refresh index live data | podaci naslovnice |
| 15 min | Sync Webshop Products | katalog trgovine |
| 1 h, :10 | Market Pulse Refresh | trzisni pokazatelji |
| 1 h, :20 | Publish Scheduled Editorial Content | objava zakazanih tekstova |
| 1 h, :20 | Refresh GNKC Index | GNKC indeks |
| 1 h, :30 | Blog Mirror Publish | prijenos objava na blog |
| 2 h, :17 | GNK ASG News Refresh | vijesti iz 73 RSS izvora |
| 2 h, :17 | SEO and News Visibility Cycle | SEO ciklus |
| 3 h, :25 | Macro Market Data Refresh | BTC, zlato, Brent, USD-EUR |
| 4 h | Mirror Sync to Masarykova | zrcaljenje u pricuvu |
| 6 h | Generate Digital Workforce Newsroom | newsroom stranice |
| 06:40 | Provjera workera | ispit javnih ruta |
| 06:40 | SEO Audit Refresh | revizija SEO-a |
| 06/12/18 | Site Health Check | zdravlje sajta |
| 09:00 | LinkedIn Daily Post Rotation | priprema objave, ne salje |

Od 233 workflowa aktivno je 48. Ostalo su jednokratni i dijagnosticki poslovi,
namjerno ugaseni 28.07.2026. jer su se palili na svaki push i punili povijest
laznim padovima.

---

## 3. Kako nastaje sadrzaj

**Vijesti** — `refresh_news.py` skuplja s 73 RSS izvora, `refresh_news_policy.py`
dedupira, primjenjuje kvote po kategoriji i mediju te filtre za reklame, pa pise
`data/news.json`. Objavljeni skup je 150 vijesti. Stranica `/gnk-aktual/` cita tu
datoteku izravno; `/api/public-news-feed` je Worker koji poslužuje istu datoteku.

**Urednicki tekstovi** — plan u `data/editorial-plan/`, objavljuje
`editorial-publish-scheduled-v1.mjs` svaki sat u :20. Registar svih objavljenih
tekstova je `data/editorial-registry.json`.

**Blog** — `blog-publish-v1.mjs` cita registar i prenosi na Blogger, 6 po prolazu.
Pravilo: sajt je izvor, blog je preslika. Bez stranice na sajtu nema objave na blogu.

---

## 4. Tajne

Jedanaest u GitHubu, osamnaest u Cloudflare Workeru. Imena i namjena u
`docs/BLOG_I_TAJNE.md`, odakle ih nabaviti u `docs/TAJNE_ZA_DRUGI_REPO.md`.
Vrijednosti se nigdje ne zapisuju u repozitorij.

Poštanski protokoli namjerno stoje iskljuceni — 21 zastavica na `false`, uz
obavezni BCC. Provjera *Site Functional Readiness* pada ako se promijene.

---

## 5. Protokol prelaska na drugi repozitorij

Oba repozitorija drze isti kod i iste tajne, ali automatizacije smiju raditi
**samo u jednom**. U oba bi svaki tekst otisao na blog dvaput, a podatkovne
datoteke bi se pregazile.

### Prije prelaska

```
node scripts/repo-switch-manifest.mjs     # osvjezi popis
node scripts/repo-switch-preflight.mjs    # provjeri pricuvu
```

### Sam prelazak

```
bash scripts/prelazak.sh --apply                       # Linux, macOS
powershell -File scripts\prelazak.ps1 -Apply           # Windows
```

Skripta radi cetiri koraka: zrcali, provjeri, zamijeni uloge, potvrdi blog.

**Ako GitHub Actions vise ne rade** — potrosen racun, ugasene Actions — skripta
zrcali izravno s racunala preko `git push --mirror`. Taj put nista ne trosi na
GitHubu, pa prelazak ostaje moguc i kad automatizacije stanu.

### Redoslijed koji se ne smije obrnuti

1. zrcaljenje, da pricuva ima najsvjezije stanje — posebno evidenciju bloga
2. gasenje automatizacija u radnom repozitoriju
3. paljenje u pricuvnom
4. provjera prvog prolaza `blog-mirror-publish`

Radni repozitorij se **ne brise**. Ostaje s kodom i tajnama, bez ukljucenih
automatizacija.

---

## 6. Objava u produkciju

Push u `main` **ne znaci** objavu. Kod i slike cekaju rucnu objavu:

```
gh workflow run deploy-admin-auth-v6.yml -f confirm_production_deploy=DEPLOY_ADMIN_AUTH_V6 -f approved_sha=<puni SHA>
```

Provjera trazi da SHA bude **tocno jednak** trenutnom `origin/main`. Drugi
automati commitaju gotovo neprekidno, pa SHA zna zastarjeti u minuti — tada se
uzme svjezi i ponovi.

Automatski se objavljuju samo ciste urednicke promjene, kroz
`editorial-content-deploy`.

---

## 7. Tocke vracanja

| Oznaka | Sto vraca |
|---|---|
| `tocka-vracanja/naslovnica-20260728` | naslovnica prije preslagivanja |
| `tocka-vracanja/naslovnica-prije-kartica` | prije novih slika kartica |
| `tocka-vracanja/prije-kartica-u-nizu` | prije slaganja kartica u niz |
| `tocka-vracanja/restorani-20260728` | restorani prije prosirenja |
| `tocka-vracanja/prije-seo-dopune` | prije masovne dopune meta oznaka |
| `tocka-vracanja/prije-hashtagova` | prije ciscenja hashtagova |
| `tocka-vracanja/prije-ubrzanja` | prije uvjetovanog ucitavanja |
| `tocka-vracanja/prije-mobilnog` | prije mobilnih dotjerivanja |

Vracanje samo naslovnice:

```
git checkout <oznaka> -- apps/portal/index.html apps/portal/en/index.html
```

---

## 8. Otvoreno

- Tri workera ne odgovaraju na svojim rutama: `editorial-center`,
  `emergency-entry-redirect`, `scheduled-mail-sender`. Traze Cloudflare.
- `check-runtime-contract` pada na zivim podacima objave.
- Blog puni arhivu sporo jer Google ogranicava objave novim blogovima.
- Plan objava staje na 3. kolovoza.
- Kljucevi koristeni pri postavljanju prosli su kroz razgovor s pomocnikom i
  treba ih zamijeniti; OpenAI prvi, jer se njime trosi novac.
