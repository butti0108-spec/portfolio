# Apply focalYs from tools/focal-ys-map.json onto all sushi sample drafts.
# Map keys: "folder|block|index" -> 0..100 step 5
$ErrorActionPreference = "Stop"
$Tools = $PSScriptRoot
$Root = Resolve-Path (Join-Path $Tools "..\sample-1man\sushi-samples")
$MapPath = Join-Path $Tools "focal-ys-map.json"
$utf8 = New-Object System.Text.UTF8Encoding $false

function Get-Prop($obj, $name) {
  if (-not $obj) { return $null }
  $p = $obj.PSObject.Properties[$name]
  if (-not $p) { return $null }
  return $p.Value
}

function Ensure-NoteProperty($obj, $name, $value) {
  if ($obj.PSObject.Properties[$name]) { $obj.$name = $value }
  else { $obj | Add-Member -NotePropertyName $name -NotePropertyValue $value -Force }
}

function Step5([double]$n) {
  $s = [Math]::Round($n / 5.0) * 5
  if ($s -lt 0) { return 0 }
  if ($s -gt 100) { return 100 }
  return [int]$s
}

$map = Get-Content -LiteralPath $MapPath -Raw -Encoding UTF8 | ConvertFrom-Json
$applied = 0
$folders = Get-ChildItem $Root -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name

foreach ($dir in $folders) {
  $folder = $dir.Name
  $file = Join-Path $dir.FullName "draft.json"
  $draft = Get-Content -LiteralPath $file -Raw -Encoding UTF8 | ConvertFrom-Json
  $changed = $false
  foreach ($block in @("about-photos", "works-list")) {
    $lay = Get-Prop $draft.itemLayouts $block
    if (-not $lay) { continue }
    $sizes = @($(Get-Prop $lay "sizes"))
    if (-not $sizes -or $sizes.Count -eq 0) { continue }
    $focal = New-Object System.Collections.Generic.List[int]
    for ($i = 0; $i -lt $sizes.Count; $i++) {
      $key = "$folder|$block|$i"
      $val = 50
      if ($map.PSObject.Properties[$key]) {
        $val = Step5 ([double](Get-Prop $map $key))
        $applied++
      }
      [void]$focal.Add($val)
    }
    Ensure-NoteProperty $lay "focalYs" @($focal)
    $changed = $true
  }
  if ($changed) {
    Ensure-NoteProperty $draft "brushUpFocal" "2026-09-15-v01"
    $json = $draft | ConvertTo-Json -Depth 40
    [System.IO.File]::WriteAllText($file, $json + "`n", $utf8)
    Write-Host "patched $folder"
  }
}
Write-Host "map hits=$applied"
