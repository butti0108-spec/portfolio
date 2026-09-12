[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"
$sushi = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$mats = Split-Path $PSScriptRoot -Parent
Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $dj = Get-Content (Join-Path $_.FullName "draft.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  $cjPath = Join-Path $mats $_.Name "copy.json"
  $cht = "(missing)"
  $cbrand = ""
  if (Test-Path -LiteralPath $cjPath) {
    $cj = Get-Content $cjPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($cj.hero_title) { $cht = [string]$cj.hero_title }
    elseif ($cj.fields -and $cj.fields.hero_title) { $cht = [string]$cj.fields.hero_title }
    elseif ($cj.catch) { $cht = [string]$cj.catch }
    if ($cj.brand_name) { $cbrand = [string]$cj.brand_name }
    elseif ($cj.fields -and $cj.fields.brand_name) { $cbrand = [string]$cj.fields.brand_name }
  }
  $ht = [string]$dj.fields.hero_title
  $br = [string]$dj.fields.brand_name
  $flag = ""
  if ($ht.Length -lt 10) { $flag = " SHORT" }
  if ($ht -eq $br) { $flag += " SAME_AS_BRAND" }
  Write-Host ("{0} | hero={1} | brand={2} | copyHero={3} | copyBrand={4}{5}" -f $_.Name, $ht, $br, $cht, $cbrand, $flag)
}
