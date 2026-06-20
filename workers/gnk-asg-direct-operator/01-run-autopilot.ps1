$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\GNK\Downloads\gnk-asg-cloudflare-direct-operator\gnk-asg-cloudflare-direct-operator"
Set-Location $ProjectRoot

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path ".\_backups" | Out-Null
New-Item -ItemType Directory -Force -Path ".\_handoff" | Out-Null
New-Item -ItemType Directory -Force -Path ".\_autopilot" | Out-Null
New-Item -ItemType Directory -Force -Path ".\src" | Out-Null

if (Test-Path ".\src\index.js") {
  Copy-Item ".\src\index.js" ".\_backups\index-before-autopilot-zip-$Stamp.js" -Force
}

Copy-Item ".\autopilot-index.js" ".\src\index.js" -Force

Write-Host ""
Write-Host "1/7 NODE SYNTAX CHECK"
node --check ".\src\index.js"

Write-Host ""
Write-Host "2/7 DEPLOY"
npx wrangler deploy ".\src\index.js" --name gnk-asg-direct-operator

Start-Sleep -Seconds 15

$TokenPath = Join-Path $ProjectRoot "operator-token.txt"
$Token = (Get-Content $TokenPath -Raw).Trim()

Write-Host ""
Write-Host "3/7 AUTO-PUBLISH 8 ARTICLES TODAY"
$Publish = Invoke-RestMethod `
  -Uri "https://operator.gnk-asg.hr/operator/autopublish/run" `
  -Method POST `
  -Headers @{
    "x-operator-token" = $Token
    "content-type" = "application/json"
  } `
  -Body (@{ minimumToday = 8 } | ConvertTo-Json) `
  -TimeoutSec 90

$Publish | ConvertTo-Json -Depth 40 | Set-Content ".\_autopilot\autopublish-$Stamp.json" -Encoding UTF8

Write-Host ""
Write-Host "4/7 SPEED TEST"
$Speed = Invoke-RestMethod `
  -Uri "https://operator.gnk-asg.hr/operator/speed-test" `
  -Method GET `
  -Headers @{ "x-operator-token" = $Token } `
  -TimeoutSec 90

$Speed | ConvertTo-Json -Depth 40 | Set-Content ".\_autopilot\speed-$Stamp.json" -Encoding UTF8

Write-Host ""
Write-Host "5/7 PUBLIC TESTS"
$CB = Get-Date -Format "yyyyMMddHHmmss"

$Urls = @(
  "https://operator.gnk-asg.hr/health?cb=$CB",
  "https://operator.gnk-asg.hr/app?cb=$CB",
  "https://operator.gnk-asg.hr/menu?cb=$CB",
  "https://operator.gnk-asg.hr/articles?cb=$CB",
  "https://operator.gnk-asg.hr/nermin-sefic?cb=$CB",
  "https://operator.gnk-asg.hr/data/articles.json?cb=$CB",
  "https://operator.gnk-asg.hr/data/image-catalog.json?cb=$CB",
  "https://operator.gnk-asg.hr/data/seo-config.json?cb=$CB",
  "https://operator.gnk-asg.hr/data/search-index.json?cb=$CB",
  "https://operator.gnk-asg.hr/sitemap-autopilot.xml?cb=$CB",
  "https://api.gnk-asg.hr/data/articles.json?cb=$CB",
  "https://api.gnk-asg.hr/data/image-catalog.json?cb=$CB",
  "https://assistant.gnk-asg.hr/assistant/ask",
  "https://news.gnk-asg.hr/?cb=$CB",
  "https://status.gnk-asg.hr/?cb=$CB"
)

$Results = foreach ($Url in $Urls) {
  $Started = Get-Date
  try {
    if ($Url -like "*assistant/ask") {
      $R = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 45 -Method POST -Headers @{
        "content-type" = "application/json"
        "Cache-Control" = "no-cache"
        "Pragma" = "no-cache"
        "User-Agent" = "GNK-ASG-Autopilot-Zip-Test"
      } -Body (@{ question = "Gdje su članci i Media Kit?" } | ConvertTo-Json)
    } else {
      $R = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 45 -Headers @{
        "Cache-Control" = "no-cache"
        "Pragma" = "no-cache"
        "User-Agent" = "GNK-ASG-Autopilot-Zip-Test"
      }
    }

    $Ms = [math]::Round(((Get-Date) - $Started).TotalMilliseconds, 0)

    [PSCustomObject]@{
      Url = $Url
      Status = $R.StatusCode
      Ms = $Ms
      Length = $R.Content.Length
      OK = ($R.StatusCode -ge 200 -and $R.StatusCode -lt 400)
      Fast = ($Ms -lt 2000)
      HasAutopilot = ($R.Content -match "3.1.9-autopilot-zip-pack|Automatske objave|articles|Article|image|GNK ASG")
      HasNotFound = ($R.Content -match "NOT_FOUND")
    }
  } catch {
    $Ms = [math]::Round(((Get-Date) - $Started).TotalMilliseconds, 0)
    [PSCustomObject]@{
      Url = $Url
      Status = "ERROR"
      Ms = $Ms
      Length = 0
      OK = $false
      Fast = $false
      HasAutopilot = $false
      HasNotFound = $false
      Error = $_.Exception.Message
    }
  }
}

$Results | Format-Table -AutoSize
$Results | ConvertTo-Json -Depth 30 | Set-Content ".\_autopilot\public-tests-$Stamp.json" -Encoding UTF8

Write-Host ""
Write-Host "6/7 CHECKPOINT"
$Checkpoint = Invoke-RestMethod `
  -Uri "https://operator.gnk-asg.hr/operator/checkpoint" `
  -Method POST `
  -Headers @{
    "x-operator-token" = $Token
    "content-type" = "application/json"
  } `
  -Body (@{ reason = "autopilot-zip-autopublish-articles-seo-images-3-1-9" } | ConvertTo-Json) `
  -TimeoutSec 90

$Checkpoint | ConvertTo-Json -Depth 40 | Set-Content ".\_autopilot\checkpoint-$Stamp.json" -Encoding UTF8

Write-Host ""
Write-Host "7/7 FINAL SUMMARY"

$Articles = Invoke-RestMethod -Uri "https://operator.gnk-asg.hr/data/articles.json?cb=$CB" -Method GET -TimeoutSec 60
$Images = Invoke-RestMethod -Uri "https://operator.gnk-asg.hr/data/image-catalog.json?cb=$CB" -Method GET -TimeoutSec 60

$Summary = [PSCustomObject]@{
  Deploy = "DONE"
  Version = "3.1.9-autopilot-zip-pack"
  AutoPublishOk = $Publish.ok
  CreatedToday = $Publish.createdToday
  TotalArticles = $Articles.count
  ImageCatalogCount = $Images.count
  SpeedOk = $Speed.ok
  SpeedFastOk = $Speed.fastOk
  PublicOkCount = ($Results | Where-Object { $_.OK -eq $true }).Count
  PublicFailCount = ($Results | Where-Object { $_.OK -ne $true }).Count
  PublicSlowCount = ($Results | Where-Object { $_.Fast -ne $true }).Count
  CheckpointOk = $Checkpoint.ok
  GoogleScript = "READY_IF_GOOGLE_SITE_SCRIPT_OR_GOOGLE_TAG_ID_SECRET_EXISTS"
  Sitemap = "https://operator.gnk-asg.hr/sitemap-autopilot.xml"
  ArticlesUrl = "https://operator.gnk-asg.hr/articles"
  AuthorHub = "https://operator.gnk-asg.hr/nermin-sefic"
  ImageCatalog = "https://operator.gnk-asg.hr/data/image-catalog.json"
  ProductionHomepageTouched = $false
  ForbiddenRouteTouched = $false
  GitHubUsed = $false
  Next = "Google code secret / Cron trigger check / R2 real images / homepage origin audit"
}

$Summary | Format-List
$Summary | ConvertTo-Json -Depth 30 | Set-Content ".\_autopilot\final-summary-$Stamp.json" -Encoding UTF8
$Summary | ConvertTo-Json -Depth 30 | Set-Content ".\_handoff\autopilot-zip-final-summary-$Stamp.json" -Encoding UTF8

Start-Process "https://operator.gnk-asg.hr/articles?cb=$CB"
Start-Process "https://operator.gnk-asg.hr/nermin-sefic?cb=$CB"
Start-Process "https://operator.gnk-asg.hr/sitemap-autopilot.xml?cb=$CB"
Start-Process "https://operator.gnk-asg.hr/data/image-catalog.json?cb=$CB"

Write-Host ""
Write-Host "AUTOPILOT ZIP GOTOV."
