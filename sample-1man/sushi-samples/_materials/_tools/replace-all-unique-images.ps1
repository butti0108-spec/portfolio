# Replace ALL sample images with globally unique files (no hash reuse).
# Primary: loremflickr tags + unique lock. Fallback: picsum id.
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding $false
$utf8Bom = New-Object System.Text.UTF8Encoding $true
$tools = $PSScriptRoot
$materials = Split-Path $tools -Parent
$sushi = Split-Path $materials -Parent

$folderTheme = @{
  "01-cafe-warm-a"="cafe"; "02-cafe-split-b"="florist"; "03-cafe-mix-ink-c"="bar"
  "04-salon-clinic-a"="salon"; "05-salon-sakura-b"="sweets"
  "06-bakery-brick-a"="bakery"; "07-bakery-cafe-c"="ramen"
  "08-bar-ink-b"="inn"; "09-bar-brick-a"="yoga"
  "10-clinic-green-a"="izakaya"; "11-clinic-clinic-b"="clinic"
  "12-florist-sakura-a"="pet"; "13-florist-green-c"="cowork"
  "14-ramen-brick-b"="gallery"; "15-ramen-ink-a"="bakery"
  "16-yoga-green-a"="salon"; "17-yoga-sakura-b"="bar"
  "18-studio-clinic-c"="studio"; "19-studio-ink-a"="ramen"
  "20-pet-cafe-b"="sweets"; "21-pet-sakura-a"="cafe"
  "22-cowork-clinic-b"="izakaya"; "23-cowork-green-a"="cowork"
  "24-sweets-sakura-c"="clinic"; "25-sweets-cafe-a"="bakery"
  "26-izakaya-brick-c"="studio"; "27-izakaya-ink-b"="inn"
  "28-gallery-ink-a"="yoga"; "29-gallery-clinic-c"="florist"
  "30-hotel-cafe-b"="gallery"
}

$tags = @{
  cafe = "coffee,cafe"
  florist = "flowers,bouquet"
  bar = "cocktail,bar"
  salon = "hairsalon,hairdresser"
  sweets = "dessert,cake"
  bakery = "bakery,bread"
  ramen = "ramen,noodles"
  inn = "hotel,bedroom"
  yoga = "yoga,meditation"
  izakaya = "izakaya,japanese-food"
  clinic = "doctor,clinic"
  pet = "dog,pet"
  cowork = "coworking,office"
  gallery = "artgallery,museum"
  studio = "photography,camera"
}

$usedHashes = @{}
$usedLocks = @{}
$lockSeq = 50000
$picsumSeq = 300
$ok = 0
$fail = 0
$manifest = New-Object System.Collections.Generic.List[string]
[void]$manifest.Add("# Unique image assignment 2026-09-09")
[void]$manifest.Add("")
[void]$manifest.Add("| folder | slot | source | key |")
[void]$manifest.Add("|--------|------|--------|-----|")

function Get-NextLock {
  while ($true) {
    $script:lockSeq++
    $k = [string]$script:lockSeq
    if (-not $script:usedLocks.ContainsKey($k)) {
      $script:usedLocks[$k] = $true
      return $script:lockSeq
    }
  }
}

function Download-Unique([string]$dest, [string]$theme, [string]$slotLabel) {
  $tag = $tags[$theme]
  if (-not $tag) { $tag = "shop,store" }
  $tmp = $dest + ".tmp"
  for ($attempt = 1; $attempt -le 8; $attempt++) {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
    $src = ""
    $key = ""
    try {
      if ($attempt -le 5) {
        $lock = Get-NextLock
        $key = "lock-$lock"
        $url = "https://loremflickr.com/1600/1000/$tag" + "?lock=$lock"
        $src = "loremflickr:$tag"
        Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 8
      } else {
        $script:picsumSeq++
        $pid = $script:picsumSeq
        $key = "picsum-$pid"
        $url = "https://picsum.photos/id/$pid/1600/1000.jpg"
        $src = "picsum"
        Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 8
      }
    } catch {
      continue
    }
    if (-not (Test-Path -LiteralPath $tmp)) { continue }
    $len = (Get-Item -LiteralPath $tmp).Length
    if ($len -lt 4000) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue; continue }
    $hash = (Get-FileHash -LiteralPath $tmp -Algorithm SHA256).Hash
    if ($script:usedHashes.ContainsKey($hash)) {
      Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
      continue
    }
    $script:usedHashes[$hash] = $slotLabel
    if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Force }
    Move-Item -LiteralPath $tmp -Destination $dest -Force
    return @{ ok = $true; source = $src; key = $key; hash = $hash }
  }
  return @{ ok = $false; source = ""; key = ""; hash = "" }
}

function Set-ImagePaths([string]$draftPath, [string]$folder, $pathMap) {
  $raw = [IO.File]::ReadAllText($draftPath, $utf8)
  $blockLines = New-Object System.Collections.Generic.List[string]
  [void]$blockLines.Add('    "imagePaths":  {')
  $keys = @($pathMap.Keys | Sort-Object)
  for ($i = 0; $i -lt $keys.Count; $i++) {
    $k = $keys[$i]
    $comma = if ($i -lt $keys.Count - 1) { "," } else { "" }
    [void]$blockLines.Add(('                       "{0}":  "{1}"{2}' -f $k, $pathMap[$k], $comma))
  }
  [void]$blockLines.Add('                    }')
  $newBlock = ($blockLines -join "`r`n")
  if ($raw -match '"imagePaths"\s*:') {
    $raw = [regex]::Replace($raw, '(?s)"imagePaths"\s*:\s*\{.*?\n\s*\}', $newBlock, 1)
  } else {
    $idx = $raw.LastIndexOf('"itemLayouts"')
    if ($idx -lt 0) { throw "no itemLayouts in $folder" }
    $before = $raw.Substring(0, $idx).TrimEnd().TrimEnd(',')
    $raw = $before + ",`r`n" + $newBlock + ",`r`n    " + $raw.Substring($idx)
  }
  $null = $raw | ConvertFrom-Json
  [IO.File]::WriteAllText($draftPath, $raw, $utf8)
}

Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $folder = $_.Name
  $theme = $folderTheme[$folder]
  if (-not $theme) { $theme = "cafe" }
  $draftPath = Join-Path $_.FullName "draft.json"
  $j = Get-Content $draftPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $pc = [int]$j.draftCounts."about-photos"
  $wc = [int]$j.draftCounts."works-list"
  if ($pc -lt 1) { $pc = 1 }
  if ($wc -lt 1) { $wc = 1 }

  $imgDir = Join-Path $_.FullName "images"
  New-Item -ItemType Directory -Force -Path $imgDir | Out-Null

  $slots = New-Object System.Collections.Generic.List[object]
  [void]$slots.Add(@{ file = "hero.jpg"; pathKey = "hero_image" })
  for ($i = 1; $i -le $pc; $i++) {
    [void]$slots.Add(@{ file = ("about-{0:d2}.jpg" -f $i); pathKey = ("about_image_" + $i) })
  }
  for ($i = 1; $i -le $wc; $i++) {
    [void]$slots.Add(@{ file = ("work-{0:d2}.jpg" -f $i); pathKey = ("work_" + $i + "_image") })
  }

  # remove leftover images not in slots
  $keep = @{}
  foreach ($s in $slots) { $keep[$s.file] = $true }
  Get-ChildItem -LiteralPath $imgDir -File -ErrorAction SilentlyContinue | ForEach-Object {
    if (-not $keep.ContainsKey($_.Name)) {
      Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
    }
  }

  $pathMap = @{}
  $srcLines = New-Object System.Collections.Generic.List[string]
  [void]$srcLines.Add("# Image sources — $folder")
  [void]$srcLines.Add("")
  [void]$srcLines.Add("Theme: $theme | Unique lock assignment (no reuse across 30 samples)")
  [void]$srcLines.Add("")
  [void]$srcLines.Add("| file | source | key |")
  [void]$srcLines.Add("|------|--------|-----|")

  foreach ($s in $slots) {
    $dest = Join-Path $imgDir $s.file
    $label = "$folder/$($s.file)"
    $r = Download-Unique $dest $theme $label
    if ($r.ok) {
      $script:ok++
      $rel = "sushi-samples/$folder/images/$($s.file)?v=uniq1"
      $pathMap[$s.pathKey] = $rel
      [void]$srcLines.Add(("| {0} | {1} | {2} |" -f $s.file, $r.source, $r.key))
      [void]$manifest.Add(("| {0} | {1} | {2} | {3} |" -f $folder, $s.file, $r.source, $r.key))
      Write-Host ("OK " + $label + " " + $r.key)
    } else {
      $script:fail++
      Write-Host ("FAIL " + $label)
    }
  }

  Set-ImagePaths $draftPath $folder $pathMap

  $notesDir = Join-Path $materials $folder
  New-Item -ItemType Directory -Force -Path $notesDir | Out-Null
  [IO.File]::WriteAllText((Join-Path $notesDir "SOURCES.md"), (($srcLines -join "`r`n") + "`r`n"), $utf8Bom)
}

$manPath = Join-Path $tools "unique-images-manifest.md"
[IO.File]::WriteAllText($manPath, (($manifest -join "`r`n") + "`r`n"), $utf8Bom)
Write-Host ("DONE ok=$ok fail=$fail uniqueHashes=$($usedHashes.Count)")
