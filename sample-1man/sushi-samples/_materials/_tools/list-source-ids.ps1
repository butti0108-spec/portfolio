# Extract all unsplash photo ids from SOURCES.md; list unique count
$ErrorActionPreference = "Stop"
$mats = Split-Path $PSScriptRoot -Parent
$ids = New-Object System.Collections.Generic.HashSet[string]
Get-ChildItem -LiteralPath $mats -Recurse -Filter "SOURCES.md" | ForEach-Object {
  $t = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
  if (-not $t) { return }
  [regex]::Matches($t, 'photo-([0-9]+-[a-zA-Z0-9]+)') | ForEach-Object {
    [void]$ids.Add($_.Groups[1].Value)
  }
}
Write-Host ("SOURCES_unique_ids=" + $ids.Count)
$ids | Sort-Object | Select-Object -First 30 | ForEach-Object { Write-Host $_ }
