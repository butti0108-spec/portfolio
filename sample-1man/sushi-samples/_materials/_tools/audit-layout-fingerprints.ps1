# Summarize layout fingerprints for collision audit (ASCII)
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding $false
$sushi = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$rows = @()
Get-ChildItem $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $j = [IO.File]::ReadAllText((Join-Path $_.FullName 'draft.json'), $utf8) | ConvertFrom-Json
  $ord = (@($j.layoutOrder) -join "-")
  $pr = $j.itemLayouts.'about-photos'
  $wr = $j.itemLayouts.'works-list'
  $pg = (@($pr.growDirs) -join ",")
  $wg = (@($wr.growDirs) -join ",")
  $pc = [int]$j.draftCounts.'about-photos'
  $wc = [int]$j.draftCounts.'works-list'
  $fp = "{0}|p{1}:{2}:{3}:{4}|w{5}:{6}:{7}:{8}|{9}" -f $j.layoutPattern, $pc, $pr.recipe, $pr.gap, $pg, $wc, $wr.recipe, $wr.gap, $wg, $ord
  $rows += [pscustomobject]@{ id=$_.Name.Substring(0,2); L=$j.layoutPattern; p=$pc; pr=$pr.recipe; pg=$pr.gap; w=$wc; wr=$wr.recipe; wg=$wr.gap; order=$ord; fp=$fp }
  Write-Output ("{0} L={1} p={2}/{3}/{4}[{5}] w={6}/{7}/{8}[{9}] ord={10}" -f $_.Name.Substring(0,2), $j.layoutPattern, $pc, $pr.recipe, $pr.gap, $pg, $wc, $wr.recipe, $wr.gap, $wg, $ord)
}
Write-Output "--- FINGERPRINT DUPES ---"
$groups = $rows | Group-Object fp | Where-Object { $_.Count -gt 1 }
if (-not $groups) { Write-Output "none" } else {
  $groups | ForEach-Object { Write-Output (("DUP x{0}: {1} :: {2}" -f $_.Count, (($_.Group | ForEach-Object id) -join ","), $_.Name)) }
}
Write-Output "--- ORDER-ONLY DUPES (same L+order) ---"
$rows | Group-Object { $_.L + "|" + $_.order } | Where-Object { $_.Count -gt 1 } | ForEach-Object {
  Write-Output (("ORD x{0}: {1}" -f $_.Count, (($_.Group | ForEach-Object id) -join ",")))
}
Write-Output "--- RECIPE PAIR DUPES ---"
$rows | Group-Object { "{0}|{1}/{2}" -f $_.L, $_.pr, $_.wr } | Where-Object { $_.Count -gt 1 } | ForEach-Object {
  Write-Output (("RCP x{0}: {1} :: {2}" -f $_.Count, (($_.Group | ForEach-Object id) -join ","), $_.Name))
}
