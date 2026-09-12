$ErrorActionPreference = "Stop"
$sushi = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $j = Get-Content (Join-Path $_.FullName "draft.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  $ht = [string]$j.fields.hero_title
  if ($ht.Length -lt 10) {
    Write-Host ("{0}`t{1}`tlen={2}" -f $_.Name, $ht, $ht.Length)
  }
}
