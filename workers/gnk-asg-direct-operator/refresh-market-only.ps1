Set-Location "G:\GNK\GNK_ASG_ACTIVE_WORKER"

$Now = Get-Date
$NowIso = $Now.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$RunStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$RunRoot = "G:\GNK\GNK_ASG_MARKET_REFRESH_RUNS\$RunStamp"
$DataRoot = "G:\GNK\GNK_ASG_ACTIVE_WORKER\public\data"
$IndexPath = "G:\GNK\GNK_ASG_ACTIVE_WORKER\src\index.js"

New-Item -ItemType Directory -Path $RunRoot -Force | Out-Null
New-Item -ItemType Directory -Path $DataRoot -Force | Out-Null

function SaveJson($Path,$Obj){
  $Obj | ConvertTo-Json -Depth 30 | Set-Content -Path $Path -Encoding UTF8
}

$Errors = @()

try {
  $Prices = Invoke-RestMethod -Uri "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=eur,usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true" -TimeoutSec 35 -Headers @{
    "User-Agent"="GNK-ASG-Market-Refresh/1.0"
  }
} catch {
  $Prices = $null
  $Errors += [PSCustomObject]@{module="crypto-prices";error=$_.Exception.Message}
}

$Defs = @(
  @{slug="btc";id="bitcoin";symbol="BTC";name="Bitcoin"},
  @{slug="eth";id="ethereum";symbol="ETH";name="Ethereum"},
  @{slug="sol";id="solana";symbol="SOL";name="Solana"},
  @{slug="xrp";id="ripple";symbol="XRP";name="XRP"}
)

$Crypto = @()

foreach($D in $Defs){
  $P = $null
  if($Prices){
    $Prop = $Prices.PSObject.Properties[$D.id]
    if($Prop){ $P = $Prop.Value }
  }

  $Crypto += [PSCustomObject]@{
    slug=$D.slug
    id=$D.id
    symbol=$D.symbol
    name=$D.name
    priceEur=$(if($P){$P.eur}else{$null})
    priceUsd=$(if($P){$P.usd}else{$null})
    change24hEur=$(if($P){$P.eur_24h_change}else{$null})
    marketCapEur=$(if($P){$P.eur_market_cap}else{$null})
    volume24hEur=$(if($P){$P.eur_24h_vol}else{$null})
    status=$(if($P -and $P.eur){"LIVE"}else{"FALLBACK"})
    url="/coin/$($D.slug)"
  }
}

try {
  $Chart = Invoke-RestMethod -Uri "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=7&interval=daily" -TimeoutSec 35 -Headers @{
    "User-Agent"="GNK-ASG-BTC-Chart/1.0"
  }

  $ChartPrices = @()

  foreach($Item in $Chart.prices){
    $Time = ([DateTimeOffset]::FromUnixTimeMilliseconds([int64]$Item[0])).UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $ChartPrices += [PSCustomObject]@{time=$Time;value=[double]$Item[1]}
  }

  $BtcChart = [PSCustomObject]@{
    ok=$true
    status="LIVE"
    updatedAt=$NowIso
    currency="EUR"
    days=7
    prices=$ChartPrices
  }
} catch {
  $Errors += [PSCustomObject]@{module="btc-chart";error=$_.Exception.Message}
  $Fallback = @()
  for($i=7;$i -ge 0;$i--){
    $Fallback += [PSCustomObject]@{
      time=(Get-Date).AddDays(-$i).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
      value=(100 + (7 - $i) * 2)
    }
  }
  $BtcChart = [PSCustomObject]@{
    ok=$true
    status="FALLBACK"
    updatedAt=$NowIso
    currency="EUR"
    days=7
    prices=$Fallback
  }
}

try {
  $FxData = Invoke-RestMethod -Uri "https://api.frankfurter.app/latest?from=USD&to=EUR" -TimeoutSec 25
  $Fx = [PSCustomObject]@{
    pair="USD/EUR"
    value=$FxData.rates.EUR
    date=$FxData.date
    status="LIVE"
  }
} catch {
  $Errors += [PSCustomObject]@{module="fx";error=$_.Exception.Message}
  $Fx = [PSCustomObject]@{
    pair="USD/EUR"
    value=$null
    date=$null
    status="FALLBACK"
  }
}

$MarketStatus = $(if(@($Crypto | Where-Object { $_.status -eq "LIVE" }).Count -gt 0){"LIVE"}else{"FALLBACK"})

$Market = [PSCustomObject]@{
  ok=$true
  type="market"
  status=$MarketStatus
  updatedAt=$NowIso
  ttlMinutes=15
  disclaimer="Podaci su informativni, mogu kasniti i nisu financijski savjet."
  crypto=$Crypto
  assets=$Crypto
  fx=$Fx
  commodities=@(
    [PSCustomObject]@{symbol="GOLD";name="Zlato";status="SNAPSHOT";url="/coin/gold"},
    [PSCustomObject]@{symbol="BRENT";name="Brent nafta";status="SNAPSHOT";url="/markets#brent"}
  )
  errors=$Errors
}

$Fast = [PSCustomObject]@{
  ok=$true
  status=$MarketStatus
  updatedAt=$NowIso
  modules=[PSCustomObject]@{
    crypto=$MarketStatus
    btcChart=$BtcChart.status
    fx=$Fx.status
    commodities="SNAPSHOT"
  }
}

$Stablecoins = [PSCustomObject]@{
  ok=$true
  status=$MarketStatus
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
    [PSCustomObject]@{symbol="S&P 500";status="SNAPSHOT"},
    [PSCustomObject]@{symbol="NASDAQ";status="SNAPSHOT"},
    [PSCustomObject]@{symbol="DAX";status="SNAPSHOT"},
    [PSCustomObject]@{symbol="STOXX Europe 600";status="SNAPSHOT"}
  )
}

$Brief = [PSCustomObject]@{
  ok=$true
  status=$MarketStatus
  updatedAt=$NowIso
  title="GNK ASG Daily Market Brief"
  summary="Digitalna imovina, BTC i FX osvježeni su za sadašnju stranicu."
  items=$Crypto
  fx=$Fx
  disclaimer=$Market.disclaimer
}

SaveJson "$DataRoot\market.json" $Market
SaveJson "$DataRoot\digital-assets.json" $Market
SaveJson "$DataRoot\crypto.json" $Market
SaveJson "$DataRoot\btc_chart.json" $BtcChart
SaveJson "$DataRoot\btc-chart.json" $BtcChart
SaveJson "$DataRoot\fast_market_status.json" $Fast
SaveJson "$DataRoot\stablecoins.json" $Stablecoins
SaveJson "$DataRoot\market_indices.json" $Indices
SaveJson "$DataRoot\market-indices.json" $Indices
SaveJson "$DataRoot\daily_market_brief.json" $Brief
SaveJson "$DataRoot\daily-market-brief.json" $Brief

$StatusPath = "$DataRoot\update_status.json"

try {
  if(Test-Path $StatusPath){
    $Current = Get-Content $StatusPath -Raw | ConvertFrom-Json
  } else {
    $Current = [PSCustomObject]@{ok=$true;updatedAt=$NowIso;modules=[PSCustomObject]@{}}
  }
} catch {
  $Current = [PSCustomObject]@{ok=$true;updatedAt=$NowIso;modules=[PSCustomObject]@{}}
}

$Modules = [ordered]@{}

if($Current.modules){
  foreach($P in $Current.modules.PSObject.Properties){
    $Modules[$P.Name] = $P.Value
  }
}

$Modules["market"] = [PSCustomObject]@{status=$Market.status;updatedAt=$Market.updatedAt;cryptoCount=$Crypto.Count;automation="windows-task-market-only"}
$Modules["btcChart"] = [PSCustomObject]@{status=$BtcChart.status;updatedAt=$BtcChart.updatedAt;automation="windows-task-market-only"}
$Modules["fastMarketStatus"] = [PSCustomObject]@{status=$Fast.status;updatedAt=$Fast.updatedAt;automation="windows-task-market-only"}

$UpdateStatus = [PSCustomObject]@{
  ok=$true
  updatedAt=$NowIso
  modules=$Modules
}

SaveJson $StatusPath $UpdateStatus

node --check $IndexPath 2>&1 | Out-File "$RunRoot\node-check.txt" -Encoding UTF8
$NodeExit = $LASTEXITCODE

if($NodeExit -eq 0){
  npx --yes wrangler@4.101.0 deploy .\src\index.js --name gnk-asg-direct-operator --assets .\public 2>&1 | Tee-Object "$RunRoot\deploy.log"
  $DeployExit = $LASTEXITCODE
}else{
  $DeployExit = -1
}

$Qa = foreach($Path in @("/data/market.json","/data/digital-assets.json","/data/btc_chart.json","/data/fast_market_status.json","/data/update_status.json")){
  try{
    $R = Invoke-WebRequest -UseBasicParsing -Uri "https://gnk-asg.hr$Path?cb=$(Get-Date -Format yyyyMMddHHmmss)" -TimeoutSec 35 -Headers @{
      "Cache-Control"="no-cache"
      "Pragma"="no-cache"
      "User-Agent"="GNK-ASG-Market-QA/1.0"
    }
    $Text = [string]$R.Content
    [PSCustomObject]@{
      Path=$Path
      Status=[int]$R.StatusCode
      Length=$Text.Length
      HasOk=$Text.Contains('"ok"')
      HasLive=$Text.Contains("LIVE")
      HasBtc=$Text.Contains("Bitcoin") -or $Text.Contains("BTC")
    }
  }catch{
    [PSCustomObject]@{
      Path=$Path
      Status="ERROR"
      Length=0
      HasOk=$false
      HasLive=$false
      HasBtc=$false
    }
  }
}

$Summary = [PSCustomObject]@{
  runRoot=$RunRoot
  nodeExit=$NodeExit
  deployExit=$DeployExit
  marketStatus=$Market.status
  btcChartStatus=$BtcChart.status
  generatedAt=$NowIso
}

SaveJson "$RunRoot\summary.json" $Summary
SaveJson "$RunRoot\qa.json" $Qa
SaveJson "$RunRoot\market.json" $Market
SaveJson "$RunRoot\btc_chart.json" $BtcChart

$Report = "$RunRoot\MARKET_ONLY_REFRESH_REPORT.txt"

"GNK ASG MARKET ONLY REFRESH REPORT" | Out-File $Report -Encoding UTF8
"RunRoot: $RunRoot" | Out-File $Report -Append -Encoding UTF8
"NodeExit: $NodeExit" | Out-File $Report -Append -Encoding UTF8
"DeployExit: $DeployExit" | Out-File $Report -Append -Encoding UTF8
"MarketStatus: $($Market.status)" | Out-File $Report -Append -Encoding UTF8
"BtcChartStatus: $($BtcChart.status)" | Out-File $Report -Append -Encoding UTF8
"GeneratedAt: $NowIso" | Out-File $Report -Append -Encoding UTF8
"" | Out-File $Report -Append -Encoding UTF8
$Qa | Format-Table Path,Status,Length,HasOk,HasLive,HasBtc -AutoSize | Out-String | Out-File $Report -Append -Encoding UTF8

Write-Host "===== MARKET ONLY REFRESH DONE ====="
Get-Content $Report -TotalCount 180
Write-Host "REPORT:"
Write-Host $Report
Write-Host "RUN_ROOT:"
Write-Host $RunRoot
