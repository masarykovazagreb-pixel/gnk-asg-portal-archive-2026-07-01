# GNK ASG — Raspored automatiziranih procesa (za koordinaciju, ne za izmjenu)

Svrha: da se ručni rad (prijevodi, PR-ovi, merge, deploy) planira u prozorima
kad automatski procesi NE pišu u `main`, kako bi se izbjegli git sudari.

## Svaki sat, po minuti

| Minuta | Proces | Piše u main? |
|---|---|---|
| :05 | Refresh index live data | DA |
| :10 | Market Pulse Refresh | DA |
| :17 | GNK ASG News Refresh | DA (svaka 2h) |
| :17 | SEO and News Visibility Cycle | DA (svaka 2h) |
| :20 | Publish Scheduled Editorial Content | DA |
| :20 | Refresh GNKC Index | DA |
| :30 | Blog Mirror Publish | DA |
| :45 | Dev.to Mirror Preview | ne (read-only) |

## Rjeđi ciklusi

| Kad | Proces |
|---|---|
| svaka 3h, :25 | Macro Market Data Refresh |
| svaka 4h | Mirror Sync to Masarykova Backup |
| svakih 6h | Generate Digital Workforce Newsroom Pages |
| 04:40 | SEO Audit Refresh |
| 05:35 | Sync Webshop Products |
| 06:40 | Provjera workera |
| 07:00 | LinkedIn Daily Post Rotation (preview only) |
| 04/10/16h | Site Health Check |
| 07/08/14/15/19/20h | GNK ASG News V14 Lifecycle |
| 07/14/19h | GNK News V14 Refresh |

## Preporučeni prozor za ručni rad (prijevodi, PR, merge, deploy)

**Minute :35–:00 (prvih 5 i zadnjih 25 minuta svakog sata)** — najmanje automatiziranog pisanja u main u tom rasponu. Nije strogo pravilo, samo smanjuje vjerojatnost sudara.

## VAŽNO — status koji NIJE promijenjen ovim dokumentom

- `objavi-15-dnevno.yml` — i dalje **neaktivan** (priprema, `if: false`), nije uključen ovim dokumentom niti bilo kojim mojim radom danas.
- Dev.to i Tumblr **live objave ostaju ručne**, pokrenute samo eksplicitnim dispatchom, ne rasporedom — u skladu s pravilom da se live tok ne uključuje bez posebnog odobrenja.
- Nijedna nova automatizacija nije dodana niti aktivirana ovim dokumentom — ovo je samo pregled postojećeg stanja radi koordinacije.
