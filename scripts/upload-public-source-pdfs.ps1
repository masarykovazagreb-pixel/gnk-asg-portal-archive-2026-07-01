$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$SearchRoots = @(
    "$env:USERPROFILE\Downloads",
    "$env:USERPROFILE\Desktop",
    "$env:USERPROFILE\OneDrive\Desktop",
    "$env:USERPROFILE\OneDrive\Radna površina",
    'G:\GNK'
) | Where-Object { Test-Path $_ }

function Find-GnkPdf {
    param([string[]]$Names)
    foreach ($Root in $SearchRoots) {
        foreach ($Name in $Names) {
            $Direct = Join-Path $Root $Name
            if (Test-Path $Direct -PathType Leaf) { return (Resolve-Path $Direct).Path }
        }
    }
    foreach ($Root in $SearchRoots) {
        $Found = Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $Names -contains $_.Name } |
            Select-Object -First 1
        if ($Found) { return $Found.FullName }
    }
    throw "Nije pronađen PDF: $($Names -join ', ')"
}

$Documents = @(
    [ordered]@{
        Source = Find-GnkPdf @('GNK_ASG_2025_FINALNO (2).pdf','GNK_ASG_2025_FINALNO.pdf')
        Filename = 'GNK_ASG_Audited_Financial_Statements_2025.pdf'
        Title = 'GNK ASG audited 2025'
        Alt = 'GNK ASG d.o.o. Independent Auditor Report and Financial Statements 2025'
        Caption = 'Independent auditor report and audited financial statements for GNK ASG d.o.o. for FY 2025.'
    }
    [ordered]@{
        Source = Find-GnkPdf @('gnk dinamo ltd.pdf','GNK DINAMO LTD.pdf','GNK_DINAMO_Ltd.pdf')
        Filename = 'GNK_DINAMO_Ltd_Consolidated_Financial_Report_2025.pdf'
        Title = 'GNK DINAMO consolidated 2025'
        Alt = 'GNK DINAMO Ltd. Consolidated Financial Report of the Group FY 2025'
        Caption = 'Management-certified and internally reviewed consolidated financial report; not independently audited.'
    }
    [ordered]@{
        Source = Find-GnkPdf @('CERT_GS_D (3).pdf','CERT_GS_D.pdf')
        Filename = 'GNK_DINAMO_Ltd_Certificate_of_Good_Standing_2026.pdf'
        Title = 'GNK DINAMO Good Standing'
        Alt = 'GNK DINAMO Ltd. Colorado Certificate of Fact of Good Standing 2026'
        Caption = 'Official Colorado Secretary of State Certificate of Fact of Good Standing issued 16 June 2026.'
    }
)

$Results = foreach ($Document in $Documents) {
    $Bytes = [System.IO.File]::ReadAllBytes($Document.Source)
    if ($Bytes.Length -gt 15MB) { throw "Datoteka je veća od 15 MB: $($Document.Source)" }
    if ([System.Text.Encoding]::ASCII.GetString($Bytes,0,[Math]::Min(5,$Bytes.Length)) -notlike '%PDF-*') {
        throw "Datoteka nije valjani PDF: $($Document.Source)"
    }

    $Payload = [ordered]@{
        filename = $Document.Filename
        mime = 'application/pdf'
        base64 = [Convert]::ToBase64String($Bytes)
        folder = 'public-documents'
        title = $Document.Title
        alt = $Document.Alt
        caption = $Document.Caption
    } | ConvertTo-Json -Compress

    $Response = Invoke-RestMethod -Method Post -Uri 'https://gnk-asg.hr/api/media-upload' -ContentType 'application/json; charset=utf-8' -Body $Payload
    if (-not $Response.ok) { throw "Upload nije uspio: $($Response | ConvertTo-Json -Depth 8)" }

    [pscustomobject]@{
        Source = $Document.Source
        Filename = $Document.Filename
        SizeBytes = $Bytes.Length
        PublicUrl = $Response.asset.newsProxyUrl
        R2Key = $Response.asset.key
        Uploaded = $Response.ok
    }
}

$Results | Format-Table -AutoSize

$AssetList = Invoke-RestMethod -Method Get -Uri 'https://gnk-asg.hr/api/admin-asset-list?cb=20260624'
$Required = @(
    'GNK_ASG_Audited_Financial_Statements_2025.pdf',
    'GNK_DINAMO_Ltd_Consolidated_Financial_Report_2025.pdf',
    'GNK_DINAMO_Ltd_Certificate_of_Good_Standing_2026.pdf'
)
$Available = @($AssetList.items | ForEach-Object { $_.filename })
$Missing = @($Required | Where-Object { $_ -notin $Available })
if ($Missing.Count -gt 0) { throw "Nedostaju javni dokumenti nakon uploada: $($Missing -join ', ')" }

[pscustomobject]@{
    UploadOK = $true
    DocumentsUploaded = $Results.Count
    MissingAfterUpload = $Missing.Count
    DownloadCentreHR = 'https://gnk-asg.hr/downloads/'
    DownloadCentreEN = 'https://gnk-asg.hr/en/downloads/'
} | Format-List
