# Detect duplicate images across sushi-samples by SHA256
$ErrorActionPreference = "Stop"
$sushi = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$byHash = @{}
Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | ForEach-Object {
  $folder = $_.Name
  $imgDir = Join-Path $_.FullName "images"
  if (-not (Test-Path -LiteralPath $imgDir)) { return }
  Get-ChildItem -LiteralPath $imgDir -File | Where-Object { $_.Extension -match '\.(jpg|jpeg|png|webp)$' } | ForEach-Object {
    $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
    $label = "$folder/$($_.Name)"
    if (-not $byHash.ContainsKey($hash)) { $byHash[$hash] = New-Object System.Collections.Generic.List[string] }
    [void]$byHash[$hash].Add($label)
  }
}
$dups = $byHash.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 } | Sort-Object { -$_.Value.Count }
Write-Host ("unique_files_hashes=" + $byHash.Count)
Write-Host ("duplicate_groups=" + @($dups).Count)
$dups | Select-Object -First 40 | ForEach-Object {
  Write-Host ("--- count=" + $_.Value.Count + " ---")
  $_.Value | ForEach-Object { Write-Host ("  " + $_) }
}
