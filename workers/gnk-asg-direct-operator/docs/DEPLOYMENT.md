# Postavljanje GNK ASG Cloudflare Direct Operatora

## 1. Raspakiraj paket

Raspakiraj ZIP na računalo.

## 2. Uđi u mapu

```powershell
Set-Location "C:\PUTANJA\DO\gnk-asg-cloudflare-direct-operator"
```

## 3. Instaliraj

```powershell
npm install
```

## 4. Prijava u Cloudflare

```powershell
npx wrangler login
```

## 5. Kreiraj KV

```powershell
npx wrangler kv namespace create GNK_ASG_CONFIG_KV
```

Dobiveni KV `id` zalijepi u `wrangler.toml`.

## 6. Kreiraj D1

```powershell
npx wrangler d1 create gnk_asg_operator_logs
```

Dobiveni `database_id` zalijepi u `wrangler.toml`.

## 7. Postavi secret token

```powershell
npx wrangler secret put OPERATOR_TOKEN
```

## 8. Deploy

```powershell
npx wrangler deploy
```

## 9. Migracija D1 baze

Ako D1 migracija ne prođe prije deploya, pokreni nakon deploya:

```powershell
npx wrangler d1 execute gnk_asg_operator_logs --file=./schema/d1.sql
```

## 10. Inicijalizacija podataka

Zamijeni URL i token:

```powershell
$Url = "https://gnk-asg-direct-operator.TVOJ-SUBDOMAIN.workers.dev/operator/command"
$Token = "OVDJE_IDE_OPERATOR_TOKEN"

Invoke-RestMethod `
  -Uri $Url `
  -Method POST `
  -Headers @{ Authorization = "Bearer $Token" } `
  -ContentType "application/json" `
  -Body '{"command":"init_defaults","actor":"Nermin Sefić","note":"Prva inicijalizacija Direct Operatora"}'
```

## 11. Direct test

```powershell
$Base = "https://gnk-asg-direct-operator.TVOJ-SUBDOMAIN.workers.dev"
$Token = "OVDJE_IDE_OPERATOR_TOKEN"

Invoke-RestMethod "$Base/operator/direct?key=$Token&action=ping"
Invoke-RestMethod "$Base/operator/direct?key=$Token&action=brand_theme"
Invoke-RestMethod "$Base/operator/direct?key=$Token&action=snapshot&reason=manual-test"
```

## 12. Custom domena

Preporučena domena:

`operator.gnk-asg.hr`

Ruta:

`operator.gnk-asg.hr/*`

Tada endpoint postaje:

`https://operator.gnk-asg.hr/operator/direct?key=TOKEN&action=brand_theme`
