# Close imagePaths (or similar) object before itemLayouts; validate JSON.
$ErrorActionPreference = "Stop"
$sushi = Join-Path $PSScriptRoot "..\.."
$sushi = [System.IO.Path]::GetFullPath($sushi)
$fixed = 0
$bad = 0
Get-ChildItem -Path $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | ForEach-Object {
  $name = $_.Name
  $path = Join-Path $_.FullName "draft.json"
  $raw = [System.IO.File]::ReadAllText($path)
  $idx = $raw.LastIndexOf('"itemLayouts"')
  if ($idx -lt 0) {
    Write-Host ("SKIP no itemLayouts " + $name)
    return
  }
  $before = $raw.Substring(0, $idx).TrimEnd()
  if ($before.EndsWith(",")) {
    $before = $before.Substring(0, $before.Length - 1).TrimEnd()
  }
  if (-not $before.EndsWith("}")) {
    $before = $before + "`r`n                    }"
  }
  $after = $raw.Substring($idx)
  $rawNew = $before + ",`r`n    " + $after
  try {
    $null = $rawNew | ConvertFrom-Json
    [System.IO.File]::WriteAllText($path, $rawNew, [System.Text.UTF8Encoding]::new($false))
    Write-Host ("OK " + $name)
    $script:fixed++
  } catch {
    Write-Host ("BAD " + $name + " :: " + $_.Exception.Message)
    $script:bad++
  }
}
Write-Host ("fixed=$fixed bad=$bad")
