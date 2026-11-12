# AKTUAL MEDIA – vanjska distribucija (4 + opcionalni Telegram)

## Provjereni kanali
- Blogger (nermin-sefic.blogspot.com), DEV.to, Tumblr i **Telegraph** vode se u jedinstvenom `.github/workflows/blog-mirror-publish.yml` s trajnim receiptima na `automation/blog-mirror-state`.
- **Telegram nije Telegraph**. Telegram je dodatni, opcionalni kanal; ne predstavlja se kao povezan dok se ne potvrde bot i odredište.

## Telegram aktivacija
U GitHub Actions secrets namijenjene aktivnom repozitoriju postavljaju se `TELEGRAM_BOT_TOKEN` i `TELEGRAM_CHAT_ID` (numerički chat ID ili javni kanal oblika `@kanal`). Bot mora imati dopuštenje za objavljivanje na odredištu. Nikad ne dodavati token u kod, javni state, commit ili URL objave.

Zajednički writer ostaje **manual-only**, s obaveznom potvrdom `confirm_external_distribution=true` i repository variable `GNK_ASG_EXTERNAL_DISTRIBUTION=true`. Novi Telegram korak izvršava se samo ako su oba Telegram secreta prisutna. U nedostatku vjerodajnica, četiri postojeća kanala ostaju nepromijenjena.

Telegram: šalje do 3 novija članka po pokretanju (maks. 5, samo zadnjih 7 dana); objave moraju imati stvarni datum, status objavljenog sadržaja, ispravnu kanonsku poveznicu na `https://gnk-asg.hr` i HTTP 200. Telegram šalje naslov, kratki opis i poveznicu; NE kopira autorska prava trećih izvora ni pripisuje sve članke Nerminu Sefiću. Prima li API odgovor bez potvrđenog statusa, označava ga za ručnu provjeru umjesto slijepog ponovnog slanja.

Povijest objavljivanja zasebna je za svaki kanal; Telegram receipt `apps/portal/data/telegram-distribution/published.json` zapisuje se na `automation/blog-mirror-state`, ne na produkcijski `main`. Tijek ne zaobilazi automatske ili uredničke release gateove. Potvrda GitHub Actions izvršavanja NIJE potvrda stvarne javne objave bez provjerljivog pružateljeva odgovora.

## Nije uključeno ovim PR-om
Nema neposrednog Telegram objavljivanja, nema inicijalizacije Telegram bota niti automatskog dnevnog slanja bez eksplicitne promjene važećih sigurnosnih pravila. Nema promjene na produkcijskom portalu ili domenskoj SEO konfiguraciji.
