# Set all materials meta.json layoutPattern to a
$ErrorActionPreference = "Stop"
$mat = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) "_materials"
$n = 0
Get-ChildItem -Directory $mat | Where-Object { $_.Name -match '^\d{2}-' } | ForEach-Object {
  $p = Join-Path $_.FullName "meta.json"
  if (-not (Test-Path $p)) { return }
  $j = Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json
  $j.layoutPattern = "a"
  $json = $j | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText($p, $json, [System.Text.UTF8Encoding]::new($false))
  $n++
  Write-Host ("META {0} -> a" -f $_.Name)
}
Write-Host "DONE $n"
