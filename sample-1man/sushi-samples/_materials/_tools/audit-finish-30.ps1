$ErrorActionPreference = "Stop"
$sushi = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$thinList = New-Object System.Collections.Generic.List[string]
Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $j = Get-Content (Join-Path $_.FullName "draft.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  $p = [int]$j.draftCounts."about-photos"
  $w = [int]$j.draftCounts."works-list"
  $ink = [string]$j.draftColors.heroInk
  $ap = if ($j.imagePaths) { @($j.imagePaths.PSObject.Properties).Count } else { 0 }
  $il = if ($j.itemLayouts) { "Y" } else { "N" }
  $files = @(Get-ChildItem (Join-Path $_.FullName "images") -File -ErrorAction SilentlyContinue).Count
  $thin = New-Object System.Collections.Generic.List[string]
  if (([string]$j.fields.hero_title).Length -lt 8) { [void]$thin.Add("hero") }
  if (([string]$j.fields.value_1_text).Length -lt 20) { [void]$thin.Add("v1") }
  if (([string]$j.fields.work_1_text).Length -lt 12) { [void]$thin.Add("w1") }
  if (([string]$j.fields.about_lead).Length -lt 30) { [void]$thin.Add("about") }
  if ($p -lt 2 -or $w -lt 2) { [void]$thin.Add("count") }
  $t = ($thin -join ",")
  if ($t) { [void]$thinList.Add("$($_.Name):$t") }
  Write-Host ("{0} p={1} w={2} ink={3} paths={4} files={5} il={6} thin={7}" -f $_.Name, $p, $w, $ink, $ap, $files, $il, $t)
}
Write-Host ("THIN_COUNT=" + $thinList.Count)
$status = Join-Path (Split-Path $PSScriptRoot -Parent) "STATUS.md"
$wait = (Select-String -Path $status -Pattern "完成確認待ち").Count
$ng = (Select-String -Path $status -Pattern "要修正|\bNG\b").Count
Write-Host ("STATUS wait=$wait ngish=$ng")
