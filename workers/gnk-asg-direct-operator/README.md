# GNK ASG Cloudflare Direct Operator

Ovo je verzija koja odgovara ranije dogovorenom modelu:

- bez GitHuba
- bez Gmaila
- bez lokalnog računala nakon postavljanja
- Cloudflare Worker prima naredbu
- KV drži javnu konfiguraciju
- D1 drži logove i popis snapshotova
- svaka bitna promjena radi snapshot
- portal čita javne JSON endpointove

## Dva načina rada

### 1. Sigurni POST endpoint

`POST /operator/command`

Koristi se za pune JSON naredbe.

### 2. Direct GET endpoint

`GET /operator/direct?key=TOKEN&action=brand_theme`

Koristi se za kratke sigurne naredbe koje ChatGPT može proslijediti kao URL Cloudflareu.

Podržane direct akcije:

- `ping`
- `init_defaults`
- `snapshot`
- `list_snapshots`
- `brand_theme`
- `set_status_ready`
- `set_status_working`
- `set_status_warning`

## Javni endpointovi

- `/data/site-config.json`
- `/data/status.json`
- `/data/media-kit.json`
- `/data/operator-public.json`

## Privatni endpointovi

- `/operator/command`
- `/operator/status`
- `/operator/direct`

## Važna napomena

Da bih ja mogao kasnije stvarno proslijediti naredbu Cloudflareu iz chata, mora postojati javno dostupan HTTPS endpoint, npr.:

`https://operator.gnk-asg.hr/operator/direct?key=...&action=...`

Token ne treba javno dijeliti. Najsigurniji režim je da ga pohraniš samo kod sebe i koristiš ga za ručne ili odobrene naredbe.
