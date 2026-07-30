# DISTRIBUCIJA KOLUMNI — besplatna mjesta, SEO prioritet
Provjereno 30.07.2026. Ništa objavljeno, ovo je referenca za odluku.

## Ručno, ali najjače za osobni brend i Google
| Platforma | Zašto | Ograničenje |
|---|---|---|
| LinkedIn Articles | Najviša domenska ovlast na popisu; cilja poslovne odlučitelje izravno | Nema javnog API-ja za objavu — ručno |
| Medium | Jaka za dulje tekstove; Import Story trik: objavi prvo na Dev.to, uvezi na Medium, kanonska poveznica ide natrag | Novi API tokeni se više ne izdaju od 2023. |

## Kandidati za automatski lanac (imaju živ API)
| Platforma | Zašto | Napomena |
|---|---|---|
| Dev.to | Živ REST API, brzo indeksiranje | Prvo objavi ovdje pa uvezi na Medium radi kanonske poveznice |
| WordPress.com (besplatni plan) | Živ REST API, visoka ovlast | Drugi kandidat uz Dev.to |

## Regionalno, uz teme kolumni
- YourStory — indijska poslovna platforma, za kolumnu o Indiji specifično

## Izbjegavati
Masovno slanje na desetke niskokvalitetnih "article submission" direktorija —
dupliciran sadržaj na takvim mjestima može naštetiti rangiranju umjesto da
pomogne. Kvaliteta i relevantnost platforme nose više težine od broja objava.

## Redoslijed kad se odobri
1. LinkedIn i Medium ostaju ručni, kontrolira ih osoba, ne skripta
2. Dev.to i WordPress.com su kandidati za isti automatizirani lanac kao
   postojeća blog objava (vidi api-lab/automatizam/) — dodaju se kao dodatni
   korak u kolumne-publish-v1.mjs, ne kao novi sustav
