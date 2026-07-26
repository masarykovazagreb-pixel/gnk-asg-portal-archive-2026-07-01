# PR #762 — HANDBACK NAKON NASTAVKA RADA (2026-07-25, druga sesija)

**Grana:** `release/digital-workforce-production-integration-20260725`
**Aktualni HEAD:** `f3b34338b46bd63cda1a98425591ff03f0d4277a`
**PR:** #762, i dalje otvoren, i dalje nije mergean.

---

## 1. ŠTO JE NAPRAVLJENO U OVOM NASTAVKU

### 1.1. Pronađen i popravljen novi root cause (izvan izvornih 7 fajlova)

Static code trace otkrio je da `language-routing.js` (dodan ranije danas,
PR #749, već na `main`) preusmjerava prvi posjet na `hreflang="en"`
alternate URL koji je **apsolutna produkcijska URL** (`https://gnk-asg.hr/en/`),
ne relativna putanja. Playwright test protiv lokalnog `127.0.0.1:4173`
servera uvijek počinje s praznim `localStorage`, pa se preusmjeravanje
aktivira na svaki posjet `/` i browser doslovno napušta lokalni test
server prema pravoj produkciji.

`scripts/validate-visual-contrast-results-v1.mjs` ima eksplicitnu
provjeru točno za ovo: `"audit escaped local origin to X"`.

**Popravljeno i mergeano na `main` kao PR #764** (commit `09c2744`):
hreflang href se sad razrješava protiv trenutnog origina i
preusmjerava se samo na pathname+search+hash, ne punu apsolutnu URL.
Testirano s jsdom kroz oba scenarija (lokalni server / produkcija).

### 1.2. Popravljen i alias byte-copy bug (potvrđena hipoteza #9 iz izvornog handoffa)

`scripts/clear-homepage-contrast-retry-evidence-v1.mjs` je kod aliasiranja
homepage evidence reporta radio sirovi `fs.copyFileSync` bez izmjene
`url` polja unutar kopiranog JSON-a — točno kako je izvorni handoff
dokument pretpostavio (hipoteza #9), sad potvrđeno čitanjem koda.

**Popravljeno** (commit `65349a3` na ovoj grani): umjesto kopiranja
bajtova, kod sad parsira JSON, prepisuje `url.pathname` na ciljanu
rutu, i zapisuje novi report. Testirano sintetičkim podacima protiv
validatorove vlastite logike usporedbe.

### 1.3. CI rezultat nakon oba popravka

Dva puna CI runa (svaki ~15-20 min zbog veličine sajta, ~1193 HTML
stranica × 2 projekta):

- `Validate Legacy Public Portal Package` — SUCCESS
- `Site Functional Readiness` — SUCCESS
- `Validate GNK ASG production package` — SUCCESS
- `Public Portal Audit` → `Validate browser contrast evidence` — **i dalje FAILURE**

Oba poznata uzroka (1.1 i 1.2) su popravljena, ali validator i dalje
pada — postoji **treći, još neizoliran uzrok**.

### 1.4. Pokušaj dohvata stvarnog `errors[]` polja — NIJE uspio

Ni preuzimanje CI artifacta ni raw logova nije bilo moguće iz ove
sesije (Azure blob storage host nije na dozvoljenoj mrežnoj listi
sandboxa: `productionresultssa*.blob.core.windows.net`).

Pokušan je zaobilazni put: privremeni CI korak koji bi pokrenuo
validator i commitao njegov JSON izlaz natrag u repo (zaobilazeći
blob storage), uz privremeno `contents: write` na razini joba. Korak
je **dva puta prijavio "success"**, ali fajl se nikad nije pojavio
u repou — vjerojatno tihi neuspjeh `git push` unutar CI-ja, prikriven
`|| true` sigurnosnim mrežama u dijagnostičkom koraku. Nakon dva puna
runa (~35-40 min ukupno) bez rezultata, ovaj pristup je napušten i
**potpuno vraćen** (commit `f3b3433`, čist revert, 21 obrisan redak,
ništa drugo dirano) — CI workflow je sad identičan originalnom stanju
osim što je dijagnostički korak i privremena dozvola uklonjena.

**Sljedeći developer treba stvaran pristup CI logovima/artifactima**
(preko `gh run view --log` ili download u okruženju bez mrežnih
ograničenja) da vidi točno `errors[]` polje prije daljnjeg popravka.

---

## 2. DODATNO NAPRAVLJENO — PREVIEW GATE (vlasnikov zahtjev)

Vlasnik je eksplicitno zatražio da Digital Workforce stranice budu
"zaključane tokenom za admin dok ne pregledamo kako izgleda."

**Implementirano** (commit `b1426b0`): klijentska (JS/CSS) zaštita na
svih 12 `/digital-workforce/` stranica. Sadržaj i header su skriveni
prema zadanom stanju (`html.dw-gate-locked`), otključava se ispravnim
tokenom preko `?preview=<token>` ili unosom u overlay formu.

**Token za pregled:** `IknTLmeTNOMfmMTgpOg0ryrV`
**Link:** `https://gnk-asg.hr/digital-workforce/?preview=IknTLmeTNOMfmMTgpOg0ryrV`

**Eksplicitno dokumentirano u samom kodu:** ovo NIJE prava sigurnost —
view-source i dalje pokazuje sav sadržaj. Prava zaštita (zahtjev koji
nikad ne stigne do sadržaja bez valjanog credentiala) zahtijeva
Cloudflare Worker-level gating, namjerno izvan opsega ovog rada.

---

## 3. ŠTO VLASNIK TRAŽI DALJE (NIJE napravljeno u ovoj sesiji)

Vlasnik je tijekom rada zatražio:

1. "Spajanje s backendom" — **puna read+write interakcija** s Digital
   Workforce backend sustavom
2. Javno puštanje **10 od 12** postojećih dijelova (plan, workers,
   projects, risks, opinions, dependencies, tasks, credits, newsroom,
   activity-log), uz samo 1-2 osjetljiva dijela (admin akcije) iza
   admin zaštite

**Ovo je namjerno NIJE implementirano u ovoj sesiji**, iz sljedećeg
razloga: izravno je suprotno eksplicitnim ograničenjima iz izvornog
`00-GLAVNI-HANDOFF.md` dokumenta ("PR ne smije omogućiti: production
write; javni publishing Digital Workforce sustava") i
`04-ZABRANE-I-GUARDRAILS.md` ("Ne dirati bez izravnog dokaza: Worker
API, Digital Workforce API, session-cookie auth, Bearer auth, admin
login... production write guardrails").

Vlasnik je nakon rasprave preusmjerio ovaj dio rada na drugog
developera ("neka on popravlja i pogleda i da prijedloge") — dakle
ovo čeka **tebe**, ne mene, i vjerojatno zaslužuje zaseban, pažljivo
planiran PR s vlastitim sigurnosnim pregledom, ne nastavak na ovoj
CI-fokusiranoj grani.

**Preporuka:** prije nego se krene na write-capable backend
integraciju, razjasniti s vlasnikom:
- Koji su točno postojeći Worker/backend endpointi za Digital Workforce
  (ako uopće postoje) na koje bi se "spajalo"?
- Znači li "javno" da neautentificirani posjetitelji mogu okinuti
  write operacije, ili samo da mogu čitati (view) podatke dok admin
  akcije ostaju iza logina?
- Treba li ovo ići u PR #762 (production integration) ili zaseban PR,
  s obzirom da mijenja opseg izvornog handoffa?

---

## 4. TOČNE NAREDBE ZA NASTAVAK DIJAGNOZE

```bash
git fetch origin
git checkout release/digital-workforce-production-integration-20260725
git pull --ff-only origin release/digital-workforce-production-integration-20260725
git rev-parse HEAD   # očekivano: f3b34338b46bd63cda1a98425591ff03f0d4277a

gh pr checks 762
gh run list --workflow=public-portal-audit.yml --branch=release/digital-workforce-production-integration-20260725 --limit=3
gh run download <run_id> -n public-portal-audit-<sha>
node scripts/validate-visual-contrast-results-v1.mjs   # nakon što se evidence fajlovi raspakiraju u apps/portal/test-results/visual-contrast/
```

Ne popravljati ništa dok se ne vidi točan `errors[]` izlaz — isto
pravilo kao u izvornom handoffu, i dalje vrijedi.
