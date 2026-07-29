# GNK ASG — ikone aplikacije

Napravljene iz **ispravnog kanonskog logotipa** (`gnk-asg-canonical-logo.png`,
117 × 120 px, prozirna pozadina).

## Datoteke

| Datoteka | Veličina | Pozadina | Za što |
|---|---|---|---|
| `icon-512.png` | 512 × 512 | **prozirna** | PWA, zaslon učitavanja |
| `icon-192.png` | 192 × 192 | **prozirna** | PWA, popis aplikacija |
| `icon-maskable-512.png` | 512 × 512 | puna, `#0b1220` | Android adaptivna ikona |
| `icon-maskable-192.png` | 192 × 192 | puna, `#0b1220` | Android adaptivna ikona |
| `apple-touch-icon.png` | 180 × 180 | puna, `#0b1220` | iOS početni zaslon |
| `apple-touch-icon-transparent.png` | 180 × 180 | prozirna | rezerva, ako se traži prozirna |
| `favicon-16/32/48.png` | — | prozirna | preglednik |
| `favicon.ico` | 16/32/48 | prozirna | stariji preglednici |
| `gnk-asg-canonical-logo.png` | 117 × 120 | prozirna | izvornik |

## Zašto dvije nisu prozirne

**Maskable** — Android reže do 20 % s ruba i primjenjuje krug, kvadrat ili
kapljicu ovisno o proizvođaču. Prozirna maskable ikona dala bi crne uglove na
svijetloj temi. Zato pune pozadine, s motivom u središnjih 58 % pa ostaje cijel
u svakom obliku rezanja.

**Apple touch** — iOS ne podržava prozirnost na početnom zaslonu; prozirne
dijelove pretvara u crno. Priložena je i prozirna inačica ako je ipak trebate.

Sve ostale su prozirne, kako je traženo — rade i na tamnoj i na svijetloj
podlozi.

## Ograničenje koje treba znati

Izvorni logotip je **117 × 120 px**. Za ikonu od 512 px potrebno je uvećanje
4,3 puta, pa su rubovi mekši nego što bi bili iz vektora. Na 192 px i manje
razlika se ne vidi.

Ako imate logotip u većoj razlučivosti ili kao vektor, pošaljite ga i ikone se
pregeneriraju oštrije.

## Ugradnja

```json
"icons": [
  { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
  { "src": "icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
  { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
]
```

```html
<link rel="icon" href="icons/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
```
