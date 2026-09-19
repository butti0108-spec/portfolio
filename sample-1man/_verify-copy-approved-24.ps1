$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'sushi-samples'
$ids = @('01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','18','19','21','23','26','28','29','30')
$want = '2026-09-18-copy-approved'
$bad = @()
foreach ($id in $ids) {
  $dir = Get-ChildItem -LiteralPath $root -Directory | Where-Object { $_.Name -like ($id + '-*') } | Select-Object -First 1
  if (-not $dir) { $bad += "$id=MISSING_DIR"; continue }
  $j = Get-Content -LiteralPath (Join-Path $dir.FullName 'draft.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($j.brushUpCopy -ne $want) { $bad += "$id=$($j.brushUpCopy)" }
}
if ($bad.Count -eq 0) { Write-Output "ALL_OK count=$($ids.Count)" } else { Write-Output ("BAD:" + ($bad -join ',')); exit 1 }

# spot: clear residuals
function Get-Draft($id) {
  $dir = Get-ChildItem -LiteralPath $root -Directory | Where-Object { $_.Name -like ($id + '-*') } | Select-Object -First 1
  Get-Content -LiteralPath (Join-Path $dir.FullName 'draft.json') -Raw -Encoding UTF8 | ConvertFrom-Json
}
$f04 = (Get-Draft '04').fields
$f12 = (Get-Draft '12').fields
$f16 = (Get-Draft '16').fields
$f29 = (Get-Draft '29').fields
Write-Output "04 hours=$($f04.hours)"
Write-Output "04 hours_note=$($f04.hours_note)"
Write-Output "12 access=$($f12.access)"
Write-Output "12 hours=$($f12.hours)"
Write-Output "16 hours=$($f16.hours)"
Write-Output "16 hours_note=$($f16.hours_note)"
Write-Output "29 address=$($f29.address)"
Write-Output "29 access=$($f29.access)"
Write-Output 'SPOT_DONE'
