Set-Location "G:\GNK\GNK_ASG_ACTIVE_WORKER"

$Now = Get-Date
$NowIso = $Now.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$RunStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$RunRoot = "G:\GNK\GNK_ASG_NEWS_REFRESH_RUNS\$RunStamp"
$DataRoot = "G:\GNK\GNK_ASG_ACTIVE_WORKER\public\data"
$IndexPath = "G:\GNK\GNK_ASG_ACTIVE_WORKER\src\index.js"

New-Item -ItemType Directory -Path $RunRoot -Force | Out-Null
New-Item -ItemType Directory -Path $DataRoot -Force | Out-Null

function SaveJson($Path,$Obj){
  $Obj | ConvertTo-Json -Depth 30 | Set-Content -Path $Path -Encoding UTF8
}

function CleanText($Value){
  if($null -eq $Value){ return "" }
  $Text = [string]$Value
  $Text = $Text -replace "<!\[CDATA\[",""
  $Text = $Text -replace "\]\]>",""
  $Text = $Text -replace "<[^>]+>"," "
  $Text = [System.Net.WebUtility]::HtmlDecode($Text)
  $Text = $Text -replace "\s+"," "
  return $Text.Trim()
}

function ShortText($Value,$Max){
  $Text = CleanText $Value
  if($Text.Length -le $Max){ return $Text }
  return $Text.Substring(0,$Max)
}

function SafeId($Value){
  $Text = ([string]$Value).ToLower()
  $Text = $Text -replace "[^a-z0-9]+","-"
  $Text = $Text.Trim("-")
  if($Text.Length -gt 90){ return $Text.Substring(0,90) }
  return $Text
}

$Feeds = @(
  @{Source="BBC Business";Category="Business";Url="https://feeds.bbci.co.uk/news/business/rss.xml"},
  @{Source="BBC Technology";Category="Technology";Url="https://feeds.bbci.co.uk/news/technology/rss.xml"},
  @{Source="The Guardian Business";Category="Business";Url="https://www.theguardian.com/uk/business/rss"},
  @{Source="The Guardian Technology";Category="Technology";Url="https://www.theguardian.com/uk/technology/rss"}
)

$Items = @()
$Errors = @()

foreach($Feed in $Feeds){
  try{
    $Response = Invoke-WebRequest -UseBasicParsing -Uri $Feed.Url -TimeoutSec 35 -Headers @{
      "User-Agent"="GNK-ASG-News-Refresh/1.0"
      "Cache-Control"="no-cache"
      "Pragma"="no-cache"
    }

    [xml]$Xml = $Response.Content

    $Nodes = @()
    if($Xml.rss.channel.item){ $Nodes = @($Xml.rss.channel.item) }
    if($Nodes.Count -eq 0 -and $Xml.feed.entry){ $Nodes = @($Xml.feed.entry) }

    $I = 0

    foreach($Node in ($Nodes | Select-Object -First 10)){
      $Title = CleanText $Node.title
      $Summary = ShortText $Node.description 300

      if(-not $Summary){ $Summary = ShortText $Node.summary 300 }
      if(-not $Summary){ $Summary = ShortText $Node.content 300 }

      $Link = ""
      if($Node.link -is [string]){ $Link = [string]$Node.link }
      if(-not $Link -and $Node.link.href){ $Link = [string]$Node.link.href }
      if(-not $Link -and $Node.link.'#text'){ $Link = [string]$Node.link.'#text' }

      $Published = ""
      if($Node.pubDate){ $Published = [string]$Node.pubDate }
      if(-not $Published -and $Node.updated){ $Published = [string]$Node.updated }
      if(-not $Published -and $Node.published){ $Published = [string]$Node.published }
      if(-not $Published){ $Published = $NowIso }

      if($Title -and $Link){
        $Items += [PSCustomObject]@{
          id = SafeId ($Feed.Source + "-" + $I + "-" + $Title)
          title = $Title
          summary = $Summary
          url = $Link
          source = $Feed.Source
          category = $Feed.Category
          publishedAt = $Published
          date = $Published
        }
        $I++
      }
    }
  }catch{
    $Errors += [PSCustomObject]@{
      source = $Feed.Source
      error = $_.Exception.Message
    }
  }
}

$Seen = @{}
$Unique = @()

foreach($Item in $Items){
  $Key = $Item.url
  if(-not $Seen.ContainsKey($Key)){
    $Seen[$Key] = $true
    $Unique += $Item
  }
}

$Unique = @($Unique | Select-Object -First 18)

if($Unique.Count -eq 0){
  $Unique = @(
    [PSCustomObject]@{id="fallback-gnk-asg";title="GNK ASG portal - privremeni informativni zapis";summary="Automatizacija vijesti je aktivna, ali vanjski RSS izvor trenutačno nije vratio nove zapise.";url="/";source="GNK ASG";category="System";publishedAt=$NowIso;date=$NowIso},
    [PSCustomObject]@{id="fallback-market";title="Digital Exchange Monitor";summary="Market i digitalna imovina osvježavaju se u posebnom modulu.";url="/markets";source="GNK ASG";category="Market";publishedAt=$NowIso;date=$NowIso}
  )
  $Status = "FALLBACK"
}else{
  $Status = "LIVE"
}

$News = [PSCustomObject]@{
  ok = $true
  type = "news"
  status = $Status
  updatedAt = $NowIso
  ttlMinutes = 30
  count = $Unique.Count
  sources = @($Feeds | ForEach-Object { $_.Source })
  errors = $Errors
  items = $Unique
}

SaveJson "$DataRoot\news.json" $News
SaveJson "$DataRoot\business-news.json" $News
SaveJson "$DataRoot\latest-news.json" $News
SaveJson "$DataRoot\news_archive.json" ([PSCustomObject]@{
  ok = $true
  archive = $true
  updatedAt = $NowIso
  count = $Unique.Count
  items = $Unique
})

$StatusPath = "$DataRoot\update_status.json"

try{
  if(Test-Path $StatusPath){
    $Current = Get-Content $StatusPath -Raw | ConvertFrom-Json
  }else{
    $Current = [PSCustomObject]@{ok=$true;updatedAt=$NowIso;modules=[PSCustomObject]@{}}
  }
}catch{
  $Current = [PSCustomObject]@{ok=$true;updatedAt=$NowIso;modules=[PSCustomObject]@{}}
}

$Modules = [ordered]@{}

if($Current.modules){
  foreach($P in $Current.modules.PSObject.Properties){
    $Modules[$P.Name] = $P.Value
  }
}

$Modules["news"] = [PSCustomObject]@{
  status = $News.status
  updatedAt = $News.updatedAt
  count = $News.count
  automation = "windows-task-news-only"
}

$UpdateStatus = [PSCustomObject]@{
  ok = $true
  updatedAt = $NowIso
  modules = $Modules
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

$Qa = foreach($Path in @("/data/news.json","/data/business-news.json","/data/latest-news.json","/data/news_archive.json","/data/update_status.json")){
  try{
    $R = Invoke-WebRequest -UseBasicParsing -Uri "https://gnk-asg.hr$Path?cb=$(Get-Date -Format yyyyMMddHHmmss)" -TimeoutSec 35 -Headers @{
      "Cache-Control"="no-cache"
      "Pragma"="no-cache"
      "User-Agent"="GNK-ASG-News-QA/1.0"
    }
    $Text = [string]$R.Content
    [PSCustomObject]@{
      Path = $Path
      Status = [int]$R.StatusCode
      Length = $Text.Length
      HasOk = $Text.Contains('"ok"')
      HasLive = $Text.Contains("LIVE")
      HasFallback = $Text.Contains("FALLBACK")
      HasItems = $Text.Contains('"items"')
    }
  }catch{
    [PSCustomObject]@{
      Path = $Path
      Status = "ERROR"
      Length = 0
      HasOk = $false
      HasLive = $false
      HasFallback = $false
      HasItems = $false
    }
  }
}

$Summary = [PSCustomObject]@{
  runRoot = $RunRoot
  nodeExit = $NodeExit
  deployExit = $DeployExit
  newsStatus = $News.status
  newsCount = $News.count
  generatedAt = $NowIso
}

SaveJson "$RunRoot\summary.json" $Summary
SaveJson "$RunRoot\qa.json" $Qa
SaveJson "$RunRoot\news.json" $News

$Report = "$RunRoot\NEWS_ONLY_REFRESH_REPORT.txt"

"GNK ASG NEWS ONLY REFRESH REPORT" | Out-File $Report -Encoding UTF8
"RunRoot: $RunRoot" | Out-File $Report -Append -Encoding UTF8
"NodeExit: $NodeExit" | Out-File $Report -Append -Encoding UTF8
"DeployExit: $DeployExit" | Out-File $Report -Append -Encoding UTF8
"NewsStatus: $($News.status)" | Out-File $Report -Append -Encoding UTF8
"NewsCount: $($News.count)" | Out-File $Report -Append -Encoding UTF8
"GeneratedAt: $NowIso" | Out-File $Report -Append -Encoding UTF8
"" | Out-File $Report -Append -Encoding UTF8
$Qa | Format-Table Path,Status,Length,HasOk,HasLive,HasFallback,HasItems -AutoSize | Out-String | Out-File $Report -Append -Encoding UTF8

Write-Host "===== NEWS ONLY REFRESH DONE ====="
Get-Content $Report -TotalCount 180
Write-Host "REPORT:"
Write-Host $Report
Write-Host "RUN_ROOT:"
Write-Host $RunRoot
