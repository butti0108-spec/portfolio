# Repair: fill missing/small images AND replace any duplicate hashes with unique picsum seeds.
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
  cafe = "coffee,cafe"; florist = "flowers,bouquet"; bar = "cocktail,bar"
  salon = "hairsalon,hairdresser"; sweets = "dessert,cake"; bakery = "bakery,bread"
  ramen = "ramen,noodles"; inn = "hotel,bedroom"; yoga = "yoga,meditation"
  izakaya = "japanese,restaurant"; clinic = "medical,hospital"; pet = "dog,cat"
  cowork = "office,desk"; gallery = "painting,art"; studio = "camera,photo"
}

# inventory current files
$entries = New-Object System.Collections.Generic.List[object]
Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $folder = $_.Name
  $draftPath = Join-Path $_.FullName "draft.json"
  $j = Get-Content $draftPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $pc = [Math]::Max(1, [int]$j.draftCounts."about-photos")
  $wc = [Math]::Max(1, [int]$j.draftCounts."works-list")
  $imgDir = Join-Path $_.FullName "images"
  New-Item -ItemType Directory -Force -Path $imgDir | Out-Null
  $slots = @()
  $slots += @{ file = "hero.jpg"; pathKey = "hero_image" }
  for ($i=1; $i -le $pc; $i++) { $slots += @{ file = ("about-{0:d2}.jpg" -f $i); pathKey = ("about_image_" + $i) } }
  for ($i=1; $i -le $wc; $i++) { $slots += @{ file = ("work-{0:d2}.jpg" -f $i); pathKey = ("work_" + $i + "_image") } }
  foreach ($s in $slots) {
    $dest = Join-Path $imgDir $s.file
    $hash = $null
    $len = 0
    if (Test-Path -LiteralPath $dest) {
      $len = (Get-Item -LiteralPath $dest).Length
      if ($len -gt 4000) { $hash = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash }
    }
    [void]$entries.Add([pscustomobject]@{
      Folder = $folder; File = $s.file; PathKey = $s.pathKey; Dest = $dest
      DraftPath = $draftPath; Theme = $(if ($folderTheme[$folder]) { $folderTheme[$folder] } else { "cafe" })
      Hash = $hash; Len = $len
    })
  }
}

# mark first occurrence of each hash as keeper; rest need replace
$seen = @{}
$toReplace = New-Object System.Collections.Generic.List[object]
foreach ($e in $entries) {
  $need = $false
  if ([string]::IsNullOrEmpty($e.Hash) -or $e.Len -lt 4000) {
    $need = $true
  } elseif ($seen.ContainsKey($e.Hash)) {
    $need = $true
  } else {
    $seen[$e.Hash] = "$($e.Folder)/$($e.File)"
  }
  if ($need) { [void]$toReplace.Add($e) }
}

Write-Host ("keep_unique=" + $seen.Count + " replace=" + $toReplace.Count)

$seedBase = 900000
$repaired = 0
$fail = 0

function Download-SeedUnique([string]$dest, [string]$theme, [string]$seed, [hashtable]$seenRef) {
  $tmp = $dest + ".tmp"
  $tag = $tags[$theme]
  if (-not $tag) { $tag = "shop" }
  $attempts = @(
    @{ url = ("https://picsum.photos/seed/{0}/1600/1000.jpg" -f $seed); label = "picsum-seed:$seed" },
    @{ url = ("https://loremflickr.com/1600/1000/{0}?lock={1}" -f $tag, $seed); label = "lf:$seed" },
    @{ url = ("https://picsum.photos/seed/{0}b/1600/1000.jpg" -f $seed); label = "picsum-seed:${seed}b" },
    @{ url = ("https://picsum.photos/seed/{0}c/1600/1000.jpg" -f $seed); label = "picsum-seed:${seed}c" }
  )
  foreach ($a in $attempts) {
    try {
      if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force -EA SilentlyContinue }
      Invoke-WebRequest -Uri $a.url -OutFile $tmp -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 8
      if (-not (Test-Path -LiteralPath $tmp)) { continue }
      if ((Get-Item -LiteralPath $tmp).Length -lt 4000) { continue }
      $hash = (Get-FileHash -LiteralPath $tmp -Algorithm SHA256).Hash
      if ($seenRef.ContainsKey($hash)) { continue }
      if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Force }
      Move-Item -LiteralPath $tmp -Destination $dest -Force
      return @{ ok = $true; hash = $hash; label = $a.label }
    } catch { continue }
  }
  return @{ ok = $false }
}

$n = 0
foreach ($e in $toReplace) {
  $n++
  $seed = ($seedBase + $n).ToString()
  # delete old duplicate first so we never keep it
  if (Test-Path -LiteralPath $e.Dest) { Remove-Item -LiteralPath $e.Dest -Force -EA SilentlyContinue }
  $r = Download-SeedUnique $e.Dest $e.Theme $seed $seen
  if ($r.ok) {
    $seen[$r.hash] = "$($e.Folder)/$($e.File)"
    $script:repaired++
    Write-Host ("FIX $($e.Folder)/$($e.File) $($r.label)")
  } else {
    $script:fail++
    Write-Host ("FAIL $($e.Folder)/$($e.File)")
  }
}

# refresh imagePaths for all drafts
Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $folder = $_.Name
  $draftPath = Join-Path $_.FullName "draft.json"
  $j = Get-Content $draftPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $pc = [Math]::Max(1, [int]$j.draftCounts."about-photos")
  $wc = [Math]::Max(1, [int]$j.draftCounts."works-list")
  $pathMap = @{}
  $pathMap["hero_image"] = "sushi-samples/$folder/images/hero.jpg?v=uniq2"
  for ($i=1; $i -le $pc; $i++) { $pathMap["about_image_$i"] = ("sushi-samples/$folder/images/about-{0:d2}.jpg?v=uniq2" -f $i) }
  for ($i=1; $i -le $wc; $i++) { $pathMap["work_${i}_image"] = ("sushi-samples/$folder/images/work-{0:d2}.jpg?v=uniq2" -f $i) }

  $raw = [IO.File]::ReadAllText($draftPath, $utf8)
  $blockLines = New-Object System.Collections.Generic.List[string]
  [void]$blockLines.Add('    "imagePaths":  {')
  $keys = @($pathMap.Keys | Sort-Object)
  for ($i=0; $i -lt $keys.Count; $i++) {
    $comma = if ($i -lt $keys.Count - 1) { "," } else { "" }
    [void]$blockLines.Add(('                       "{0}":  "{1}"{2}' -f $keys[$i], $pathMap[$keys[$i]], $comma))
  }
  [void]$blockLines.Add('                    }')
  $newBlock = ($blockLines -join "`r`n")
  if ($raw -match '"imagePaths"\s*:') {
    $raw = [regex]::Replace($raw, '(?s)"imagePaths"\s*:\s*\{.*?\n\s*\}', $newBlock, 1)
  }
  $null = $raw | ConvertFrom-Json
  [IO.File]::WriteAllText($draftPath, $raw, $utf8)
}

Write-Host ("DONE repaired=$repaired fail=$fail uniqueNow=$($seen.Count)")
