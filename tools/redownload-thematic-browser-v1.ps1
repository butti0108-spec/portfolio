# Redownload thematic images for sushi samples (browser-audit follow-up).
# Prefer Unsplash short-ID download URLs when listed; else loremflickr unique locks.
$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..")
$sushi = Join-Path $repo "sample-1man\sushi-samples"
$materials = Join-Path $sushi "_materials"

# Theme tags for loremflickr (comma-separated)
$themeTags = @{
  cafe    = "cafe,coffee"
  florist = "florist,flowers,bouquet"
  bar     = "cocktail,bar,drink"
  salon   = "hair,salon,beauty"
  sweets  = "pastry,dessert,cake"
  bakery  = "bakery,bread,croissant"
  ramen   = "ramen,noodles,japanese-food"
  inn     = "ryokan,hotel,bedroom"
  yoga    = "yoga,meditation,studio"
  izakaya = "izakaya,japanese-food,sushi"
  clinic  = "clinic,medical,doctor"
  pet     = "dog,pet,puppy"
  cowork  = "coworking,office,desk"
  gallery = "art,gallery,museum"
  studio  = "photography,camera,studio"
}

# Folder -> theme (scene world, not folder name)
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

# Verified Unsplash short IDs (download?force=true works). Enough for first slots; rest use loremflickr.
$unsplashPool = @{
  cafe    = @("_yJXuiFdsPo","qjxO4-Q5aBI","nGvKQ_bHXew","XW6Jt8zqQ7Y","1Sf9SXfP_SQ","XCXz8r7xqYI","Yrz4n8qH6OY","K6nbY_jXq0E")
  florist = @("uplxLSVlsGc","f9tBxmBGI0Q","aDayubBta0E","qjyu_VfIZ9Y","f-ZDDZipyHw","JBmtmxPaLEk","RWBTjJZM9sY","sfgH9Z9vJZY")
  ramen   = @("jE9w1QSPr6E","iEm6W1jxa3k","TSedRIOmTsc","sHfo3WOgGTU","oT7_D-xRY6M","L1ZhjK-R6uc","WCs_7dT9oDs","Y7d5_xF-1mE")
  bakery  = @("Zp55tL3u7WU","WCs_7dT9oDs","Y7d5_xF-1mE","Zp55tL3u7WU","WCs_7dT9oDs","Y7d5_xF-1mE","Zp55tL3u7WU","WCs_7dT9oDs")
}

$slotsDefault = @("hero.jpg","about-01.jpg","about-02.jpg","about-03.jpg","about-04.jpg","work-01.jpg","work-02.jpg","work-03.jpg")
$skip = @("02-cafe-split-b")  # already browser-fixed

function Save-Url([string]$url, [string]$dest) {
  Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 8
  $len = (Get-Item -LiteralPath $dest).Length
  if ($len -lt 8000) { throw "too small $len" }
  return $len
}

$ok=0; $fail=0
$dirs = Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name
foreach ($dir in $dirs) {
  $folder = $dir.Name
  if ($skip -contains $folder) { Write-Host "SKIP $folder"; continue }
  $theme = $folderTheme[$folder]
  if (-not $theme) { $theme = "cafe" }
  $tags = $themeTags[$theme]
  $imgDir = Join-Path $dir.FullName "images"
  $matImg = Join-Path (Join-Path $materials $folder) "images"
  New-Item -ItemType Directory -Force -Path $imgDir | Out-Null
  New-Item -ItemType Directory -Force -Path $matImg | Out-Null

  $metaPath = Join-Path (Join-Path $materials $folder) "meta.json"
  $slots = $slotsDefault
  if (Test-Path -LiteralPath $metaPath) {
    try {
      $meta = Get-Content -LiteralPath $metaPath -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($meta.imageSlots -and $meta.imageSlots.Count -gt 0) { $slots = @($meta.imageSlots) }
    } catch {}
  }

  $sampleNum = [int]$folder.Substring(0,2)
  $pool = $unsplashPool[$theme]
  for ($i=0; $i -lt $slots.Count; $i++) {
    $slot = $slots[$i]
    $dest = Join-Path $imgDir $slot
    $got = $false
    $srcNote = ""
    if ($pool -and $i -lt $pool.Count -and $pool[$i]) {
      $sid = $pool[$i]
      $url = "https://unsplash.com/photos/$sid/download?force=true&w=1600"
      try {
        $len = Save-Url $url $dest
        $got = $true
        $srcNote = "unsplash:$sid"
        Write-Host "OK $folder $slot unsplash $len"
      } catch {
        Write-Host "unsplash-fail $folder $slot"
      }
    }
    if (-not $got) {
      $lock = 800000 + ($sampleNum * 100) + $i
      $url = "https://loremflickr.com/1600/1000/$tags" + "?lock=$lock"
      try {
        $len = Save-Url $url $dest
        $got = $true
        $srcNote = "loremflickr:${tags}:${lock}"
        Write-Host "OK $folder $slot lorem $len"
      } catch {
        Write-Host "FAIL $folder $slot $($_.Exception.Message)"
        $fail++
      }
    }
    if ($got) {
      Copy-Item -LiteralPath $dest -Destination (Join-Path $matImg $slot) -Force
      $ok++
    }
  }

  # bump draft imagePaths cache
  $draftPath = Join-Path $dir.FullName "draft.json"
  if (Test-Path -LiteralPath $draftPath) {
    $raw = [IO.File]::ReadAllText($draftPath, [Text.UTF8Encoding]::new($false))
    $j = $raw | ConvertFrom-Json
    if ($j.imagePaths) {
      foreach ($p in $j.imagePaths.PSObject.Properties) {
        $v = [string]$p.Value
        $v = ($v -split '\?')[0] + "?v=photo-fix-v1"
        $j.imagePaths.($p.Name) = $v
      }
      $j | Add-Member -NotePropertyName brushUpPhoto -NotePropertyValue "2026-09-15-browser-v1" -Force
      $json = $j | ConvertTo-Json -Depth 30
      [IO.File]::WriteAllText($draftPath, $json, [Text.UTF8Encoding]::new($false))
      Write-Host "draft bumped $folder"
    }
  }
}
Write-Host "DONE ok=$ok fail=$fail"
