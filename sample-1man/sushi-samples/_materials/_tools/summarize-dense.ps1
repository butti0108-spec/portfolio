$ErrorActionPreference = "Stop"
$sushi = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
Get-ChildItem $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $j = Get-Content -LiteralPath (Join-Path $_.FullName 'draft.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $lp = $j.layoutPattern
  $p = $j.draftCounts.'about-photos'
  $w = $j.draftCounts.'works-list'
  $pg = $j.itemLayouts.'about-photos'.gap
  $pr = $j.itemLayouts.'about-photos'.recipe
  $wg = $j.itemLayouts.'works-list'.gap
  $wr = $j.itemLayouts.'works-list'.recipe
  $h = $j.heroTextOnPhoto
  $plate = $j.heroTextPlate
  $hours = [string]$j.fields.hours_text
  $access = [string]$j.fields.access_text
  $addr = [string]$j.fields.address_text
  Write-Output ("{0} L={1} p={2}/{3}/{4} w={5}/{6}/{7} hero={8}/{9} hoursLen={10} accessLen={11} addrLen={12}" -f `
    $_.Name.Substring(0,2), $lp, $p, $pr, $pg, $w, $wr, $wg, $h, $plate, $hours.Length, $access.Length, $addr.Length)
}
