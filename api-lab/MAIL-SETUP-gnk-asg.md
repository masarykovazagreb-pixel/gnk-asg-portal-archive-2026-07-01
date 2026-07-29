# MAIL SUSTAV — gnk-asg.hr
## Plan postavljanja, korak po korak

**Datum:** 29.07.2026.
**Izvodi se:** 30.07.2026.
**Domena:** gnk-asg.hr
**DNS:** Cloudflare
**Provider:** Zoho Mail Lite (EU datacentar)
**Trajanje:** ~45 min aktivnog rada + 1–4 h čekanja DNS propagacije

---

## 0a. ZATEČENO STANJE (provjereno u javnom DNS-u, 29.07.2026.)

| Zapis | Trenutna vrijednost |
|---|---|
| NS | `kaiser.ns.cloudflare.com`, `khloe.ns.cloudflare.com` |
| MX | `route1/2/3.mx.cloudflare.net` — **Cloudflare Email Routing** |
| SPF | `v=spf1 include:_spf.mx.cloudflare.net ~all` |
| DMARC | `v=DMARC1; p=quarantine; rua=mailto:dmarc@gnk-asg.hr; ruf=mailto:dmarc@gnk-asg.hr; fo=1;` |
| DKIM | **ne postoji** |
| Ostalo | `google-site-verification=...` (Search Console — NE dirati) |

**Postojeće adrese:** `legal@`, `info@`, `ubo@`, `it@`, `office@`

**Posljedice:**
1. Domena danas **prima** poštu (prosljeđivanje), ali **ne šalje** — nema izlaznog servera ni DKIM-a. Zato bot ne može slati notifikacije.
2. SPF i DMARC **već postoje** → sutra se **uređuju**, ne dodaju. Drugi SPF zapis razbija oba.
3. DMARC je već na `p=quarantine`, ne `p=none` → **DKIM mora raditi prije prebacivanja MX-a**, inače vlastita pošta ide u karantenu.
4. `dmarc@gnk-asg.hr` prima izvještaje → mora ostati živ kao alias.

---

## 0. ODLUKA — sažetak

| Stavka | Odluka | Zašto |
|---|---|---|
| Provider | Zoho Mail Lite, godišnje | Jedini jeftin plan s IMAP/SMTP |
| Broj plaćenih sandučića | **3** — `it@`, `info@`, `office@` | Aliasi su besplatni, ne troše licence |
| Cloudflare Email Routing | **NE** | Sukob MX zapisa sa Zohom, i ne može slati |
| AI u mailu | **NE plaćamo** | Superhuman i Fyxer rade preko IMAP-a iznad Zoha |
| Trošak | ~36 USD / godina | 3 × ~1 USD/mj, godišnje plaćanje |

---

## 1. STRUKTURA ADRESA

### Plaćeni sandučići (3 licence)

| Adresa | Namjena |
|---|---|
| `it@gnk-asg.hr` | Sustav, SMTP za bota, GitHub Actions, notifikacije |
| `info@gnk-asg.hr` | Opći kontakt — web forma, prvi kontakt, upiti |
| `office@gnk-asg.hr` | Uprava, službena korespondencija, pravno |

### Aliasi — besplatni, padaju u `it@`

| Alias | Namjena |
|---|---|
| `dmarc@gnk-asg.hr` | **Postojeći** — prima DMARC izvještaje, mora ostati |
| `grupa@gnk-asg.hr` | Tema 2 — Grupa — tel. 385952068264 |
| `financije@gnk-asg.hr` | Tema 3 — Financijski pokazatelji — tel. 385952068265 |
| `tech@gnk-asg.hr` | Tema 4 — Technology & AI — tel. 385952068266 |
| `digital@gnk-asg.hr` | Tema 5 — Digital Assets — tel. 385952068267 |
| `news@gnk-asg.hr` | Tema 6 — Business News — tel. 385952068268 |
| `dokumenti@gnk-asg.hr` | Tema 7 — Dokumenti i kontakt — tel. 385952068269 |

### Aliasi — besplatni, padaju u `office@`

| Alias | Namjena |
|---|---|
| `legal@gnk-asg.hr` | **Postojeći** — EUIPO / DZIV predmet, odvjetnici |
| `ubo@gnk-asg.hr` | **Postojeći** — vlasnička struktura, compliance |
| `nermin.sefic@gnk-asg.hr` | Osobna poslovna adresa |
| `direktor@gnk-asg.hr` | Tema 1 — Direktor — tel. 385952068263 |

### Aliasi — besplatni, padaju u `info@`

| Alias | Namjena |
|---|---|
| `press@gnk-asg.hr` | Mediji, akreditacije |
| `kontakt@gnk-asg.hr` | Rezerva |

> **Ime se ne mijenja nijednoj postojećoj adresi.** `legal@` ostaje `legal@`,
> ne postaje `legal@`. Vanjski svijet ne smije primijetiti prebacivanje.

> **Pravilo:** alias NIJE licenca. Zoho ih ne naplaćuje. Ako ti nešto zatreba
> kao zasebna adresa, prvo pokušaj kao alias — tek ako netko treba vlastitu
> lozinku i vlastiti inbox, tek onda nova licenca.

---

## 2. ŠTO TREBAM OD TEBE PRIJE POČETKA

Ovo mi pošalji ili imaj pri ruci sutra ujutro:

- [x] ~~Popis adresa~~ — **poznato:** `legal@`, `info@`, `ubo@`, `it@`, `office@`
- [x] ~~DNS zapisi~~ — **provjereno**, vidi odjeljak 0a
- [ ] **Screenshot Cloudflare → Email → Email Routing → Routing rules** — kamo se svaka od 5 adresa danas prosljeđuje i je li uključen catch-all
- [ ] Pristup Cloudflare panelu (ti klikaš, ja diktiram)
- [ ] Kartica za Zoho plaćanje
- [ ] **Postojeći potpisi** — za svaku adresu koja ih ima
- [ ] **Postojeći automatski odgovori** — tekst, i uvjet pod kojim se šalju

> **Kako izvući potpis točno, a ne prepisivati ga:**
> otvori postojeći webmail → napiši sebi mail s potpisom → pošalji →
> otvori primljeni mail → **Prikaži izvornik / Show original** →
> kopiraj HTML dio i pošalji mi ga. Tako se zadrže font, boje, razmaci i logo.
> Ako samo prepišeš tekst, izgubi se formatiranje i logo.
>
> **Logo u potpisu:** ako je danas ugrađen kao privitak, u Zohou mora ići kao
> URL na sliku hostanu na gnk-asg.hr. Inače ga Gmail blokira i primatelj vidi
> praznu kockicu. To ja pripremim.

> **Zašto je popis postojećih adresa kritičan:** čim MX zapisi pokažu na Zoho,
> sva pošta ide tamo. Ako neka adresa danas pada negdje drugdje, a nije
> napravljena u Zohou, ta pošta se od tog trenutka **odbija**. Ništa se ne gubi
> unatrag, ali novi mailovi ne dolaze.

---

## 3. KORACI — REDOSLIJED SE NE MIJENJA

### KORAK 1 — Registracija Zoho računa (ti, ~5 min)

1. Idi na `zoho.com/mail` → **Business Email** → odaberi **Mail Lite**
2. **BITNO:** pri registraciji odaberi **EU datacentar**. Ovo se poslije ne može promijeniti bez seobe cijelog računa. Domena mora završiti na `zoho.eu`, ne `zoho.com`.
3. Odaberi **"Sign up with a domain I already own"**
4. Upiši `gnk-asg.hr`
5. Broj korisnika: **3**
6. Naplata: **godišnje** (mjesečno je skuplje po sandučiću)

**Zaustavi se ovdje.** Ne kreiraj još korisnike. Javi mi da si na koraku verifikacije domene.

---

### KORAK 2 — Verifikacija domene (zajedno, ~10 min)

Zoho će ti prikazati **TXT zapis za verifikaciju**. Izgleda otprilike ovako:

```
Tip:    TXT
Naziv:  @
Sadržaj: zoho-verification=zb________.zmverify.zoho.eu
```

U Cloudflareu:
1. `gnk-asg.hr` → **DNS** → **Records** → **Add record**
2. Type: `TXT`, Name: `@`, Content: zalijepi vrijednost iz Zoha
3. **Proxy status: DNS only** (siva oblačić ikona, ne narančasta)
4. Save
5. Vrati se u Zoho → **Verify**

> Ako verifikacija ne prođe iz prve, čekaj 5 minuta i probaj ponovno.
> Cloudflare je brz, ali nije trenutan.

---

### KORAK 3 — Kreiranje sandučića (ti, ~3 min)

Nakon verifikacije Zoho traži da napraviš prvi račun.

1. Prvi (admin) račun: **`it`** → `it@gnk-asg.hr`
2. **Add User** → **`info`** → `info@gnk-asg.hr`
3. **Add User** → **`office`** → `office@gnk-asg.hr`

Lozinke: generiraj duge i nasumične, spremi ih odmah. **Ne šalji mi ih.**
Ući će u zaključani PDF s vjerodajnicama kad sve bude gotovo.

---

> ### ⚠ IZMJENA REDOSLIJEDA
> Zbog `p=quarantine` u postojećem DMARC-u, **KORAK 6 (DKIM) izvodi se PRIJE
> KORAKA 4 (MX)**. Redoslijed sutra: 1 → 2 → 3 → **6 (DKIM)** → 5 (SPF) → 4 (MX) → 7 → 8.
> Ako MX prebacimo bez DKIM-a, sve što pošaljemo ide primatelju u karantenu.

### KORAK 4 — MX zapisi (zajedno, ~5 min) — OVO PREBACUJE POŠTU

**Obriši tri postojeća MX zapisa** (`route1/2/3.mx.cloudflare.net`) i **isključi
Cloudflare Email Routing** (Email → Email Routing → Disable). Screenshotaj rute
prije gašenja. Cloudflare i Zoho ne mogu istovremeno držati MX.

Zatim dodaj tri nova, sva **DNS only**:

| Type | Name | Mail server | Priority |
|---|---|---|---|
| MX | `@` | `mx.zoho.eu` | 10 |
| MX | `@` | `mx2.zoho.eu` | 20 |
| MX | `@` | `mx3.zoho.eu` | 50 |

> **Provjeri točne vrijednosti u Zoho panelu** (Control Panel → Domains → MX).
> Zoho ponekad daje regionalno drukčije hostname. Ako se ne poklapa s gornjim,
> uvijek vrijedi ono što piše u Zohou.

Od ovog trenutka pošta ide na Zoho. Propagacija: obično 15 min, do 4 h.

---

### KORAK 5 — SPF (zajedno, ~3 min)

**Smije postojati samo JEDAN SPF zapis na domeni.** Dva SPF zapisa = oba se ignoriraju = sve ide u spam. Ako već postoji TXT koji počinje s `v=spf1`, ne dodaj novi — **uredi postojeći**.

| Type | Name | Content |
|---|---|---|
| TXT | `@` | `v=spf1 include:zoho.eu ~all` |

**Postojeći zapis glasi** `v=spf1 include:_spf.mx.cloudflare.net ~all` →
**uredi ga** i zamijeni sadržaj gornjim. Ne dodavaj novi.

Ako u budućnosti dodamo newsletter servis, spajamo ga u isti zapis:
`v=spf1 include:zoho.eu include:_spf.drugiservis.com ~all`

---

### KORAK 6 — DKIM (zajedno, ~5 min)

DKIM potpisuje odlazne mailove. Bez njega bot notifikacije završavaju u spamu.

U Zohou: **Control Panel → Email Configuration → DKIM → Add → Selector: `zoho`**

Zoho generira dugi javni ključ. Kopiraj ga i u Cloudflare stavi:

| Type | Name | Content |
|---|---|---|
| TXT | `zoho._domainkey` | `v=DKIM1; k=rsa; p=MIGfMA0GCSq...` (cijela vrijednost iz Zoha) |

Zatim u Zohou klikni **Verify** pored DKIM zapisa.

> Ključ je dugačak i lako se odreže pri kopiranju. Kopiraj cijelu vrijednost.

---

### KORAK 7 — DMARC (zajedno, ~2 min)

**DMARC već postoji i već je na `p=quarantine`.** Ne diramo ga — postavka je
dobra i `dmarc@gnk-asg.hr` već prikuplja izvještaje.

Jedini uvjet: `dmarc@` mora biti alias na `it@` (Korak 8), inače izvještaji
odbijaju od dana prebacivanja.

Za dva tjedna, kad izvještaji pokažu da SPF i DKIM prolaze čisto, razmatramo
`p=reject`.

---

### KORAK 8 — Aliasi (ti, ~10 min)

**Control Panel → Users → [odaberi korisnika] → Mail Alias → Add**

Na `it@`: `dmarc`, `grupa`, `financije`, `tech`, `digital`, `news`, `dokumenti`
Na `office@`: `legal`, `ubo`, `nermin.sefic`, `direktor`
Na `info@`: `press`, `kontakt`

**Prvo napravi `legal`, `ubo` i `dmarc`** — to su postojeće adrese koje moraju
raditi od prve minute. Ostalo su nove i mogu čekati.

Provjeri da ti Zoho ne pokušava naplatiti — ako traži licencu, kreiraš korisnika umjesto aliasa. Vrati se korak nazad.

---

### KORAK 8b — Potpisi i automatski odgovori (zajedno, ~15 min)

Ovo se **ne prenosi automatski**. Zoho startuje s praznim potpisima.

#### Potpisi

**Settings → Mail → Signatures → New Signature**

Zoho podržava **zaseban potpis po adresi**, uključujući aliase. To znači:

| Potpis | Koristi se za |
|---|---|
| Osnovni — Nermin Sefić, direktor | `office@`, `nermin.sefic@`, `direktor@`, `uprava@` |
| Opći — naziv društva, bez osobnog imena | `info@`, `kontakt@` |
| Legal — bez telefona, s punim nazivom društva | `legal@` |
| Press — s poveznicom na medijski kit | `press@` |
| Sustavni — kratak, bez fotografije | `it@` i automatske poruke bota |

Za svaki potpis: **Settings → Mail → Signatures → Associate with** → odaberi
adresu ili alias. Bez ovog koraka svi aliasi koriste isti zadani potpis.

> **HTML potpis:** u editoru klikni ikonu `<>` i zalijepi HTML izvornik.
> Ne lijepi vizualno iz Worda ili starog webmaila — povlači smeće za sobom
> i raspadne se kod primatelja.

#### Automatski odgovori

Zoho ima dva odvojena mehanizma, i biraš prema namjeri:

**1. Out of Office** — *Settings → Out of Office*
Za odsutnost. Ima datumski raspon, i može se ograničiti na kontakte iz adresara
(preporučeno — inače odgovara i spamu i newsletterima).

**2. Filteri s auto-odgovorom** — *Settings → Filters → New Filter*
Za trajne tematske odgovore. Ovo je ono što nam treba za 7 tema:

| Filter | Uvjet | Akcija |
|---|---|---|
| Direktor | `To` sadrži `direktor@` | Auto-odgovor: potvrda + telefon 385952068263 (na `office@`) |
| Grupa | `To` sadrži `grupa@` | Auto-odgovor + telefon 385952068264 |
| Financije | `To` sadrži `financije@` | Auto-odgovor + telefon 385952068265 |
| Tech & AI | `To` sadrži `tech@` | Auto-odgovor + telefon 385952068266 |
| Digital Assets | `To` sadrži `digital@` | Auto-odgovor + telefon 385952068267 |
| Business News | `To` sadrži `news@` | Auto-odgovor + telefon 385952068268 |
| Dokumenti | `To` sadrži `dokumenti@` | Auto-odgovor + telefon 385952068269 |

Tekstovi tih sedam odgovora moraju se poklapati s tekstovima u WhatsApp
izborniku — ista informacija, isti ton, bez obzira javlja li se netko mailom
ili porukom. Te tekstove pripremam ja, iz postojećeg izbornika bota.

> **Zaštita od petlje:** Zoho po istom pošiljatelju šalje auto-odgovor jednom
> u 24 h. Ne diraj to. Bez toga dva automatska sustava mogu ući u beskonačnu
> razmjenu.

#### Provjera

- [ ] Pošalji test mail na svaki alias s vanjske adrese (Gmail)
- [ ] Provjeri da je stigao **točan** auto-odgovor, ne zadani
- [ ] Odgovori s tog aliasa i provjeri da je potpis **točan** i da se logo vidi
- [ ] Provjeri kako potpis izgleda na mobitelu — tablični potpisi se često raspadnu

---

### KORAK 9 — SMTP za bota i GitHub Actions (ja pripremam, ti unosiš)

Da lozinka glavnog računa ne ide u repo, radimo **app-specific password**:

**Zoho → My Account → Security → App Passwords → Generate New**
Naziv: `gnk-asg-bot`

Postavke koje idu u konfiguraciju:

```
SMTP host:  smtp.zoho.eu
SMTP port:  587   (STARTTLS)   ili   465 (SSL)
Korisnik:   it@gnk-asg.hr
Lozinka:    <app password, NE glavna lozinka>

IMAP host:  imap.zoho.eu
IMAP port:  993 (SSL)
```

**Secrets koji idu u oba repoa** (beckuphome i masarykova), po istom obrascu kao u `docs/BLOG_I_TAJNE.md` — samo imena, nikad vrijednosti:

| Ime secreta | Sadržaj |
|---|---|
| `SMTP_HOST` | smtp.zoho.eu |
| `SMTP_PORT` | 587 |
| `SMTP_USER` | it@gnk-asg.hr |
| `SMTP_PASS` | app password |
| `MAIL_FROM` | it@gnk-asg.hr |
| `MAIL_ADMIN` | it@gnk-asg.hr |

---

### KORAK 10 — Superhuman i Fyxer (ti, ~5 min)

Tek nakon što IMAP radi:
1. U Zohou: **Control Panel → Mail → IMAP Access → Enable** za oba korisnika
2. Spoji Superhuman / Fyxer na `nermin.sefic@gnk-asg.hr` preko IMAP-a
3. Za prijavu koristi **app password**, ne glavnu lozinku

Ovo je AI sloj — zato ne plaćamo Zoho Zia ni Proton.

---

### KORAK 11 — Provjera (ja, ~10 min)

Kad sve stoji, pokrećem provjeru:

- SPF, DKIM, DMARC prolaze
- Test mail na Gmail — dolazi li u inbox ili spam
- Test mail sa svakog aliasa — pada li u pravi sandučić
- SMTP test iz GitHub Actiona
- `mail-tester.com` ocjena — cilj **10/10**

Ako nešto ne prolazi, popravlja se isti dan.

---

## 4. RIZICI I ŠTO AKO POĐE PO ZLU

| Rizik | Znak | Rješenje |
|---|---|---|
| Pošta ne dolazi | Ništa u inboxu 30 min nakon MX promjene | Provjeri jesu li MX zapisi **DNS only**, ne proxied |
| Sve ide u spam | Gmail baca u spam | Gotovo uvijek dva SPF zapisa ili odrezan DKIM ključ |
| Postojeća adresa prestala raditi | Netko javi da mu se mail vraća | Napravi tu adresu kao alias u Zohou, radi odmah |
| Bot ne šalje | GitHub Action pada na SMTP | Koristi se glavna lozinka umjesto app passworda |
| Kriva regija | Zoho traži `zoho.com` MX umjesto `zoho.eu` | Odabran krivi datacentar — treba novi račun, zato je u Koraku 1 podebljano |

**Povratak unatrag:** ako sve pođe po zlu, vraćanje starih MX zapisa u
Cloudflareu vraća stanje u roku 15 minuta. Zato ih screenshotamo prije brisanja.

---

## 5. NAKON POSTAVLJANJA

- [ ] Zaključani PDF s vjerodajnicama — **tek kad su svi tokeni na mjestu**, ne prije
- [ ] Secrets uneseni u **oba** repoa (beckuphome + masarykova)
- [ ] Kontakt forma na gnk-asg.hr prebačena na `info@`
- [ ] Provjereno da se `nermin.sefic@` može koristiti kao **From** adresa iz `office@` sandučića
- [ ] WhatsApp bot prebačen s postojećeg rutiranja na novi SMTP
- [ ] Adrese objavljene na stranici uz svaku od 7 tema, uz pripadajuće telefone
- [ ] Za 14 dana: DMARC s `p=none` na `p=quarantine`
