# Inventar Workera — gnk-asg.hr
Izvor: `workers/*/wrangler.toml` na `main`, commit c77494e, 29.07.2026.
Metoda: čitanje konfiguracije, bez ijednog poziva prema produkciji.

## Sažetak
- 14 Workera u repozitoriju
- 11 ih ima rute u konfiguraciji
- **3 nemaju nijednu rutu**
- **`gnk-asg-editorial-center` ne postoji** — ni mapa, ni konfiguracija, ni spomen niza `editorial-public-health` u 6.609 datoteka

## Workeri bez ijedne rute
| Worker | Napomena |
|---|---|
| `gnk-asg-direct-operator` | Najveća mapa u `workers/`, kod postoji, nije vezan |
| `gnk-asg-mail-center-worker` | Postoji workflow `deploy-mail-center-worker-v2.yml` — bitno za mail |
| `gnk-asg-operator-center` | Kod postoji, nije vezan |

Ako te rute ipak rade u produkciji, znači da su vezane ručno u Cloudflare panelu,
izvan repozitorija. To je razilaženje konfiguracije i stvarnog stanja — kod u repozitoriju
prestaje biti izvor istine.

## Ograničenje ove provjere
Metode se prepoznaju po cijelom Workeru, ne po pojedinoj ruti. Worker koji ima
i GET i POST rute bit će označen po najstrožoj. Za točnu provjeru po ruti treba
pogledati usmjeravanje unutar `src/index.js`.

## Tri sporne rute
| Ruta | Nalaz iz konfiguracije |
|---|---|
| `/api/editorial-public-health` | Worker ne postoji u repozitoriju. Nije stvar metode ni putanje. |
| `/app` | Uredno vezan na 4 rute (`/app`, `/app/*`, obje domene). Kod obrađuje obje varijante. 404 znači da Worker nije objavljen ili rute nisu aktivne u zoni. |
| `/api/mail-schedule` | Ruta postoji, a kod obrađuje GET, POST i OPTIONS. Teza o krivoj metodi time slabi — 404 na GET vjerojatnije znači da ruta nije aktivna ili da GET grana vraća 404 za tu putanju. |
