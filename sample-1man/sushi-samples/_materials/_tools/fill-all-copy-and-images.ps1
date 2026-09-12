# Apply all copy.json -> draft.json, download Picsum (Unsplash-origin) images, SOURCES, imagePaths
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding $false
$tools = $PSScriptRoot
$materials = Split-Path $tools -Parent
$sushi = Split-Path $materials -Parent

function Get-StockUrl([string]$seed, [int]$w = 1600, [int]$h = 1000) {
  return "https://picsum.photos/seed/$seed/$w/$h.jpg"
}

function SlotToField([string]$slot) {
  switch ($slot) {
    "hero.jpg" { return "hero_image" }
    "about-01.jpg" { return "about_image_1" }
    "about-02.jpg" { return "about_image_2" }
    "about-03.jpg" { return "about_image_3" }
    "about-04.jpg" { return "about_image_4" }
    "work-01.jpg" { return "work_1_image" }
    "work-02.jpg" { return "work_2_image" }
    "work-03.jpg" { return "work_3_image" }
    default { return $null }
  }
}

function Apply-CopyToDraft([string]$folder) {
  $copyPath = Join-Path $materials (Join-Path $folder "copy.json")
  $metaPath = Join-Path $materials (Join-Path $folder "meta.json")
  $draftPath = Join-Path $sushi (Join-Path $folder "draft.json")
  if (-not (Test-Path -LiteralPath $copyPath)) { return $false }
  if (-not (Test-Path -LiteralPath $draftPath)) { return $false }
  $copy = [IO.File]::ReadAllText($copyPath, $utf8) | ConvertFrom-Json
  $draft = [IO.File]::ReadAllText($draftPath, $utf8) | ConvertFrom-Json
  foreach ($p in $copy.PSObject.Properties) {
    if ($p.Name -eq "note") { continue }
    $draft.fields | Add-Member -NotePropertyName $p.Name -NotePropertyValue ([string]$p.Value) -Force
  }
  if (Test-Path -LiteralPath $metaPath) {
    $meta = [IO.File]::ReadAllText($metaPath, $utf8) | ConvertFrom-Json
    if ($meta.counts) {
      foreach ($p in $meta.counts.PSObject.Properties) {
        $draft.draftCounts | Add-Member -NotePropertyName $p.Name -NotePropertyValue ([int]$p.Value) -Force
      }
    }
    if ($meta.extras) {
      foreach ($p in $meta.extras.PSObject.Properties) {
        $draft.draftExtras | Add-Member -NotePropertyName $p.Name -NotePropertyValue $p.Value -Force
      }
    }
    if ($meta.fonts) {
      $draft.fonts = $meta.fonts
      $draft.fields | Add-Member font_display $meta.fonts.display -Force
      $draft.fields | Add-Member font_catch $meta.fonts.catch -Force
      $draft.fields | Add-Member font_body $meta.fonts.body -Force
    }
    if ($meta.layoutPattern) { $draft.layoutPattern = $meta.layoutPattern }
    if ($meta.layoutOrder) { $draft.layoutOrder = $meta.layoutOrder }
    if ($meta.scene) { $draft.scene = $meta.scene }
    if ($meta.colorKey) { $draft.chosenPresetKey = $meta.colorKey }
  }
  $draft.savedAt = [DateTime]::UtcNow.ToString("o")
  [IO.File]::WriteAllText($draftPath, ($draft | ConvertTo-Json -Depth 40), $utf8)
  return $true
}

function Download-Slot([string]$folder, [string]$slot) {
  $imgDir = Join-Path $sushi (Join-Path $folder "images")
  New-Item -ItemType Directory -Force -Path $imgDir | Out-Null
  $matImg = Join-Path $materials (Join-Path $folder "images")
  New-Item -ItemType Directory -Force -Path $matImg | Out-Null
  $dest = Join-Path $imgDir $slot
  $seed = ($folder + "-" + $slot).Replace(".", "-")
  $url = Get-StockUrl $seed
  try {
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 5
    Copy-Item -LiteralPath $dest -Destination (Join-Path $matImg $slot) -Force
    return @{ ok = $true; url = $url }
  } catch {
    $url2 = Get-StockUrl ($seed + "-b")
    try {
      Invoke-WebRequest -Uri $url2 -OutFile $dest -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 5
      Copy-Item -LiteralPath $dest -Destination (Join-Path $matImg $slot) -Force
      return @{ ok = $true; url = $url2 }
    } catch {
      return @{ ok = $false; url = $url; error = $_.Exception.Message }
    }
  }
}

$folders = Get-ChildItem -LiteralPath $materials -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name
$okApply = 0
$okImg = 0
$failImg = 0

foreach ($dir in $folders) {
  $folder = $dir.Name
  Write-Host ("=== " + $folder + " ===")
  if (Apply-CopyToDraft $folder) {
    $okApply++
    Write-Host "  copy->draft OK"
  }

  $metaPath = Join-Path $dir.FullName "meta.json"
  if (-not (Test-Path -LiteralPath $metaPath)) { continue }
  $meta = [IO.File]::ReadAllText($metaPath, $utf8) | ConvertFrom-Json
  $slots = @($meta.imageSlots)
  if (-not $slots -or $slots.Count -eq 0) {
    $slots = @("hero.jpg", "about-01.jpg", "work-01.jpg")
  }

  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("# Photo sources - $folder")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("Provider: Lorem Picsum (photos from Unsplash). Commercial use OK. https://picsum.photos https://unsplash.com/license")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("| file | fetch_url | license | note |")
  [void]$sb.AppendLine("|------|-----------|---------|------|")

  $imagePaths = @{}
  foreach ($slot in $slots) {
    $res = Download-Slot $folder $slot
    if ($res.ok) {
      $okImg++
      [void]$sb.AppendLine("| $slot | $($res.url) | Unsplash via Picsum | seed=$folder-$slot |")
      $field = SlotToField $slot
      if ($field) { $imagePaths[$field] = "sushi-samples/$folder/images/$slot" }
      Write-Host ("  img " + $slot + " OK")
    } else {
      $failImg++
      [void]$sb.AppendLine("| $slot | $($res.url) | - | FAIL |")
      Write-Host ("  img " + $slot + " FAIL")
    }
  }
  [IO.File]::WriteAllText((Join-Path $dir.FullName "SOURCES.md"), $sb.ToString(), $utf8)

  $draftPath = Join-Path $sushi (Join-Path $folder "draft.json")
  if (Test-Path -LiteralPath $draftPath) {
    $draft = [IO.File]::ReadAllText($draftPath, $utf8) | ConvertFrom-Json
    $ip = New-Object psobject
    foreach ($k in $imagePaths.Keys) {
      $ip | Add-Member -NotePropertyName $k -NotePropertyValue $imagePaths[$k] -Force
    }
    $draft | Add-Member -NotePropertyName imagePaths -NotePropertyValue $ip -Force
    [IO.File]::WriteAllText($draftPath, ($draft | ConvertTo-Json -Depth 40), $utf8)
  }

  $meta | Add-Member -NotePropertyName status -NotePropertyValue "text+images" -Force
  [IO.File]::WriteAllText($metaPath, ($meta | ConvertTo-Json -Depth 20), $utf8)
}

Write-Host ("DONE apply=" + $okApply + " imgOk=" + $okImg + " imgFail=" + $failImg)
