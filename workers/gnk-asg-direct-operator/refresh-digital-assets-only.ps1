Set-Location "G:\GNK\GNK_ASG_ACTIVE_WORKER"

$NowIso = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$RunStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$RunRoot = "G:\GNK\GNK_ASG_DIGITAL_ASSETS_REFRESH_RUNS\$RunStamp"
$DataRoot = "G:\GNK\GNK_ASG_ACTIVE_WORKER\public\data"
$MarketScript = "G:\GNK\GNK_ASG_ACTIVE_WORKER\refresh-market-only.ps1"

New-Item -ItemType Directory -Path $RunRoot -Force | Out-Null
New-Item -ItemType Directory -Path $DataRoot -Force | Out-Null

function SaveJson($Path,$Obj){
  $Obj | ConvertTo-Json -Depth 50 | Set-Content -Path $Path -Encoding UTF8
}

if(Test-Path $MarketScript){
  powershell -NoProfile -ExecutionPolicy Bypass -File $MarketScript
}

$MarketPath = "$DataRoot\market.json"
$ChartPath = "$DataRoot\btc_chart.json"

if(Test-Path $MarketPath){
  $Market = Get-Content $MarketPath -Raw | ConvertFrom-Json
}else{
  $Market = [PSCustomObject]@{
    ok=$true
    type="market"
    status="FALLBACK"
    updatedAt=$NowIso
    ttlMinutes=15
    disclaimer="Podaci su informativni, mogu kasniti i nisu financijski savjet."
    crypto=@()
    assets=@()
    fx=[PSCustomObject]@{pair="USD/EUR";value=$null;date=$null;status="FALLBACK"}
    commodities=@()
    errors=@()
  }
}

if(Test-Path $ChartPath){
  $BtcChart = Get-Content $ChartPath -Raw | ConvertFrom-Json
}else{
  $BtcChart = [PSCustomObject]@{
    ok=$true
    status="FALLBACK"
    updatedAt=$NowIso
    currency="EUR"
    days=7
    prices=@()
  }
}

$Crypto = @()
if($Market.crypto){ $Crypto = @($Market.crypto) }
elseif($Market.assets){ $Crypto = @($Market.assets) }

$Market.status = $(if(@($Crypto | Where-Object { $_.status -eq "LIVE" }).Count -gt 0){"LIVE"}else{"FALLBACK"})
$Market.updatedAt = $NowIso
$Market.ttlMinutes = 15
$Market.crypto = $Crypto
$Market.assets = $Crypto
$Market.disclaimer = "Podaci su informativni, mogu kasniti i nisu financijski savjet."

$DigitalAssets = [PSCustomObject]@{
  ok=$true
  type="digital-assets"
  status=$Market.status
  updatedAt=$NowIso
  ttlMinutes=15
  disclaimer=$Market.disclaimer
  crypto=$Crypto
  assets=$Crypto
  fx=$Market.fx
  commodities=$Market.commodities
  source="public-data-refresh"
}

$Fast = [PSCustomObject]@{
  ok=$true
  status=$Market.status
  updatedAt=$NowIso
  modules=[PSCustomObject]@{
    crypto=$Market.status
    btcChart=$BtcChart.status
    fx=$(if($Market.fx){$Market.fx.status}else{"FALLBACK"})
    commodities="SNAPSHOT"
    stablecoins=$Market.status
    exchanges="SNAPSHOT"
    indices="SNAPSHOT"
    macro="SNAPSHOT"
  }
}

$Stablecoins = [PSCustomObject]@{
  ok=$true
  status=$Market.status
  updatedAt=$NowIso
  items=@(
    [PSCustomObject]@{symbol="USDT";name="Tether";status="WATCHLIST"},
    [PSCustomObject]@{symbol="USDC";name="USD Coin";status="WATCHLIST"},
    [PSCustomObject]@{symbol="EURC";name="Euro Coin";status="WATCHLIST"}
  )
}

$Indices = [PSCustomObject]@{
  ok=$true
  status="SNAPSHOT"
  updatedAt=$NowIso
  items=@(
    [PSCustomObject]@{symbol="S&P 500";name="S&P 500";status="SNAPSHOT"},
    [PSCustomObject]@{symbol="NASDAQ";name="Nasdaq Composite";status="SNAPSHOT"},
    [PSCustomObject]@{symbol="DAX";name="DAX";status="SNAPSHOT"},
    [PSCustomObject]@{symbol="STOXX Europe 600";name="STOXX Europe 600";status="SNAPSHOT"}
  )
}

$Exchanges = [PSCustomObject]@{
  ok=$true
  status="SNAPSHOT"
  updatedAt=$NowIso
  items=@(
    [PSCustomObject]@{name="Binance";type="crypto exchange";status="SNAPSHOT"},
    [PSCustomObject]@{name="Coinbase";type="crypto exchange";status="SNAPSHOT"},
    [PSCustomObject]@{name="Kraken";type="crypto exchange";status="SNAPSHOT"},
    [PSCustomObject]@{name="Nasdaq";type="stock exchange";status="SNAPSHOT"},
    [PSCustomObject]@{name="NYSE";type="stock exchange";status="SNAPSHOT"}
  )
}

$Macro = [PSCustomObject]@{
  ok=$true
  status=$(if($Market.fx -and $Market.fx.status -eq "LIVE"){"LIVE"}else{"SNAPSHOT"})
  updatedAt=$NowIso
  fx=$Market.fx
  indices=$Indices.items
  disclaimer=$Market.disclaimer
}

$Brief = [PSCustomObject]@{
  ok=$true
  status=$Market.status
  updatedAt=$NowIso
  title="GNK ASG Daily Market Brief"
  summary="Digitalna imovina, BTC, FX i tržišni status osvježeni su za sadašnju stranicu."
  items=$Crypto
  fx=$Market.fx
  stablecoins=$Stablecoins.items
  indices=$Indices.items
  disclaimer=$Market.disclaimer
}

SaveJson "$DataRoot\market.json" $Market
SaveJson "$DataRoot\digital-assets.json" $DigitalAssets
SaveJson "$DataRoot\crypto.json" $DigitalAssets
SaveJson "$DataRoot\btc_chart.json" $BtcChart
SaveJson "$DataRoot\btc-chart.json" $BtcChart
SaveJson "$DataRoot\fast_market_status.json" $Fast
SaveJson "$DataRoot\stablecoins.json" $Stablecoins
SaveJson "$DataRoot\market_indices.json" $Indices
SaveJson "$DataRoot\market-indices.json" $Indices
SaveJson "$DataRoot\stock_exchanges.json" $Exchanges
SaveJson "$DataRoot\stock-exchanges.json" $Exchanges
SaveJson "$DataRoot\exchange_compare.json" $Exchanges
SaveJson "$DataRoot\macro_market.json" $Macro
SaveJson "$DataRoot\macro-market.json" $Macro
SaveJson "$DataRoot\daily_market_brief.json" $Brief
SaveJson "$DataRoot\daily-market-brief.json" $Brief

$StatusPath = "$DataRoot\update_status.json"

try{
  $Status = Get-Content $StatusPath -Raw | ConvertFrom-Json
}catch{
  $Status = [PSCustomObject]@{ok=$true;updatedAt=$NowIso;modules=[PSCustomObject]@{}}
}

$Modules = [ordered]@{}

if($Status.modules){
  foreach($P in $Status.modules.PSObject.Properties){
    $Modules[$P.Name] = $P.Value
  }
}

$Modules["market"] = [PSCustomObject]@{status=$Market.status;updatedAt=$NowIso;refreshMinutes=15;cryptoCount=$Crypto.Count;automation="windows-task-digital-assets"}
$Modules["digitalAssets"] = [PSCustomObject]@{status=$DigitalAssets.status;updatedAt=$NowIso;refreshMinutes=15;count=$Crypto.Count;automation="windows-task-digital-assets"}
$Modules["btcChart"] = [PSCustomObject]@{status=$BtcChart.status;updatedAt=$NowIso;refreshMinutes=15;automation="windows-task-digital-assets"}
$Modules["fastMarketStatus"] = [PSCustomObject]@{status=$Fast.status;updatedAt=$NowIso;refreshMinutes=15;automation="windows-task-digital-assets"}
$Modules["stablecoins"] = [PSCustomObject]@{status=$Stablecoins.status;updatedAt=$NowIso;refreshMinutes=15;automation="windows-task-digital-assets"}
$Modules["stockExchanges"] = [PSCustomObject]@{status=$Exchanges.status;updatedAt=$NowIso;refreshMinutes=60;automation="windows-task-digital-assets"}
$Modules["marketIndices"] = [PSCustomObject]@{status=$Indices.status;updatedAt=$NowIso;refreshMinutes=60;automation="windows-task-digital-assets"}
$Modules["macroMarket"] = [PSCustomObject]@{status=$Macro.status;updatedAt=$NowIso;refreshMinutes=60;automation="windows-task-digital-assets"}

$StatusOut = [PSCustomObject]@{
  ok=$true
  updatedAt=$NowIso
  modules=$Modules
}

SaveJson $StatusPath $StatusOut

node --check ".\src\index.js" 2>&1 | Out-File "$RunRoot\node-check.txt" -Encoding UTF8
$NodeExit = $LASTEXITCODE

if($NodeExit -eq 0){
  npx --yes wrangler@4.101.0 deploy .\src\index.js --name gnk-asg-direct-operator --assets .\public 2>&1 | Tee-Object "$RunRoot\deploy.log"
  $DeployExit = $LASTEXITCODE
}else{
  $DeployExit = -1
}

$Urls = @(
  "https://gnk-asg.hr/data/market.json",
  "https://gnk-asg.hr/data/digital-assets.json",
  "https://gnk-asg.hr/data/btc_chart.json",
  "https://gnk-asg.hr/data/fast_market_status.json",
  "https://gnk-asg.hr/data/stablecoins.json",
  "https://gnk-asg.hr/data/stock_exchanges.json",
  "https://gnk-asg.hr/data/market_indices.json",
  "https://gnk-asg.hr/data/macro_market.json",
  "https://gnk-asg.hr/data/daily_market_brief.json",
  "https://gnk-asg.hr/data/update_status.json"
)

$Qa = foreach($Url in $Urls){
  try{
    $Uri = $Url + "?cb=" + (Get-Date -Format "yyyyMMddHHmmss")
    $R = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 35 -Headers @{
      "Cache-Control"="no-cache"
      "Pragma"="no-cache"
      "User-Agent"="GNK-ASG-Digital-Assets-QA/1.0"
    }
    $Text = [string]$R.Content
    [PSCustomObject]@{
      Url=$Url
      Status=$R.StatusCode
      Length=$Text.Length
      HasOk=$Text.Contains('"ok"')
      HasLive=$Text.Contains("LIVE")
      HasBtc=($Text.Contains("BTC") -or $Text.Contains("Bitcoin"))
      HasUpdatedAt=$Text.Contains("updatedAt")
    }
  }catch{
    [PSCustomObject]@{Url=$Url;Status="ERROR";Length=0;HasOk=$false;HasLive=$false;HasBtc=$false;HasUpdatedAt=$false}
  }
}

SaveJson "$RunRoot\qa.json" $Qa
SaveJson "$RunRoot\summary.json" ([PSCustomObject]@{
  runRoot=$RunRoot
  nodeExit=$NodeExit
  deployExit=$DeployExit
  marketStatus=$Market.status
  digitalAssetsStatus=$DigitalAssets.status
  btcChartStatus=$BtcChart.status
  cryptoCount=$Crypto.Count
  updatedAt=$NowIso
})

$Report = "$RunRoot\DIGITAL_ASSETS_REFRESH_REPORT.txt"

"GNK ASG DIGITAL ASSETS REFRESH REPORT" | Out-File $Report -Encoding UTF8
"RunRoot: $RunRoot" | Out-File $Report -Append -Encoding UTF8
"NodeExit: $NodeExit" | Out-File $Report -Append -Encoding UTF8
"DeployExit: $DeployExit" | Out-File $Report -Append -Encoding UTF8
"MarketStatus: $($Market.status)" | Out-File $Report -Append -Encoding UTF8
"DigitalAssetsStatus: $($DigitalAssets.status)" | Out-File $Report -Append -Encoding UTF8
"BtcChartStatus: $($BtcChart.status)" | Out-File $Report -Append -Encoding UTF8
"CryptoCount: $($Crypto.Count)" | Out-File $Report -Append -Encoding UTF8
"UpdatedAt: $NowIso" | Out-File $Report -Append -Encoding UTF8
"" | Out-File $Report -Append -Encoding UTF8
$Qa | Format-Table Url,Status,Length,HasOk,HasLive,HasBtc,HasUpdatedAt -AutoSize | Out-String | Out-File $Report -Append -Encoding UTF8

Write-Host "===== DIGITAL ASSETS REFRESH DONE ====="
Get-Content $Report -TotalCount 220
Write-Host "REPORT:"
Write-Host $Report
Write-Host "RUN_ROOT:"
Write-Host $RunRoot
