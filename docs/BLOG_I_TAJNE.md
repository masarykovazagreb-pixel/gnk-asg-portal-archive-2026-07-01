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

## Tajne u Cloudflare Workeru

Ove **ne** idu u GitHub. Žive u Workeru `gnk-asg-direct-operator` i **ne mijenjaju se
pri prelasku na drugi repozitorij** — Worker ostaje na istom Cloudflare računu.
Postaju važne samo ako se mijenja i Cloudflare račun; tada se sve mora postaviti
iznova jer se vrijednosti ne mogu pročitati.

Popis snimljen 28.07.2026. naredbom
`npx wrangler secret list --name gnk-asg-direct-operator` — ukupno **18**:

| Tajna | Čemu služi |
|---|---|
| `ADMIN_TOKEN` | administratorski pristup; koristi ga 26 datoteka Workera |
| `OPERATOR_TOKEN` | isto, zamjenski naziv |
| `GNK_ASG_ADMIN_TOKEN` | isto, treći naziv |
| `GNK_ASG_OPERATOR_TOKEN` | isto, četvrti naziv |
| `NEWS_PUBLISH_TOKEN` | objava vijesti; koristi ga 13 datoteka |
| `OPENAI_API_KEY` | prijevod recepata, kontakt studio, Intelligence Desk |
| `RESEND_API_KEY` | slanje e-pošte preko vanjske usluge |
| `MAILOPS_ADMIN_USER` | pristup poštanskoj administraciji |
| `MAILOPS_ADMIN_PASS` | lozinka za isto |
| `MAIL_SEND_APPROVAL_CODE` | odobrenje slanja pošte |
| `MAIL_AUTO_REPLY_ENABLED` | prekidač automatskih odgovora |
| `MAIL_BCC_TO` | obavezna skrivena kopija |
| `MAIL_FORWARD_TO` | prosljeđivanje pošte |
| `MAIL_AUDIT_COPY_TO` | revizijska kopija |
| `GA_SERVICE_ACCOUNT_JSON` | Google Analytics, servisni račun |
| `GA_PROPERTY_ID` | oznaka Analytics svojstva |
| `GOOGLE_TAG_ID` | oznaka Google Taga |
| `MEDIA_OUTREACH_TEST_NONCE` | zaštita testnog slanja medijima |

Četiri naziva za isti operator token postoje jer su nastajali u različito vrijeme.
Worker prihvaća bilo koji.

### Ovlasti Cloudflare pristupa

Prijavljeni račun: `beckuphome@gmail.com`, Account ID `1728309632b4e7be93fba322822905da`.

Ovlasti pokrivaju workers, KV, D1, rute, Pages, e-poštu i AI. **R2 nije na popisu
ovlasti**, a sustav koristi R2 spremnik `gnk-asg-media-assets` — vezanje
`GNK_ASG_MEDIA_ASSETS` pojavljuje se 78 puta u kodu, a `media-command-from-chat`
dohvaća PDF naredbom `wrangler r2 object get`. Provjeriti naredbom
`npx wrangler r2 bucket list`; ako ne prođe, prijava treba proširiti ovlasti.

---

## Pravilo objavljivanja

**Sajt je izvor, blog je preslika.**

Svaki tekst objavljuje se na **dva mjesta**, uvijek istim redoslijedom:

1. Prvo na gnk-asg.hr — kroz raspored objava, kako je i dosad išlo
2. Zatim na blog, u sljedećem prolazu, s poveznicom natrag na izvorni članak

Ništa se ne piše izravno na blog i ništa ne postoji samo tamo. Prijenos čita
`editorial-registry.json`, koji se gradi iz stvarnih stranica na sajtu — ako
stranica ne postoji, objava se preskače. Time je pravilo ugrađeno u sam postupak,
ne oslanja se na pamćenje.

Blog ne mijenja ništa na sajtu: ne dira raspored objava, ne stvara stranice i ne
utječe na SEO izvornika. Kanonski izvor ostaje gnk-asg.hr.

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
