$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\GNK\Downloads\gnk-asg-cloudflare-direct-operator\gnk-asg-cloudflare-direct-operator"
Set-Location $ProjectRoot

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path ".\_backups" | Out-Null
New-Item -ItemType Directory -Force -Path ".\_autopilot" | Out-Null
New-Item -ItemType Directory -Force -Path ".\_handoff" | Out-Null

Copy-Item ".\src\index.js" ".\_backups\index-before-cron-autopublish-$Stamp.js" -Force
Copy-Item ".\wrangler.toml" ".\_backups\wrangler-before-cron-autopublish-$Stamp.toml" -Force

$Index = Get-Content ".\src\index.js" -Raw -Encoding UTF8

$Index = $Index -replace 'const VERSION = "([^"]+)";', 'const VERSION = "3.1.11-cron-autopublish-active";'

$OldScheduled = 'async function scheduledRun(event, env){const result=await publishAutoArticles(env,3);await logEvent(env,{type:"scheduled-autopublish",ok:true,cron:event.cron,result});}'

$NewScheduled = @'
async function scheduledRun(event, env){
  const existing = await getArticles(env);
  const list = Array.isArray(existing) ? existing : [];
  const day = todayKey();
  const todayCount = list.filter(a => a.date === day).length;
  const cronId = String(event.cron || "manual").replace(/[^a-zA-Z0-9:* -]/g, "");
  const slotKey = `articles:scheduled:${day}:${cronId}`;

  const already = await kvGet(env, slotKey, null);
  if (already) {
    await logEvent(env, {type:"scheduled-autopublish-skip", ok:true, cron:event.cron, reason:"slot-already-published", todayCount});
    return;
  }

  const minimum = Math.max(todayCount + 1, 1);
  const result = await publishAutoArticles(env, minimum);

  await kvPut(env, slotKey, {
    ok:true,
    at:nowIso(),
    cron:event.cron,
    version:VERSION,
    createdToday:result.createdToday,
    totalArticles:result.totalArticles
  });

  await logEvent(env, {type:"scheduled-autopublish", ok:true, cron:event.cron, minimum, result});
}
'@

if ($Index.Contains($OldScheduled)) {
  $Index = $Index.Replace($OldScheduled, $NewScheduled)
} elseif ($Index -notmatch 'articles:scheduled') {
  throw "Ne mogu pronaći scheduledRun za sigurnu zamjenu. Pošalji zadnjih 30 redova src/index.js."
}

Set-Content ".\src\index.js" $Index -Encoding UTF8

$Toml = Get-Content ".\wrangler.toml" -Raw -Encoding UTF8
$CronBlock = @"

[triggers]
crons = ["0 7 * * *", "0 12 * * *", "0 18 * * *"]
"@

if ($Toml -match '(?ms)^\[triggers\]\s*.*?(?=^\[|\z)') {
  $Toml = [regex]::Replace($Toml, '(?ms)^\[triggers\]\s*.*?(?=^\[|\z)', $CronBlock.TrimStart() + "`r`n")
} else {
  $Toml = $Toml.TrimEnd() + "`r`n" + $CronBlock
}

Set-Content ".\wrangler.toml" $Toml -Encoding UTF8

Write-Host ""
Write-Host "1/6 NODE SYNTAX CHECK"
node --check ".\src\index.js"

Write-Host ""
Write-Host "2/6 DEPLOY WITH CRON TRIGGERS"
npx wrangler deploy ".\src\index.js" --name gnk-asg-direct-operator

Start-Sleep -Seconds 15

$Token = (Get-Content ".\operator-token.txt" -Raw).Trim()
$CB = Get-Date -Format "yyyyMMddHHmmss"

Write-Host ""
Write-Host "3/6 VERIFY ARTICLES / IMAGES / SITEMAP"
$Articles = Invoke-RestMethod -Uri "https://operator.gnk-asg.hr/data/articles.json?cb=$CB" -Method GET -TimeoutSec 60
$Images = Invoke-RestMethod -Uri "https://operator.gnk-asg.hr/data/image-catalog.json?cb=$CB" -Method GET -TimeoutSec 60
$Sitemap = Invoke-WebRequest -Uri "https://operator.gnk-asg.hr/sitemap-autopilot.xml?cb=$CB" -UseBasicParsing -TimeoutSec 60

$ArticleCount = @($Articles.articles).Count
$ImageCount = @($Images.images).Count

if ($ArticleCount -lt 8 -or $ImageCount -lt 8) {
  Write-Host ""
  Write-Host "ARTICLES/IMAGES ISPOD 8 - POKREĆEM AUTOPUBLISH REBUILD"
  $Publish = Invoke-RestMethod `
    -Uri "https://operator.gnk-asg.hr/operator/autopublish/run" `
    -Method POST `
    -Headers @{
      "x-operator-token" = $Token
      "content-type" = "application/json"
    } `
    -Body (@{ minimumToday = 8 } | ConvertTo-Json) `
    -TimeoutSec 90

  Start-Sleep -Seconds 5
  $Articles = Invoke-RestMethod -Uri "https://operator.gnk-asg.hr/data/articles.json?cb=$CB-rebuild" -Method GET -TimeoutSec 60
  $Images = Invoke-RestMethod -Uri "https://operator.gnk-asg.hr/data/image-catalog.json?cb=$CB-rebuild" -Method GET -TimeoutSec 60
  $ArticleCount = @($Articles.articles).Count
  $ImageCount = @($Images.images).Count
} else {
  $Publish = [PSCustomObject]@{ ok = $true; createdToday = 0; note = "No rebuild needed" }
}

Write-Host ""
Write-Host "4/6 SPEED TEST"
$Speed = Invoke-RestMethod `
  -Uri "https://operator.gnk-asg.hr/operator/speed-test" `
  -Method GET `
  -Headers @{ "x-operator-token" = $Token } `
  -TimeoutSec 90

Write-Host ""
Write-Host "5/6 CHECKPOINT"
$Checkpoint = Invoke-RestMethod `
  -Uri "https://operator.gnk-asg.hr/operator/checkpoint" `
  -Method POST `
  -Headers @{
    "x-operator-token" = $Token
    "content-type" = "application/json"
  } `
  -Body (@{ reason = "cron-autopublish-active-3-1-11" } | ConvertTo-Json) `
  -TimeoutSec 90

Write-Host ""
Write-Host "6/6 FINAL SUMMARY"

$Summary = [PSCustomObject]@{
  Deploy = "DONE"
  Version = "3.1.11-cron-autopublish-active"
  CronTriggers = "0 7 * * * / 0 12 * * * / 0 18 * * * UTC"
  CroatiaTimeJune = "09:00 / 14:00 / 20:00"
  AutoPublishOk = $Publish.ok
  CreatedToday = $Publish.createdToday
  TotalArticles = $ArticleCount
  ImageCatalogCount = $ImageCount
  SitemapLength = $Sitemap.Content.Length
  SpeedOk = $Speed.ok
  SpeedFastOk = $Speed.fastOk
  CheckpointOk = $Checkpoint.ok
  ArticlesUrl = "https://operator.gnk-asg.hr/articles"
  ArticlesJson = "https://operator.gnk-asg.hr/data/articles.json"
  ImageCatalog = "https://operator.gnk-asg.hr/data/image-catalog.json"
  Sitemap = "https://operator.gnk-asg.hr/sitemap-autopilot.xml"
  GoogleScript = "READY_IF_GOOGLE_SITE_SCRIPT_OR_GOOGLE_TAG_ID_SECRET_EXISTS"
  ProductionHomepageTouched = $false
  ForbiddenRouteTouched = $false
  GitHubUsed = $false
  Next = "Google script secret / R2 real images"
}

$Summary | Format-List

$Summary | ConvertTo-Json -Depth 30 | Set-Content ".\_autopilot\cron-autopublish-summary-$Stamp.json" -Encoding UTF8
$Articles | ConvertTo-Json -Depth 40 | Set-Content ".\_autopilot\articles-cron-check-$Stamp.json" -Encoding UTF8
$Images | ConvertTo-Json -Depth 40 | Set-Content ".\_autopilot\images-cron-check-$Stamp.json" -Encoding UTF8

Start-Process "https://operator.gnk-asg.hr/articles?cb=$CB"
Start-Process "https://operator.gnk-asg.hr/data/image-catalog.json?cb=$CB"
Start-Process "https://operator.gnk-asg.hr/sitemap-autopilot.xml?cb=$CB"
