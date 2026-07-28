# Blog i tajne

Zadnja izmjena: 28. srpnja 2026.

---

## Blog

| | |
|---|---|
| **Naziv** | NERMIN SEFIĆ - GNK ASG |
| **Adresa** | https://nermin-sefic.blogspot.com |
| **ID bloga** | `900891366025005249` |
| **Autor** | Nermin Sefić |
| **Platforma** | Google Blogger, besplatan |
| **Google projekt** | My First Project (`pacific-attic-364809`) |
| **OAuth klijent** | Web client 1 · stanje **In production** |

**Kako radi:** svaka objava, komentar i analiza s gnk-asg.hr prenosi se i na blog —
isti naslov i opis, ključne riječi kao oznake, hashtagovi, potpis autora i
poveznica natrag na izvorni članak. Vodi se evidencija pa se ništa ne objavi dvaput.

| | |
|---|---|
| Automatizacija | `.github/workflows/blog-mirror-publish.yml` |
| Ritam | svaki sat u minuti 30 |
| Količina | 6 objava po prolazu, pauza 8 s |
| Izvor | `apps/portal/data/editorial-registry.json` |
| Red čekanja | `apps/portal/data/blog-content/queue.json` |
| Evidencija objavljenog | `apps/portal/data/blog-content/published.json` |

Blogger odbija prebrze uzastopne objave. Kad javi da je kvota potrošena, prolaz se
uredno prekida i ostatak čeka sljedeći sat.

---

## Tajne

**Vrijednosti se ovdje ne zapisuju.** Stoje samo u GitHub Secrets:
`Settings > Secrets and variables > Actions`.

Ako bi vrijednosti stajale u repozitoriju, svatko tko dobije pristup kodu dobio bi i
pristup blogu, Cloudflareu i pošti. Ova tablica zato govori **što koja tajna je,
gdje se koristi i gdje mora postojati** — ne i koliko vrijedi.

Stupac „Oba repozitorija" znači: mora biti upisano i u postojeći repozitorij i u onaj
na koji prelazimo, jer mirror prenosi datoteke, ali **ne prenosi tajne**.

| Tajna | Čemu služi | Koristi je | Oba repozitorija |
|---|---|---|---|
| `BLOGGER_BLOG_ID` | koji blog se puni | `blog-mirror-publish.yml` | da |
| `BLOGGER_CLIENT_ID` | oznaka OAuth klijenta | `blog-mirror-publish.yml` | da |
| `BLOGGER_CLIENT_SECRET` | tajna OAuth klijenta | `blog-mirror-publish.yml` | da |
| `BLOGGER_REFRESH_TOKEN` | trajni ključ za objavu na blog | `blog-mirror-publish.yml` | da |
| `CLOUDFLARE_ACCOUNT_ID` | oznaka Cloudflare računa | deploy i revizijski poslovi | da |
| `CLOUDFLARE_API_TOKEN` | implementacija workera i ruta | deploy i revizijski poslovi | da |
| `GNK_ASG_ADMIN_TOKEN` | administratorski pristup operatoru | `verify-email-tools-status-v6.yml` | da |
| `GNK_ASG_OPERATOR_TOKEN` | pristup operatoru iz automatizacija | `deploy-admin-auth-v6.yml`, `media-command-from-chat.yml` | da |
| `OPERATOR_TOKEN` | stariji naziv istog pristupa | `deploy-admin-auth-v6.yml` | da |
| `MASARYKOVA_MIRROR_TOKEN` | gura mirror na drugi račun | `mirror-sync-masarykova.yml` | ne — samo u izvornom |
| `MASARYKOVA_BACKUP_TOKEN` | oporavak s backup repozitorija | `disaster-recovery-mirror-v2.yml` | ne — samo u izvornom |

Osvježeni popis uvijek se može ponovno izgraditi:

```
node scripts/repo-switch-manifest.mjs
```

---

## Zamjena ključeva

Ključ, secret i GitHub token korišteni pri postavljanju prošli su kroz razgovor s
pomoćnikom. Treba ih zamijeniti.

**Blogger:**
1. Google Cloud Console → Clients → **Create client** → Web application
2. Redirect URI: `https://developers.google.com/oauthplayground`
3. OAuth Playground → zupčanik → *Use your own OAuth credentials* → upiši nove podatke
4. Scope: `https://www.googleapis.com/auth/blogger` → *Authorize APIs* → *Exchange authorization code for tokens*
5. Zamijeni `BLOGGER_CLIENT_ID`, `BLOGGER_CLIENT_SECRET` i `BLOGGER_REFRESH_TOKEN`
6. Obriši stari klijent

**GitHub:** Settings → Developer settings → Personal access tokens → novi token,
stari opozvati.

Nakon zamjene pokreni `blog-mirror-publish` ručno i provjeri da prolaz završi bez
grešaka.

---

## Što je namjerno isključeno

Poštanski protokoli stoje isključeni u `workers/gnk-asg-direct-operator/wrangler.toml`
— 21 zastavica, sve na `false`, uz obavezni BCC. Provjera *Site Functional Readiness*
pada ako se te vrijednosti promijene. Pri prelasku na drugi repozitorij moraju ostati
identične; `scripts/repo-switch-preflight.mjs` to provjerava.
