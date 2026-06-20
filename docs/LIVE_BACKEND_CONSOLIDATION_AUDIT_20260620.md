# GNK ASG live backend consolidation audit

Datum: 20. lipnja 2026.
Grana: `experience-ai-live-overview`
Produkcija promijenjena: NE
Cloudflare deploy izvršen: NE

## Sažetak

GNK ASG trenutačno ima više aktivnih Cloudflare Workera i nekoliko razvojnih/preview slojeva. Glavni problem nije manjak backenda, nego preklapanje odgovornosti, višestruki fallback handleri, različiti KV ključevi za isti sadržaj i legacy blokade koje mogu onemogućiti noviji refresh kod.

## Produkcijske backend uloge

1. `gnk-asg-direct-operator`
   - široka ruta `gnk-asg.hr/*` i `www.gnk-asg.hr/*`
   - frontend fallback, operator API, KV/D1/R2, mail compatibility i public data compatibility

2. `gnk-asg-contact-api`
   - kontakt forma, mailboxes, operator mail i potpisi
   - KV, R2 i EMAIL

3. `gnk-asg-ai-assist-worker`
   - `/api/ai-assist*`
   - AI binding

4. `gnk-asg-auto-editor`
   - `/auto-editor*`, `/api/auto-editor*`, auto-editor feedovi i automatske article rute
   - KV i cron

5. `gnk-asg-publish-operator`
   - custom domain `publish.gnk-asg.hr`
   - validacija 500+ riječi, deduplikacija i upis publikacija

## Preview i razvojni slojevi

1. `gnk-asg-auto-editor-public-clean`
   - nema produkcijskih ruta
   - zadržati samo kao preview/test implementaciju

2. `gnk-asg-command-center-worker`
   - nema produkcijskih ruta
   - budući orkestrator preko service bindinga

3. `gnk-asg-mail-agent-worker`
   - razvojni modul, još bez produkcijske rute
   - inbound AI klasifikacija, Inbox/Outbox/Sent/Held

## Kritični nalazi

### 1. Kontakt backend je višestruko dupliciran

`gnk-asg-contact-api` je pravi specifični vlasnik kontakt i operator-mail ruta. Istodobno `gnk-asg-direct-operator` sadrži više zasebnih handlera za `/api/contact-submit` i dodatni contact fallback.

Rizici:
- nejasno je koji je kod autoritativan
- promjena prioriteta ruta može aktivirati stariji handler
- različiti handleri imaju različito ponašanje za mail, D1 i JSON odgovor

Cilj:
- `gnk-asg-contact-api` ostaje jedini autoritativni vlasnik kontakt forme i ručnog slanja maila
- direct-operator kontakt kod privremeno ostaje compatibility fallback, a uklanja se tek nakon smoke testa i backupa

### 2. Javni kontakt status otkriva internu adresu

Javni odgovori Contact Workera sadržavaju internu forward adresu. Stvarno interno prosljeđivanje treba ostati, ali samu adresu treba ukloniti iz javnog JSON-a.

### 3. D1 kontakt zapis nije u specijaliziranom Contact Workeru

`gnk-asg-contact-api` ima KV, R2 i EMAIL, ali nema D1 binding. D1 spremanje postoji u dupliciranom direct-operator kodu.

Treba odabrati jedan model:
- KV kao jedini izvor istine; ili
- KV + postojeći `GNK_ASG_D1` u Contact Workeru.

Ne treba održavati dvije različite implementacije spremanja.

### 4. News/market backend sadrži kontradiktornu blokadu

Legacy direct-operator sloj poziva `gnkAsgAutomationRemovedResponse()` prije `handleRefreshRoute()`. Blokada vraća HTTP 410 za dio istih news/market ruta koje noviji refresh modul pokušava obraditi.

Potencijalno pogođene rute:
- `/data/news.json`
- `/data/market.json`
- `/data/digital-assets.json`
- `/operator/refresh-news`
- `/operator/refresh-market`
- povezani statusni feedovi

Cilj:
- legacy 410 blokadu ograničiti samo na stvarno napuštene putanje
- aktivni `handleRefreshRoute()` mora imati prednost

### 5. Direct operator nema potvrđen cron za news/market

Kod sadržava scheduled refresh handler, ali trenutačni `wrangler.toml` nema cron expressions. Zato se ne smije pretpostaviti da se news i market osvježavaju po rasporedu iz tog Workera.

Cilj:
- jedan cron vlasnik za news/market
- preporuka: Command Center hourly guard ili zaseban sync Worker
- bez paralelnih cronova u više Workera

### 6. Publish sustav ima više write putanja

Dedicated Publish Operator piše u:
- `publish:approved`
- `data:articles:items`
- `article:<slug>`
- `publish:last`

Direct operator također sadržava vlastite publication write i queue putanje.

Cilj:
- Dedicated Publish Operator postaje jedini autoritativni write backend
- Direct Operator ostaje read/proxy/compatibility sloj
- Auto Editor i ručni admin objavljuju kroz isti Publish Operator API

### 7. Auto Editor i javne publikacije moraju biti razdvojeni

Ciljna podjela:
- Auto Editor = odabir teme, generiranje teksta, izvora, slike, HR/EN i SEO
- Publish Operator = validacija, deduplikacija i trajni write
- Direct Operator = public read/render compatibility

### 8. Mail sustav treba jednu backend jezgru

Postoje Contact Worker operator mail, Mail Center, stari Mail Studio, novi Mail Studio Pro i razvojni Mail Agent.

Ciljna podjela:
- Contact Worker = outbound transport i kontakt forma
- Mail Agent = inbound čitanje, klasifikacija i auto-reply
- jedan zajednički Inbox/Outbox/Sent/Held storage contract
- Mail Studio Pro i mobilni admin koriste isti API
- stari UI-jevi ostaju samo privremeni redirect/compatibility sloj

## Preporučena konačna arhitektura

### Zadržati kao zasebne servise

- `gnk-asg-ai-assist-worker`
- `gnk-asg-contact-api`
- `gnk-asg-auto-editor`
- `gnk-asg-publish-operator`
- `gnk-asg-mail-agent-worker` nakon preview testa
- `gnk-asg-command-center-worker` kao orkestrator

### Smanjiti odgovornost

`gnk-asg-direct-operator` treba zadržati:
- frontend/public shell
- operator status, log i read compatibility
- R2 proxy i javne read endpointove

Iz njega postupno ukloniti:
- duplicirani contact write kod
- duplicirani publication write kod
- blokiranje aktivnih news/market ruta

### Zadržati samo kao preview ili preskočiti

- `gnk-asg-auto-editor-public-clean`
- legacy statički auto-editor generator u direct-operatoru
- višestruki contact-submit fallback handleri
- stari news/market disabled router nakon potvrđenog novog refresh backenda

## Redoslijed sigurne konsolidacije

1. Izvesti stvarni Cloudflare Domains & Routes popis i usporediti ga s Wrangler datotekama.
2. Provesti live smoke test svih javnih i token-protected ruta.
3. Popraviti news/market 410 precedence problem.
4. Odrediti jednog cron vlasnika za news/market.
5. Proglasiti Contact Worker jedinim contact/mail transport vlasnikom.
6. Ukloniti internu forward adresu iz javnih odgovora.
7. Odlučiti KV-only ili KV+D1 model za kontakt.
8. Proglasiti Publish Operator jedinim publication write vlasnikom.
9. Povezati Auto Editor i ručni upload na isti Publish Operator.
10. Povezati Mail Agent i Mail Studio Pro na isti mailbox storage ugovor.
11. U previewu testirati HR/EN, kontakt, mail, AI, market, news, objave, R2, KV i D1.
12. Napraviti Cloudflare snapshot, Git backup i rollback plan.
13. Tek nakon izričitog odobrenja provesti kontroliranu produkcijsku konsolidaciju.

## Odluka za sada

Ni jedan postojeći Worker ne treba odmah brisati ili gasiti. Prvo treba dokazati route ownership i funkcionalnost stvarnim HTTP testom, a zatim uklanjati samo duplicirani kod i višak preview servisa.
