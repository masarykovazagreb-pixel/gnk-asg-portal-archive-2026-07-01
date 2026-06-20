param(
  [Parameter(Mandatory=$true)][string]$CommandUrl,
  [Parameter(Mandatory=$true)][string]$Token,
  [Parameter(Mandatory=$true)][string]$CommandFile
)

$Body = Get-Content -Raw -Path $CommandFile

Invoke-RestMethod `
  -Uri $CommandUrl `
  -Method POST `
  -Headers @{ Authorization = "Bearer $Token" } `
  -ContentType "application/json" `
  -Body $Body
