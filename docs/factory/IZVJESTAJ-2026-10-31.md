# Izvještaj 31. 10. 2026. — rezultati 50 zadataka

Mjerenja su iz `artifacts/factory/quality-scan.json` (`scripts/factory/quality_scan_v1.py`, 10.030 stranica), `artifacts/factory/image-quality.json` i `artifacts/autonomy-status.json`. Popis zadataka i statusi: `docs/factory/ZADACI-2026-10-31.md`.

## 1. Incident: `main` je resetiran

- `origin/main` je 31. 10. u 05:54 UTC na `8fa34805`, jedan commit bez roditelja.
- PR #380 (merge `b0751a079`, 30. 10. 19:05 UTC) više nije u `main`-u. Naš rad je sačuvan na `arena/af7fc5d1-…` (`e2322eaad4f`) i ovo je njegova baza.
- Uzrok nije utvrđen (iz sandboxa nema pristupa logovima). Ovo se već ponovilo više puta.
- **Odluka vlasnika:** kako dalje s `main`-om. Ne diram ga.

## 2. Pogon i CI

| Workflow | Stanje | Uzrok | Učinak |
|---|---|---|---|
| `sites-deploy` | pao | `exchange.json` i `sitemap.xml` zastarjeli u commitanom stanju | ispravljeno (12 datoteka regenerirano) |
| `knowledge-center-contract` | pao na PR-u | generator ne proizvodi hashtag redak i radio blok koje dodaje standard | ispravljeno (korak `apply_standard` + radio) |
| `region-daily` (zakazano) | otkazano 19:08, 23:37, 05:20 | 23 workflowa dijele `concurrency: gnk-asg-main-mutation` s `cancel-in-progress: false`; GitHub drži samo jedan čekajući run, pa se zakazani međusobno otkazuju | **izvršeno (odobreno)**: `region-daily` u grupi `gnk-asg-region-daily`. `gallery-sync` i `worker-groups-sync` nisu mijenjani (gate „Vlasništvo automatizacija“ ih prijavljuje kao neregistrirane pisce; čeka odluku) |
| `GNK ASG Automation SLA Watchdog` | pao | provjerava živu svježinu na produkciji | blokirano (nema pristupa produkciji iz sandboxa) |
| `Deploy Admin Auth V6` | kasniji run [41200680780](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/41200680780) uspješan | autorizacija, deploy i produkcijska provjera prošli; run na main-u (`headSha` 29c3e8c837678d74c7005c9db7fd860ebae15d40) | **izvršeno za taj run** |
| `autonomija-365` | pao | tvrdi kriterij `kanali-arhiva`: Kairo 289 < 300 | djelomično (vidi 3) |

**Prijedlog za concurrency (odluka vlasnika):** zakazani dnevni ciklusi trebaju vlastitu grupu (npr. `gnk-asg-region-daily`), ali to može stvoriti trke pri pushu na `main`. Treba ih najprije uskladiti da svaki push ponovi `pull --rebase`. Ne mijenjam sam, jer utječe na produkciju.

## 3. Kairo (tvrdi kriterij)

- Kriterij: svaki gradski kanal ima barem 300 tekstova u arhivi. Stanje 31. 10. u 08:19 UTC: Kairo **302** (kriterij ispunjen), ostali kanali 376–460. Mjerenje autonomije (`build-autonomy-v1.mjs --check`): 7 ok, 1 watch (`news-svjezina`), 0 fail.
- Izvori u kanalu (9): Mada Masr, Egypt Independent, Youm7, Al-Masry Al-Youm, Al Jazeera Arabic, Sky News Arabia, Al-Ahram, Ahram Online (English), Daily News Egypt (English).
- Provjera 31. 10.: Youm7 RSS bez stavki; Ahram Online (English) RSS vraća 404; Al-Masry Al-Youm nema feed. Ostali izvori nisu ponovno provjereni.
- **Dodan:** Egypt Independent (`https://www.egyptindependent.com/feed/`), feed je živ.
- Broj će rasti tek kad dnevni ciklus radi redovito (vidi 2). Dok se to ne riješi, kriterij ostaje pao.

## 4. Kvaliteta stranica (10.030 stranica)

| Mjera | Broj | Napomena |
|---|---|---|
| bez `lang` | 2 | `animacija/index.html` (1,5 MB), `app/index.html` (400 KB): noindex, nisu u sitemapu. **Nisu artefakti:** `/app/` je živa aplikacija na koju vode `contact/` i `preuzimanja/`, a `/animacija/` je linkan s `preuzimanja/`. **Nisu obrisani.** Ispravka: dodati `lang` i `title`. |
| bez `<title>` | 1 | `app/index.html` (isti artefakt) |
| bez meta opisa | 15 | za pregled |
| kratki opis (<50 znakova) | 24 | uglavnom 404 i interne stranice kanala |
| duplikat naslova | 228 stranica, 91 različit naslov | popis: `artifacts/factory/quality-scan.json` |
| duplikat opisa | 214 stranica | za pregled |
| bez canonicala | 0 | admin/operator stranice su noindex (namjerno) |
| neispravan JSON-LD | 0 | `visual-index` JSON-LD je dinamički, u JS-u (lažni pozitiv skenera, ispravljeno) |
| naslov (h1) >60 znakova | 5.676 | najviše: `podijeli` 575, `bukurest` 405, `sarajevo` 383. Odluka o politici naslova čeka vlasnika. |
| radio-oznaka „AKTUAL MEDIA RADIO“ | 9.068 stranica | 9.065 od toga zbog našeg promotivnog bloka (`aria-label`). Ranije se računalo 24 stranice. |

Napomena: ovo mjeri h1, a ranija brojka 8.440 stranica s naslovom >60 mjerila je `<title>`; to nisu iste mjere.

## 4a. Ponavljanja (`artifacts/factory/audit.json`, 9.021 indeksiranih stranica)

- Vlasnički hashtagovi: 9.021 od 9.021 stranica. Obrnute varijante: 7.382 stranice (odluka vlasnika „ostavi kako jest“).
- Ponavljajući odlomci (≥50 stranica): 300.
- Najčešći: hashtag redak `#AktualMediaRadio #NerminSefić #NerminSefic #AktualMedia #GNKASG` na 9.019 stranica (vidi pitanje o `#AktualMediaRadio` u §7); tekst o audio streamovima na 6.849 stranica (radio player); tekst „Ovaj komentar sastavio je redakcijski bot …“ na 2.951 stranici.
- Nedostajući entitetski sloj: 0. Neispravne lokalne slike: 0. Neispravne interne poveznice: 0.
- Predložak „redakcijski bot“ je ponavljajući sadržaj koji Google može tretirati kao tanak. Prijedlog: varirati ili smanjiti na jednu rečenicu (odluka vlasnika, jer mijenja javni tekst).

## 5. Slike (`artifacts/factory/image-quality.json`)

Pillow ne može otvoriti dvije datoteke: `apps/portal/assets/editorial/nermin-sefic-gnk-asg-ulaganje-pravne-prepreke-20261006.webp` i `…-v2.webp` (oko 15 KB, zaglavlje nije WEBP). Nijedna stranica ih ne koristi (0 referenci), pa nisu vidljive. Revizor `audit_portal.py` provjerava samo postojanje datoteke, pa ih nije uhvatio. **Obrisano 31. 10. (odobrenje vlasnika).**

Označeno 131 slika: premala 22, pretežka 28, duplikat 56, nečitljiva 5, tamno (provjeri) 20. Za zamjenu treba ručni pregled i odluka o izvorima, pa nisu mijenjane.

## 6. W1 susjedi (uvjeti izvora)

Iz pretrage (isječci, nisu pročitani puni uvjeti). Nijedna država nije odobrena za javnu objavu.

| Država | Nalaz | Status |
|---|---|---|
| Austrija | ORF: nekomercijalno, samo naslovi | blokirano |
| Crna Gora | RTCG: javni servis, pravilnik o arhivi, kopiranje zabranjeno bez dozvole | blokirano |
| Grčka | Ekathimerini: osobna i nekomercijalna upotreba; Kathimerini RSS nije službeni | blokirano |
| Albanija | nije pronađen službeni RSS s uvjetima (Monitor.al prijavljen kao neispravan) | nije provjereno |
| Kosovo | kandidati: Balkan Insight, RFE/RL (uvjeti nisu pročitani) | pending |
| Sjeverna Makedonija | MIA nema pronađen RSS (samo X račun) | pending |
| Turska | Anadolu Agency live RSS postoji; uvjeti nisu pročitani, agencija obično ograničava reprodukciju | pending |

Zapisano u `config/world-sources-v1.json`. Validator svjetskog registra: exit 0.

## 7. Radio

- Stanice trećih strana: 11 SomaFM streamova (ice1 ×6, ice2 ×2, ice4 ×1, ice5 ×1, ice6 ×1) i Zeno (`stream.zeno.fm/f3wvbbqmdg8uv`). Nema tvrdnji o vlasništvu.
- Nacrti za distribuciju (10): svi nose `#NerminSefić` i `#NerminSefic`, nema sumnjivih tvrdnji.
- **Pitanje vlasniku:** nacrti nose `#AktualMediaRadio`, koji nije u popisu odobrenih hashtagova (`#NerminSefić`, `#NerminSefic`, `#AktualMedia`, `#GNKASG`, `#MrezaIzdanja`). Zadržati ili maknuti?
- **Pitanje vlasniku:** radio-oznaka na 9.068 stranica (vidi 4).

## 8. Pripremljenost kanala (`preparing`)

Washington, Brasília, Canberra: nema zapisa u `apps/region/channels.json`, nema izvora. Za svaki je potrebno: zapis kanala, najmanje dva RSS izvora s provjerenim uvjetima, urednik i hashtagovi.

## 9. Repozitorij

- `.git` je 3,6 GB. Najveći su povijesni blobovi `image-sitemap.xml` (35–73 MB po verziji) iz vremena prije sharding-a. Trenutni shardovi su ~21 MB (ispod 50 MB), a indeks 464 bajta.
- Brisanje povijesti zahtijeva force-push, pa nije napravljeno. Preporuka: od sada generirani sitemapovi ne idu u Git (ili u LFS).

## 10. Odluke

Stanje 31. 10. (kasnije): Kairo 302, autonomija 0 fail, `region-daily` push-a u granu (ciklus 09:00 uspješan).

Riješeno 31. 10. (odobrenje vlasnika):
- Obrisane dvije neispravne WebP datoteke (0 referenci).
- `region-daily` izdvojen u grupu `gnk-asg-region-daily`. Rizik: `gallery-sync`, `tjednik-daily` i `worker-groups-sync` push-aju bez rebasea i mogu pasti pri sudaru.
- `#AktualMediaRadio` zadržan i zabilježen u `approved_mentions.json`.
- `gallery-sync` i `worker-groups-sync`: push bez rebasea ostaje. Sudar s `region-daily` je moguć. Za promjenu treba registrirati oba workflowa u allowlisti pisaca na `main`-u (odluka vlasnika). `tjednik-daily` ima vlastitu zaštitu.

Nije izvršeno:
- `Deploy Admin Auth V6` za `de9e567` nije pokrenut jer taj commit nije na `main`-u. U međuvremenu je uspješno izvršen zaseban produkcijski run 41200680780 na `main`-u; to nije dokaz da je ova grana spojena.
- `animacija/` i `app/` nisu obrisani (žive stranice). Dodavanje `lang` i `title` čeka vaš OK.

Još čeka vlasnika:
- Radio oznaka „AKTUAL MEDIA RADIO“ (9.484 stranice u zadnjem skeniranju): ostaje kako jest dok ne odlučite.

1. Što s `main`-om (reset 31. 10.) i kako spojiti rad.
4. `animacija/` i `app/`: ispraviti `lang` i `title` ili ostaviti (ne brisati).
5. Politika naslova (h1 >60 znakova) i kratkih opisa.
6. Radio-oznaka na 9.068 stranica.
7. Pravna potvrda za W1 izvore (Albanija, Kosovo, Sjeverna Makedonija, Turska).
8. Kanali za Washington, Brasília, Canberra.

## 11. Pouzdanost skenera metapodataka

Skener `quality_scan_v1.py` sada koristi HTML parser umjesto traženja točno oblikovanih oznaka regularnim izrazima. Prepoznaje različit redoslijed atributa, jednostruke navodnike, HTML entitete i više vrijednosti atributa `rel`; komentari i tekst JavaScripta ne računaju se kao oznake stranice. Prijavljuje nevaljani statični JSON-LD bez obzira na prvi znak. Dodani su regresijski testovi u `test-all`.

Novo mjerenje obuhvaća 10.444 lokalne HTML stranice u `apps/portal` (uključujući neindeksirane); nije provjera živih stranica drugih domena. Pronađeno je 2 stranice bez nepraznog `lang`, 1 bez naslova, 14 bez opisa, 0 indeksiranih bez prepoznatog canonicala i 0 nevaljanih JSON-LD blokova. Broj H1 naslova duljih od 60 znakova je 5.955. Brojke se zbog drugačijeg načina čitanja ne mogu bez ograde uspoređivati sa starijim skeniranjem. Skener je samo alat za inventuru; nije dokaz potpune SEO ispravnosti ni razlog za automatsko skraćivanje naslova.
