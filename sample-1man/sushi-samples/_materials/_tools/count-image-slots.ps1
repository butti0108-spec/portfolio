# Count image slots from drafts
$ErrorActionPreference = "Stop"
$sushi = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$total = 0
Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $j = Get-Content (Join-Path $_.FullName "draft.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  $p = [int]$j.draftCounts."about-photos"
  $w = [int]$j.draftCounts."works-list"
  $n = 1 + $p + $w
  $script:total += $n
  Write-Host ("{0} slots={1} (h1+p{2}+w{3})" -f $_.Name, $n, $p, $w)
}
Write-Host ("TOTAL_SLOTS=$total")
