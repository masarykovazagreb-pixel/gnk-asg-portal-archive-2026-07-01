param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Token,
  [Parameter(Mandatory=$true)][string]$Action
)

$Url = "$BaseUrl/operator/direct?key=$Token&action=$Action"
Invoke-RestMethod -Uri $Url -Method GET
