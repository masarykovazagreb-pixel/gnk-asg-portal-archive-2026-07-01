# SLIKE ZA KOLUMNE — ciklus 2
## Smjer potvrđen pretragom, odabir ide isključivo kroz izvore s licencom

Ništa objavljeno. Ovo je uputa za konačan odabir slike po kolumni.

---

## Pravilo koje vrijedi ovdje kao i za komentare

Slike pronađene web pretragom (prikazane u razgovoru) pokazuju **smjer i
kadar** — potvrđuju da je zamišljeni prizor stvaran i da se može naći. One
same **ne smiju ući u produkciju**. Dio su tuđih članaka, marketinških
stranica i press arhiva bez jasne licence.

Konačna slika za svaku kolumnu ide isključivo kroz:
1. **Pexels** — ključ je već testiran i potvrđen radnim (v6 laboratorija)
2. **Openverse** ili **Wikimedia Commons** — ako Pexels nema dovoljno
   specifičan kadar, ovi vraćaju i podatak o licenci i autoru

Svaka slika mora nositi vidljivu atribuciju (fotograf + poveznica na izvor),
u skladu s uvjetima koje je Pexels postavio pri odobrenju ključa.

---

## Tražiti u Pexelsu, po kolumni

**Kolumna 1 — Indija:** `mobile payment street market`, `QR code payment
india`, `smartphone banking asia` — kadar treba pokazivati ruku s telefonom
i QR kodom, ne opću ilustraciju banke

**Kolumna 2 — Afrika:** `mobile money africa`, `market vendor phone`,
`african entrepreneur smartphone` — izbjegavati klišej "sretni farmer s
telefonom"; tražiti tržnicu, urbani kadar

**Kolumna 3 — Brazil:** `hydroelectric dam`, `solar panels brazil`,
`renewable energy south america`, `wind turbines landscape` — konkretna
infrastruktura, ne apstraktna "zelena energija" grafika

---

## Ako Pexels ne vrati dovoljno specifičan kadar

Prijeći na Openverse s istim upitima. Openverse vraća polje `license` i
`creator` uz svaku sliku — oboje se sprema uz sliku u galeriji (vidi
raniju napomenu o galeriji sa slobodnom licencom), ne samo sama datoteka.

## Format zapisa slike u galeriji

```
{ url, licenca, autor, izvor_poveznica, koristi_se_za: "kolumna-2-ciklus2-indija" }
```

Ovo omogućuje da se atribucija ispisuje automatski uz sliku na stranici,
bez ručnog upisivanja svaki put.
