# Stamp first-team 24 drafts as copy-approved (ASCII-only)
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path ".").Path
$sushi = Join-Path $repo "sample-1man\sushi-samples"
$utf8 = New-Object System.Text.UTF8Encoding $false
$ids = @("01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","18","19","21","23","26","28","29","30")
$stamp = "2026-09-18-copy-approved"

foreach ($id in $ids) {
  $dir = Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like ($id + "-*") } | Select-Object -First 1
  $path = Join-Path $dir.FullName "draft.json"
  $t = [IO.File]::ReadAllText($path, $utf8)
  if ($t -match '"brushUpCopy"') {
    $t = [regex]::Replace($t, '"brushUpCopy"\s*:\s*"[^"]*"', '"brushUpCopy":"' + $stamp + '"', 1)
  } elseif ($t -match '"brushUpPhoto"\s*:\s*"[^"]*"') {
    $t = [regex]::Replace($t, '("brushUpPhoto"\s*:\s*"[^"]*")', '${1},"brushUpCopy":"' + $stamp + '"', 1)
  } else {
    $t = [regex]::Replace($t, '("version"\s*:\s*\d+,)', '${1}"brushUpCopy":"' + $stamp + '",', 1)
  }
  $null = $t | ConvertFrom-Json
  $tmp = Join-Path $env:TEMP ("copy-ok-" + $id + ".json")
  [IO.File]::WriteAllText($tmp, $t, $utf8)
  for ($a = 1; $a -le 10; $a++) {
    try { [IO.File]::Copy($tmp, $path, $true); break }
    catch { if ($a -eq 10) { throw }; Start-Sleep -Milliseconds (300 * $a) }
  }
  Remove-Item $tmp -Force -EA SilentlyContinue
  Write-Host "OK $id"
}
Write-Host "DONE"
