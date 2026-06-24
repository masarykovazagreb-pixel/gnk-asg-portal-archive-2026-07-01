$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportRoot = "G:\GNK\GNK_ASG_FULL_AUDIT_REPORT_$Stamp"
New-Item -ItemType Directory -Path $ReportRoot -Force | Out-Null
New-Item -ItemType Directory -Path "$ReportRoot\bodies" -Force | Out-Null
New-Item -ItemType Directory -Path "$ReportRoot\headers" -Force | Out-Null

$MainBase = "https://gnk-asg.hr"
$WorkerBase = "https://gnk-asg-direct-operator.beckuphome.workers.dev"
$NewsBase = "https://news.gnk-asg.hr"
$TokenFile = "G:\GNK\GNK_ASG_ACTIVE_WORKER\operator-token.txt"
$Token = ""
if(Test-Path -LiteralPath $TokenFile){
    $Token = (Get-Content -LiteralPath $TokenFile -Raw).Trim()
}

function Safe-Name {
    param([string]$Value)
    $Name = $Value -replace '^https?://','' -replace '[^a-zA-Z0-9._-]','_'
    if($Name.Length -gt 160){$Name=$Name.Substring(0,160)}
    return $Name
}

function Get-HeaderValue {
    param([string]$Headers,[string]$Name)
    $Matches = [regex]::Matches($Headers,"(?im)^" + [regex]::Escape($Name) + ":\s*(.+)$")
    if($Matches.Count -gt 0){return $Matches[$Matches.Count-1].Groups[1].Value.Trim()}
    return ""
}

function Get-RegexValue {
    param([string]$Text,[string]$Pattern)
    $M=[regex]::Match($Text,$Pattern,[System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if($M.Success){return [System.Net.WebUtility]::HtmlDecode($M.Groups[1].Value.Trim())}
    return ""
}

function Get-VisibleText {
    param([string]$Html)
    $Text=[regex]::Replace($Html,'<script[\s\S]*?</script>',' ','IgnoreCase')
    $Text=[regex]::Replace($Text,'<style[\s\S]*?</style>',' ','IgnoreCase')
    $Text=[regex]::Replace($Text,'<svg[\s\S]*?</svg>',' ','IgnoreCase')
    $Text=[regex]::Replace($Text,'<[^>]+>',' ')
    $Text=[System.Net.WebUtility]::HtmlDecode($Text)
    return [regex]::Replace($Text,'\s+',' ').Trim()
}

function Invoke-AuditRequest {
    param(
        [string]$Url,
        [string]$Method="GET",
        [hashtable]$Headers=@{},
        [int]$Timeout=90
    )

    $Name=Safe-Name $Url
    $BodyFile="$ReportRoot\bodies\$Name.body"
    $HeaderFile="$ReportRoot\headers\$Name.headers"
    $Args=@(
        "--silent",
        "--show-error",
        "--location",
        "--max-time",$Timeout,
        "--request",$Method,
        "--dump-header",$HeaderFile,
        "--output",$BodyFile,
        "--write-out","%{http_code}|%{url_effective}|%{time_total}|%{size_download}|%{content_type}|%{ssl_verify_result}",
        $Url
    )
    foreach($Key in $Headers.Keys){
        $Args=@($Args[0..($Args.Count-2)]) + @("--header","$Key`: $($Headers[$Key])") + @($Args[-1])
    }

    $Raw=& curl.exe @Args 2>&1
    $Exit=$LASTEXITCODE
    $Parts=([string]$Raw).Split("|")
    $Code=0
    if($Parts.Count -ge 1){[int]::TryParse($Parts[0],[ref]$Code)|Out-Null}
    $FinalUrl=if($Parts.Count -ge 2){$Parts[1]}else{""}
    $Time=if($Parts.Count -ge 3){$Parts[2]}else{""}
    $Size=if($Parts.Count -ge 4){$Parts[3]}else{"0"}
    $ContentType=if($Parts.Count -ge 5){$Parts[4]}else{""}
    $Ssl=if($Parts.Count -ge 6){$Parts[5]}else{""}
    $Body=if(Test-Path -LiteralPath $BodyFile){Get-Content -LiteralPath $BodyFile -Raw -ErrorAction SilentlyContinue}else{""}
    $HeaderText=if(Test-Path -LiteralPath $HeaderFile){Get-Content -LiteralPath $HeaderFile -Raw -ErrorAction SilentlyContinue}else{""}

    [pscustomobject]@{
        Url=$Url
        Method=$Method
        ExitCode=$Exit
        HttpCode=$Code
        FinalUrl=$FinalUrl
        Seconds=$Time
        Bytes=[int64]($Size -as [int64])
        ContentType=$ContentType
        SslVerifyResult=$Ssl
        CacheControl=Get-HeaderValue $HeaderText "cache-control"
        Hsts=Get-HeaderValue $HeaderText "strict-transport-security"
        Csp=Get-HeaderValue $HeaderText "content-security-policy"
        XContentTypeOptions=Get-HeaderValue $HeaderText "x-content-type-options"
        ReferrerPolicy=Get-HeaderValue $HeaderText "referrer-policy"
        PermissionsPolicy=Get-HeaderValue $HeaderText "permissions-policy"
        Server=Get-HeaderValue $HeaderText "server"
        CfRay=Get-HeaderValue $HeaderText "cf-ray"
        Location=Get-HeaderValue $HeaderText "location"
        Body=$Body
        Headers=$HeaderText
        BodyFile=$BodyFile
        HeaderFile=$HeaderFile
    }
}

$DnsResults=New-Object System.Collections.Generic.List[object]
foreach($HostName in @("gnk-asg.hr","www.gnk-asg.hr","news.gnk-asg.hr","operator.gnk-asg.hr","gnk-asg-direct-operator.beckuphome.workers.dev")){
    try{
        $Records=Resolve-DnsName $HostName -ErrorAction Stop
        foreach($Record in $Records){
            $DnsResults.Add([pscustomobject]@{
                Host=$HostName
                Type=$Record.Type
                IPAddress=$Record.IPAddress
                NameHost=$Record.NameHost
                Status="OK"
            })
        }
    }catch{
        $DnsResults.Add([pscustomobject]@{
            Host=$HostName
            Type=""
            IPAddress=""
            NameHost=""
            Status=$_.Exception.Message
        })
    }
}
$DnsResults | Export-Csv "$ReportRoot\dns.csv" -NoTypeInformation -Encoding UTF8

$PublicPaths=@(
    "/",
    "/en/",
    "/objave/",
    "/publications/",
    "/vijesti/",
    "/news/",
    "/trzista/",
    "/markets/",
    "/visual-index/",
    "/contact/",
    "/en/contact/",
    "/legal/",
    "/en/legal/",
    "/assistant/",
    "/en/assistant/",
    "/app/",
    "/operator-dashboard/",
    "/operator-mobile/",
    "/mail-studio/",
    "/auto-editor/"
)

$UrlResults=New-Object System.Collections.Generic.List[object]
$HtmlBodies=@{}

foreach($Path in $PublicPaths){
    $Url="$MainBase$Path"
    Write-Host "PUBLIC_TEST=$Url"
    $R=Invoke-AuditRequest -Url $Url
    $Html=$R.Body
    $Visible=Get-VisibleText $Html
    $Title=Get-RegexValue $Html '<title[^>]*>([\s\S]*?)</title>'
    $Canonical=Get-RegexValue $Html '<link[^>]+rel=["'']canonical["''][^>]+href=["'']([^"'']+)["'']'
    if(-not $Canonical){$Canonical=Get-RegexValue $Html '<link[^>]+href=["'']([^"'']+)["''][^>]+rel=["'']canonical["'']'}
    $HrAlt=Get-RegexValue $Html '<link[^>]+hreflang=["'']hr["''][^>]+href=["'']([^"'']+)["'']'
    $EnAlt=Get-RegexValue $Html '<link[^>]+hreflang=["'']en["''][^>]+href=["'']([^"'']+)["'']'
    $OgImage=Get-RegexValue $Html '<meta[^>]+property=["'']og:image["''][^>]+content=["'']([^"'']+)["'']'
    $Description=Get-RegexValue $Html '<meta[^>]+name=["'']description["''][^>]+content=["'']([^"'']+)["'']'
    $Lang=Get-RegexValue $Html '<html[^>]+lang=["'']([^"'']+)["'']'
    $Robots=Get-RegexValue $Html '<meta[^>]+name=["'']robots["''][^>]+content=["'']([^"'']+)["'']'
    $H1Count=[regex]::Matches($Html,'<h1\b','IgnoreCase').Count
    $ImgCount=[regex]::Matches($Html,'<img\b','IgnoreCase').Count
    $MissingAlt=[regex]::Matches($Html,'<img\b(?![^>]*\balt\s*=)[^>]*>','IgnoreCase').Count
    $LinkCount=[regex]::Matches($Html,'<a\b[^>]*\bhref\s*=','IgnoreCase').Count
    $Ids=[regex]::Matches($Html,'\bid=["'']([^"'']+)["'']','IgnoreCase') | ForEach-Object {$_.Groups[1].Value}
    $DuplicateIds=@($Ids | Group-Object | Where-Object {$_.Count -gt 1}).Count
    $Mojibake=$Html -match 'Ã.|Â.|â€|â€™|â€“|â€”|Å.|Ä.|�|ΓÇ|─|┼|╛|╕'
    $IndexGarbage=$Html -match 'Index\s*/\s*(?:<[^>]+>\s*)?(?:početna stranica|home page)'
    $Blank=($Visible.Length -lt 100)
    $NoIndex=$Robots -match 'noindex'
    $Ok=($R.HttpCode -eq 200 -and -not $Blank -and -not $IndexGarbage)

    $UrlResults.Add([pscustomobject]@{
        Url=$Url
        Http=$R.HttpCode
        FinalUrl=$R.FinalUrl
        Seconds=$R.Seconds
        Bytes=$R.Bytes
        ContentType=$R.ContentType
        Title=$Title
        VisibleChars=$Visible.Length
        H1Count=$H1Count
        Canonical=$Canonical
        HreflangHr=$HrAlt
        HreflangEn=$EnAlt
        Lang=$Lang
        DescriptionPresent=[bool]$Description
        Robots=$Robots
        OgImage=$OgImage
        LinkCount=$LinkCount
        ImageCount=$ImgCount
        ImagesMissingAlt=$MissingAlt
        DuplicateIds=$DuplicateIds
        Mojibake=$Mojibake
        ForbiddenIndexHeading=$IndexGarbage
        BlankPage=$Blank
        NoIndex=$NoIndex
        CacheControl=$R.CacheControl
        HstsPresent=[bool]$R.Hsts
        CspPresent=[bool]$R.Csp
        XContentTypeOptionsPresent=[bool]$R.XContentTypeOptions
        ReferrerPolicyPresent=[bool]$R.ReferrerPolicy
        PermissionsPolicyPresent=[bool]$R.PermissionsPolicy
        SslVerifyResult=$R.SslVerifyResult
        TestOK=$Ok
    })

    if($R.ContentType -match 'text/html'){
        $HtmlBodies[$Url]=$Html
    }
}
$UrlResults | Export-Csv "$ReportRoot\public-pages.csv" -NoTypeInformation -Encoding UTF8

$RedirectResults=New-Object System.Collections.Generic.List[object]
$RedirectUrls=@(
    "$NewsBase/",
    "$NewsBase/objave/chinese-e-commerce-giant-alibaba-sues-us-government-over-defence-blacklist/",
    "$MainBase/objave/chinese-e-commerce-giant-alibaba-sues-us-government-over-defence-blacklist/"
)
foreach($Url in $RedirectUrls){
    Write-Host "REDIRECT_TEST=$Url"
    $R=Invoke-AuditRequest -Url $Url
    $RedirectResults.Add([pscustomobject]@{
        Url=$Url
        Http=$R.HttpCode
        FinalUrl=$R.FinalUrl
        Location=$R.Location
        Bytes=$R.Bytes
        ContentType=$R.ContentType
        Redirected=($R.FinalUrl -and $R.FinalUrl -ne $Url)
        TestOK=($R.HttpCode -eq 200)
    })
}
$RedirectResults | Export-Csv "$ReportRoot\redirects.csv" -NoTypeInformation -Encoding UTF8

$DataPaths=@(
    "/data/auto-editor.json",
    "/data/news.json",
    "/data/news-automation-status.json",
    "/data/publication-automation-status.json",
    "/data/status.json",
    "/data/market.json",
    "/data/digital-assets.json",
    "/data/market-indices.json",
    "/data/exchanges.json",
    "/data/stablecoins.json",
    "/data/daily-market-brief.json"
)

$JsonResults=New-Object System.Collections.Generic.List[object]
$JsonPayloads=@{}
foreach($Path in $DataPaths){
    $Url="$MainBase$Path"
    Write-Host "JSON_TEST=$Url"
    $R=Invoke-AuditRequest -Url $Url
    $Valid=$false
    $RootType=""
    $Count=0
    $Updated=""
    $ErrorText=""
    $Payload=$null
    try{
        $Payload=$R.Body | ConvertFrom-Json
        $Valid=$true
        if($Payload -is [array]){
            $RootType="Array"
            $Count=@($Payload).Count
        }else{
            $RootType="Object"
            if($Payload.items){$Count=@($Payload.items).Count}
            elseif($Payload.data){$Count=@($Payload.data).Count}
            $Updated=[string]($Payload.updatedAt)
            if(-not $Updated){$Updated=[string]($Payload.generatedAt)}
            $ErrorText=[string]($Payload.error)
        }
        $JsonPayloads[$Path]=$Payload
    }catch{
        $ErrorText=$_.Exception.Message
    }
    $JsonResults.Add([pscustomobject]@{
        Url=$Url
        Http=$R.HttpCode
        Bytes=$R.Bytes
        ContentType=$R.ContentType
        ValidJson=$Valid
        RootType=$RootType
        ItemCount=$Count
        UpdatedAt=$Updated
        Error=$ErrorText
        CacheControl=$R.CacheControl
        TestOK=($R.HttpCode -eq 200 -and $Valid)
    })
}
$JsonResults | Export-Csv "$ReportRoot\json-endpoints.csv" -NoTypeInformation -Encoding UTF8

$OperatorHeaders=@{}
if($Token){$OperatorHeaders["x-operator-token"]=$Token}

$ProtectedTests=@(
    @{Path="/operator/article-repair";Expected="405"},
    @{Path="/operator/auto-editor/run";Expected="405"},
    @{Path="/operator/news-automation/run";Expected="405"},
    @{Path="/operator/news-refresh";Expected="405"},
    @{Path="/operator/publication-image/run";Expected="405"},
    @{Path="/operator/news-automation/status";Expected="200"},
    @{Path="/operator/publication-automation/status";Expected="200"},
    @{Path="/operator/status";Expected="200,404"},
    @{Path="/operator/system-health";Expected="200,404"},
    @{Path="/operator/logs";Expected="200,401,404"},
    @{Path="/operator/contact-inbox";Expected="200,401,404"}
)

$ProtectedResults=New-Object System.Collections.Generic.List[object]
foreach($Test in $ProtectedTests){
    $Url="$WorkerBase$($Test.Path)"
    Write-Host "PROTECTED_TEST=$Url"
    $R=Invoke-AuditRequest -Url $Url -Headers $OperatorHeaders
    $Expected=@($Test.Expected.Split(",") | ForEach-Object {[int]$_})
    $ValidJson=$false
    $Version=""
    $ErrorText=""
    try{
        $Payload=$R.Body | ConvertFrom-Json
        $ValidJson=$true
        $Version=[string]$Payload.version
        $ErrorText=[string]$Payload.error
    }catch{}
    $ProtectedResults.Add([pscustomobject]@{
        Url=$Url
        Http=$R.HttpCode
        Expected=$Test.Expected
        ValidJson=$ValidJson
        Version=$Version
        Error=$ErrorText
        TokenAvailable=[bool]$Token
        TestOK=($Expected -contains $R.HttpCode)
    })
}
$ProtectedResults | Export-Csv "$ReportRoot\protected-endpoints.csv" -NoTypeInformation -Encoding UTF8

$ArticleResults=New-Object System.Collections.Generic.List[object]
$ImageUrls=New-Object System.Collections.Generic.HashSet[string]
$Auto=$JsonPayloads["/data/auto-editor.json"]
$Articles=@()
if($Auto){
    if($Auto -is [array]){$Articles=@($Auto)}
    elseif($Auto.items){$Articles=@($Auto.items)}
}

function Get-WordCount {
    param($Value)
    return @(([string]$Value -split '\s+') | Where-Object {$_}).Count
}

function Local-Slugify {
    param([string]$Value)
    $FormD=$Value.Normalize([Text.NormalizationForm]::FormD)
    $Builder=New-Object Text.StringBuilder
    foreach($Char in $FormD.ToCharArray()){
        $Category=[Globalization.CharUnicodeInfo]::GetUnicodeCategory($Char)
        if($Category -ne [Globalization.UnicodeCategory]::NonSpacingMark){
            [void]$Builder.Append($Char)
        }
    }
    $Text=$Builder.ToString().Normalize([Text.NormalizationForm]::FormC).Replace("đ","d").Replace("Đ","D").ToLowerInvariant()
    $Text=[regex]::Replace($Text,'[^a-z0-9]+','-').Trim("-")
    if($Text.Length -gt 110){$Text=$Text.Substring(0,110).Trim("-")}
    return $Text
}

foreach($Article in $Articles){
    $Id=[string]$Article.id
    $Slug=[string]$Article.slug
    $TitleHr=[string]($Article.titleHr)
    $TitleEn=[string]($Article.titleEn)
    $Title=[string]($Article.title)
    $BodyHr=[string]($Article.bodyHr)
    $BodyEn=[string]($Article.bodyEn)
    $Body=[string]($Article.body)
    if(-not $BodyHr){$BodyHr=$Body}
    if(-not $BodyEn){$BodyEn=$Body}
    $WordsHr=Get-WordCount $BodyHr
    $WordsEn=Get-WordCount $BodyEn
    $SourcesCount=@($Article.sources).Count
    $Image=[string]$Article.image
    if($Image){
        if($Image.StartsWith("/")){$Image="$MainBase$Image"}
        [void]$ImageUrls.Add($Image)
    }
    $Seo=$Article.seo
    $SeoOk=[bool]($Seo -and $Seo.titleHr -and $Seo.titleEn -and $Seo.descriptionHr -and $Seo.descriptionEn -and ($Seo.canonical -or $Article.canonical))
    $HrRoute=if($Slug){"$MainBase/objave/$Slug/"}else{""}
    $EnRoute=if($Slug){"$MainBase/publications/$Slug/"}else{""}
    $ExpectedHrSlug=if($TitleHr){Local-Slugify $TitleHr}else{""}
    $ExpectedEnSlug=if($TitleEn){Local-Slugify $TitleEn}else{""}
    $SlugMismatch=[bool]($ExpectedHrSlug -and $Slug -and $Slug -ne $ExpectedHrSlug -and $Slug -eq $ExpectedEnSlug)
    $Mojibake=("$TitleHr $TitleEn $BodyHr $BodyEn") -match 'Ã.|Â.|â€|â€™|â€“|â€”|Å.|Ä.|�|ΓÇ|─|┼|╛|╕'

    $ArticleResults.Add([pscustomobject]@{
        Id=$Id
        Slug=$Slug
        TitleHr=$TitleHr
        TitleEn=$TitleEn
        WordsHr=$WordsHr
        WordsEn=$WordsEn
        Hr500=($WordsHr -ge 500)
        En500=($WordsEn -ge 500)
        Author=[string]$Article.author
        AuthorOK=([string]$Article.author -eq "Nermin Sefić")
        Sources=$SourcesCount
        SourcesOK=($SourcesCount -gt 0)
        Image=$Image
        ImagePresent=[bool]$Image
        SeoOK=$SeoOk
        Canonical=[string]($Article.canonical)
        PublishedAt=[string]($Article.publishedAt)
        HrRoute=$HrRoute
        EnRoute=$EnRoute
        ExpectedHrSlug=$ExpectedHrSlug
        SlugLanguageMismatch=$SlugMismatch
        Mojibake=$Mojibake
        Complete=($WordsHr -ge 500 -and $WordsEn -ge 500 -and [string]$Article.author -eq "Nermin Sefić" -and $SourcesCount -gt 0 -and [bool]$Image -and $SeoOk -and -not $Mojibake)
    })
}
$ArticleResults | Export-Csv "$ReportRoot\articles.csv" -NoTypeInformation -Encoding UTF8

$DuplicateResults=New-Object System.Collections.Generic.List[object]
foreach($Field in @("Id","Slug","TitleHr","TitleEn")){
    $ArticleResults |
        Where-Object {$_.$Field} |
        Group-Object -Property $Field |
        Where-Object {$_.Count -gt 1} |
        ForEach-Object {
            $DuplicateResults.Add([pscustomobject]@{
                Field=$Field
                Value=$_.Name
                Count=$_.Count
            })
        }
}
$DuplicateResults | Export-Csv "$ReportRoot\article-duplicates.csv" -NoTypeInformation -Encoding UTF8

$ArticleRouteResults=New-Object System.Collections.Generic.List[object]
foreach($Article in $ArticleResults | Select-Object -First 80){
    foreach($Pair in @(
        @{Language="HR";Url=$Article.HrRoute},
        @{Language="EN";Url=$Article.EnRoute}
    )){
        if(-not $Pair.Url){continue}
        Write-Host "ARTICLE_ROUTE_TEST=$($Pair.Url)"
        $R=Invoke-AuditRequest -Url $Pair.Url -Timeout 60
        $Visible=Get-VisibleText $R.Body
        $ArticleRouteResults.Add([pscustomobject]@{
            Id=$Article.Id
            Slug=$Article.Slug
            Language=$Pair.Language
            Url=$Pair.Url
            Http=$R.HttpCode
            FinalUrl=$R.FinalUrl
            Bytes=$R.Bytes
            VisibleChars=$Visible.Length
            HasTitle=($Visible -match [regex]::Escape(($Article.TitleHr,$Article.TitleEn | Where-Object {$_} | Select-Object -First 1)))
            HasAuthor=($Visible -match 'Nermin Sefić|Nermin Sefic')
            HasSources=($Visible -match 'Izvori informacija|Information sources')
            TestOK=($R.HttpCode -eq 200 -and $Visible.Length -gt 300)
        })
    }
}
$ArticleRouteResults | Export-Csv "$ReportRoot\article-routes.csv" -NoTypeInformation -Encoding UTF8

$ImageResults=New-Object System.Collections.Generic.List[object]
foreach($ImageUrl in $ImageUrls | Select-Object -First 80){
    Write-Host "IMAGE_TEST=$ImageUrl"
    $R=Invoke-AuditRequest -Url $ImageUrl -Timeout 60
    $ImageResults.Add([pscustomobject]@{
        Url=$ImageUrl
        Http=$R.HttpCode
        ContentType=$R.ContentType
        Bytes=$R.Bytes
        TestOK=($R.HttpCode -eq 200 -and $R.ContentType -match '^image/')
    })
}
$ImageResults | Export-Csv "$ReportRoot\article-images.csv" -NoTypeInformation -Encoding UTF8

$InternalLinks=New-Object System.Collections.Generic.HashSet[string]
foreach($Url in $HtmlBodies.Keys){
    $Html=$HtmlBodies[$Url]
    foreach($M in [regex]::Matches($Html,'(?:href|src)=["'']([^"'']+)["'']','IgnoreCase')){
        $Value=$M.Groups[1].Value.Trim()
        if($Value.StartsWith("#") -or $Value.StartsWith("mailto:") -or $Value.StartsWith("tel:") -or $Value.StartsWith("javascript:") -or $Value.StartsWith("data:")){continue}
        try{
            $Absolute=[uri]::new([uri]$Url,$Value).AbsoluteUri
            if(([uri]$Absolute).Host -in @("gnk-asg.hr","www.gnk-asg.hr","news.gnk-asg.hr")){
                [void]$InternalLinks.Add($Absolute.Split("#")[0])
            }
        }catch{}
    }
}

$LinkResults=New-Object System.Collections.Generic.List[object]
foreach($Link in $InternalLinks | Select-Object -First 180){
    Write-Host "LINK_TEST=$Link"
    $R=Invoke-AuditRequest -Url $Link -Timeout 45
    $LinkResults.Add([pscustomobject]@{
        Url=$Link
        Http=$R.HttpCode
        FinalUrl=$R.FinalUrl
        ContentType=$R.ContentType
        Bytes=$R.Bytes
        TestOK=($R.HttpCode -ge 200 -and $R.HttpCode -lt 400)
    })
}
$LinkResults | Export-Csv "$ReportRoot\internal-links.csv" -NoTypeInformation -Encoding UTF8

$LocalResults=New-Object System.Collections.Generic.List[object]
$Candidates=@(
    Get-ChildItem "G:\GNK" -Directory -Filter "GNK_ASG_LONGFORM_V3_FINAL_DEPLOY_*" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1,
    Get-Item "G:\GNK\GNK_ASG_ACTIVE_WORKER" -ErrorAction SilentlyContinue
) | Where-Object {$_}

foreach($Candidate in $Candidates){
    $Root=$Candidate.FullName
    $WorkerDir=if(Test-Path "$Root\workers\gnk-asg-direct-operator"){"$Root\workers\gnk-asg-direct-operator"}else{$Root}
    $Config="$WorkerDir\wrangler.dark-market.toml"
    $RepairConfig="$WorkerDir\wrangler.article-repair.toml"
    $Main=""
    if(Test-Path $Config){
        $Text=Get-Content $Config -Raw
        $Main=Get-RegexValue $Text '(?m)^\s*main\s*=\s*["'']([^"'']+)["'']'
    }
    $RepairMain=""
    if(Test-Path $RepairConfig){
        $Text=Get-Content $RepairConfig -Raw
        $RepairMain=Get-RegexValue $Text '(?m)^\s*main\s*=\s*["'']([^"'']+)["'']'
    }
    $GitCommit=""
    $GitStatus=""
    if(Test-Path "$Root\.git"){
        $GitCommit=(git -C $Root rev-parse HEAD 2>$null)
        $GitStatus=(git -C $Root status --porcelain 2>$null) -join "; "
    }
    $NodeFail=0
    $NodeFiles=@()
    if(Test-Path "$WorkerDir\src"){
        $NodeFiles=Get-ChildItem "$WorkerDir\src" -Filter "index*.js" -File -ErrorAction SilentlyContinue
        foreach($File in $NodeFiles){
            node --check $File.FullName *> $null
            if($LASTEXITCODE -ne 0){$NodeFail++}
        }
    }
    $LocalResults.Add([pscustomobject]@{
        Root=$Root
        WorkerDir=$WorkerDir
        DefaultConfigMain=$Main
        RepairConfigPresent=(Test-Path $RepairConfig)
        RepairConfigMain=$RepairMain
        ArticleRepairFilePresent=(Test-Path "$WorkerDir\src\index-article-repair-v1.js")
        UiHarmonizerPresent=(Test-Path "$WorkerDir\src\index-ui-harmonizer.js")
        NodeFiles=@($NodeFiles).Count
        NodeFailures=$NodeFail
        GitCommit=$GitCommit
        GitDirty=[bool]$GitStatus
        GitStatus=$GitStatus
    })
}
$LocalResults | Export-Csv "$ReportRoot\local-worker.csv" -NoTypeInformation -Encoding UTF8

$PublicFail=@($UrlResults | Where-Object {-not $_.TestOK}).Count
$JsonFail=@($JsonResults | Where-Object {-not $_.TestOK}).Count
$ProtectedFail=@($ProtectedResults | Where-Object {-not $_.TestOK}).Count
$ArticleIncomplete=@($ArticleResults | Where-Object {-not $_.Complete}).Count
$RouteFail=@($ArticleRouteResults | Where-Object {-not $_.TestOK}).Count
$ImageFail=@($ImageResults | Where-Object {-not $_.TestOK}).Count
$BrokenLinks=@($LinkResults | Where-Object {-not $_.TestOK}).Count
$MojibakePages=@($UrlResults | Where-Object {$_.Mojibake}).Count
$IndexHeadingPages=@($UrlResults | Where-Object {$_.ForbiddenIndexHeading}).Count
$ConfigMismatch=@($LocalResults | Where-Object {$_.DefaultConfigMain -ne "src/index-article-repair-v1.js"}).Count

$Critical=New-Object System.Collections.Generic.List[string]
if($PublicFail){$Critical.Add("$PublicFail javnih stranica nije prošlo osnovni test.")}
if($JsonFail){$Critical.Add("$JsonFail JSON endpointa nije ispravno.")}
if($ArticleIncomplete){$Critical.Add("$ArticleIncomplete članaka nema puni sadržaj, autora, izvore, sliku ili SEO.")}
if($RouteFail){$Critical.Add("$RouteFail jezičnih ruta članaka nije ispravno.")}
if($ImageFail){$Critical.Add("$ImageFail slika članaka nije dostupno.")}
if($BrokenLinks){$Critical.Add("$BrokenLinks internih poveznica nije ispravno.")}
if($MojibakePages){$Critical.Add("$MojibakePages stranica sadrži mojibake/encoding pogreške.")}
if($IndexHeadingPages){$Critical.Add("$IndexHeadingPages stranica još sadrži zabranjeni Index naslov.")}
if($ConfigMismatch){$Critical.Add("Zadani Wrangler entrypoint nije article-repair wrapper; sljedeći standardni deploy može vratiti staru verziju.")}
if(-not $Token){$Critical.Add("Operator token nije pronađen za zaštićene read-only provjere.")}

$Summary=[pscustomobject]@{
    AuditType="READ_ONLY"
    GeneratedAt=(Get-Date).ToString("o")
    ReportRoot=$ReportRoot
    PublicPages=@($UrlResults).Count
    PublicFailures=$PublicFail
    JsonEndpoints=@($JsonResults).Count
    JsonFailures=$JsonFail
    ProtectedEndpoints=@($ProtectedResults).Count
    ProtectedFailures=$ProtectedFail
    Articles=@($ArticleResults).Count
    IncompleteArticles=$ArticleIncomplete
    ArticleRoutes=@($ArticleRouteResults).Count
    ArticleRouteFailures=$RouteFail
    ArticleImages=@($ImageResults).Count
    ArticleImageFailures=$ImageFail
    InternalLinks=@($LinkResults).Count
    BrokenInternalLinks=$BrokenLinks
    MojibakePages=$MojibakePages
    ForbiddenIndexHeadingPages=$IndexHeadingPages
    ConfigMismatch=$ConfigMismatch
    TokenAvailable=[bool]$Token
    CriticalFindings=@($Critical)
}

$Summary | ConvertTo-Json -Depth 10 | Set-Content "$ReportRoot\summary.json" -Encoding UTF8
$Critical | Set-Content "$ReportRoot\critical-findings.txt" -Encoding UTF8

function Html-Encode([string]$Value){
    return [System.Net.WebUtility]::HtmlEncode($Value)
}

$Rows=($Critical | ForEach-Object {"<li>$(Html-Encode $_)</li>"}) -join ""
if(-not $Rows){$Rows="<li>Nema automatski utvrđenih kritičnih problema.</li>"}

$HtmlReport=@"
<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GNK ASG Full Read-Only Audit</title>
<style>
body{font-family:Arial,sans-serif;margin:0;background:#07101d;color:#eef3f8}
main{max-width:1200px;margin:auto;padding:32px}
h1,h2{color:#f0d27a}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.card{background:#10233c;border:1px solid #b99a45;border-radius:14px;padding:16px}
strong{font-size:1.6rem;display:block}
a{color:#f0d27a}
li{margin:8px 0}
code{background:#020812;padding:2px 6px;border-radius:5px}
</style>
</head>
<body>
<main>
<h1>GNK ASG Full Read-Only Audit</h1>
<p>Generirano: $(Html-Encode $Summary.GeneratedAt)</p>
<div class="grid">
<div class="card"><strong>$($Summary.PublicFailures)/$($Summary.PublicPages)</strong>javni problemi</div>
<div class="card"><strong>$($Summary.JsonFailures)/$($Summary.JsonEndpoints)</strong>JSON problemi</div>
<div class="card"><strong>$($Summary.IncompleteArticles)/$($Summary.Articles)</strong>nepotpuni članci</div>
<div class="card"><strong>$($Summary.ArticleRouteFailures)/$($Summary.ArticleRoutes)</strong>neispravne rute</div>
<div class="card"><strong>$($Summary.ArticleImageFailures)/$($Summary.ArticleImages)</strong>neispravne slike</div>
<div class="card"><strong>$($Summary.BrokenInternalLinks)/$($Summary.InternalLinks)</strong>neispravne poveznice</div>
</div>
<h2>Kritični nalazi</h2>
<ul>$Rows</ul>
<h2>Datoteke izvješća</h2>
<ul>
<li><code>public-pages.csv</code></li>
<li><code>json-endpoints.csv</code></li>
<li><code>protected-endpoints.csv</code></li>
<li><code>articles.csv</code></li>
<li><code>article-routes.csv</code></li>
<li><code>article-images.csv</code></li>
<li><code>internal-links.csv</code></li>
<li><code>local-worker.csv</code></li>
<li><code>dns.csv</code></li>
</ul>
</main>
</body>
</html>
"@

$HtmlReport | Set-Content "$ReportRoot\audit-report.html" -Encoding UTF8

Write-Host ""
Write-Host "READ_ONLY_AUDIT_COMPLETE=True"
Write-Host "PUBLIC_FAILURES=$PublicFail"
Write-Host "JSON_FAILURES=$JsonFail"
Write-Host "PROTECTED_FAILURES=$ProtectedFail"
Write-Host "ARTICLES=$(@($ArticleResults).Count)"
Write-Host "INCOMPLETE_ARTICLES=$ArticleIncomplete"
Write-Host "ARTICLE_ROUTE_FAILURES=$RouteFail"
Write-Host "ARTICLE_IMAGE_FAILURES=$ImageFail"
Write-Host "BROKEN_INTERNAL_LINKS=$BrokenLinks"
Write-Host "MOJIBAKE_PAGES=$MojibakePages"
Write-Host "FORBIDDEN_INDEX_HEADING_PAGES=$IndexHeadingPages"
Write-Host "CONFIG_MISMATCH=$ConfigMismatch"
Write-Host "REPORT_ROOT=$ReportRoot"
Write-Host "HTML_REPORT=$ReportRoot\audit-report.html"

Start-Process "$ReportRoot\audit-report.html"
Read-Host "Pritisnite Enter nakon što kopirate završne rezultate"
