# Replace all red-bar Tombili cat images (hash E3430878...) with unique thematic Unsplash photos.
$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..")
$sushi = Join-Path $repo "sample-1man\sushi-samples"
$materials = Join-Path $sushi "_materials"
$badHash = "E3430878B4433A3CF303652F9539E31B"
$tmpRoot = Join-Path $env:TEMP ("fix-red-bar-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null

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

# Short Unsplash IDs (download?force=true). Enough unique picks; rotate with offset per file.
$pool = @{
  cafe    = @("_yJXuiFdsPo","FiQUUohIeZU","JqcaqsAqVW4","f_i4EVPDsnQ","lqmAr-nO2Q8","Vpl1ZAwuMic")
  florist = @("uplxLSVlsGc","f9tBxmBGI0Q","aDayubBta0E","qjyu_VfIZ9Y","f-ZDDZipyHw")
  bar     = @("_yJXuiFdsPo","FiQUUohIeZU","f_i4EVPDsnQ","lqmAr-nO2Q8")  # drink-adjacent fallbacks; prefer more below
  salon   = @("FiQUUohIeZU","JqcaqsAqVW4","f_i4EVPDsnQ")
  sweets  = @("FiQUUohIeZU","JqcaqsAqVW4","f_i4EVPDsnQ","lqmAr-nO2Q8","Vpl1ZAwuMic")
  bakery  = @("FiQUUohIeZU","JqcaqsAqVW4","f_i4EVPDsnQ","lqmAr-nO2Q8","Vpl1ZAwuMic")
  ramen   = @("jE9w1QSPr6E","iEm6W1jxa3k","TSedRIOmTsc")
  inn     = @("sfgH9Z9vJZY","f-ZDDZipyHw","_yJXuiFdsPo","Vpl1ZAwuMic","FiQUUohIeZU","lqmAr-nO2Q8","f_i4EVPDsnQ","JqcaqsAqVW4")
  yoga    = @("aDayubBta0E","f9tBxmBGI0Q","uplxLSVlsGc")
  izakaya = @("jE9w1QSPr6E","iEm6W1jxa3k","TSedRIOmTsc","FiQUUohIeZU")
  clinic  = @("TSedRIOmTsc","iEm6W1jxa3k","jE9w1QSPr6E")
  pet     = @("f9tBxmBGI0Q","aDayubBta0E","uplxLSVlsGc","qjyu_VfIZ9Y")
  cowork  = @("_yJXuiFdsPo","Vpl1ZAwuMic","f_i4EVPDsnQ","lqmAr-nO2Q8")
  gallery = @("qjyu_VfIZ9Y","f-ZDDZipyHw","uplxLSVlsGc","aDayubBta0E","f9tBxmBGI0Q")
  studio  = @("Vpl1ZAwuMic","_yJXuiFdsPo","f_i4EVPDsnQ","FiQUUohIeZU")
}

# Extra global Unsplash IDs to pad uniqueness (landscape stock)
$extra = @(
  "jE9w1QSPr6E","iEm6W1jxa3k","TSedRIOmTsc","_yJXuiFdsPo","FiQUUohIeZU","JqcaqsAqVW4",
  "f_i4EVPDsnQ","lqmAr-nO2Q8","Vpl1ZAwuMic","uplxLSVlsGc","f9tBxmBGI0Q","aDayubBta0E",
  "qjyu_VfIZ9Y","f-ZDDZipyHw"
)

$usedHashes = New-Object 'System.Collections.Generic.HashSet[string]'
# seed with existing non-bad hashes so we don't collide
Get-ChildItem $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | ForEach-Object {
  $imgDir = Join-Path $_.FullName "images"
  if (-not (Test-Path $imgDir)) { return }
  Get-ChildItem $imgDir -Filter "*.jpg" -ErrorAction SilentlyContinue | ForEach-Object {
    $h = (Get-FileHash $_.FullName -Algorithm MD5).Hash
    if ($h -ne $badHash) { [void]$usedHashes.Add($h) }
  }
}

function Get-BadSlots {
  $list = @()
  Get-ChildItem $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
    $folder = $_.Name
    $imgDir = Join-Path $_.FullName "images"
    if (-not (Test-Path $imgDir)) { return }
    Get-ChildItem $imgDir -Filter "*.jpg" | ForEach-Object {
      $h = (Get-FileHash $_.FullName -Algorithm MD5).Hash
      if ($h -eq $badHash) {
        $list += [pscustomobject]@{ folder=$folder; file=$_.Name; path=$_.FullName }
      }
    }
  }
  return $list
}

function Save-UniqueImage([string]$folder, [string]$file, [string]$theme, [int]$index) {
  $ids = @()
  if ($pool.ContainsKey($theme)) { $ids += $pool[$theme] }
  $ids += $extra
  $ids = $ids | Select-Object -Unique
  $dest = Join-Path (Join-Path $sushi $folder) (Join-Path "images" $file)
  $matDir = Join-Path (Join-Path $materials $folder) "images"
  New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent), $matDir | Out-Null

  $attempts = 0
  foreach ($sid in $ids) {
    # rotate start
  }
  $start = $index % [Math]::Max(1, $ids.Count)
  $ordered = @()
  for ($k=0; $k -lt $ids.Count; $k++) { $ordered += $ids[($start + $k) % $ids.Count] }

  foreach ($sid in $ordered) {
    $attempts++
    $td = Join-Path $tmpRoot ("$folder-$file-$sid.jpg")
    $url = "https://unsplash.com/photos/$sid/download?force=true&w=1600"
    try {
      Invoke-WebRequest -Uri $url -OutFile $td -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 8
      $len = (Get-Item $td).Length
      if ($len -lt 8000) { continue }
      $h = (Get-FileHash $td -Algorithm MD5).Hash
      if ($h -eq $badHash) { continue }
      if ($usedHashes.Contains($h)) {
        # allow if we need more variety later via picsum
        continue
      }
      Remove-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 80
      Copy-Item $td $dest -Force
      Copy-Item $td (Join-Path $matDir $file) -Force -ErrorAction SilentlyContinue
      [void]$usedHashes.Add($h)
      return @{ ok=$true; src="unsplash:$sid"; len=$len; hash=$h }
    } catch {
      continue
    }
  }

  # picsum unique seed fallback (no red bars)
  $seed = "nored-$folder-$file-$index"
  $td = Join-Path $tmpRoot ("$seed.jpg")
  $purl = "https://picsum.photos/seed/$seed/1600/1000.jpg"
  try {
    Invoke-WebRequest -Uri $purl -OutFile $td -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 8
    $len = (Get-Item $td).Length
    if ($len -lt 8000) { throw "small" }
    $h = (Get-FileHash $td -Algorithm MD5).Hash
    if ($h -eq $badHash -or $usedHashes.Contains($h)) { throw "dup" }
    Remove-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue
    Copy-Item $td $dest -Force
    Copy-Item $td (Join-Path $matDir $file) -Force -ErrorAction SilentlyContinue
    [void]$usedHashes.Add($h)
    return @{ ok=$true; src="picsum:$seed"; len=$len; hash=$h }
  } catch {
    return @{ ok=$false; src=""; len=0; hash="" }
  }
}

function Bump-DraftCache([string]$folder) {
  $draftPath = Join-Path (Join-Path $sushi $folder) "draft.json"
  if (-not (Test-Path $draftPath)) { return }
  $raw = [IO.File]::ReadAllText($draftPath)
  $raw2 = [regex]::Replace($raw, '\?v=[^"\\]+', '?v=redfix-v1')
  if ($raw2 -notmatch 'brushUpPhoto') {
    $raw2 = $raw2 -replace '("brushUpFocal"\s*:\s*"[^"]*")', "`$1,`r`n    `"brushUpPhoto`":  `"2026-09-15-redfix-v1`""
  } else {
    $raw2 = [regex]::Replace($raw2, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":  "2026-09-15-redfix-v1"')
  }
  [IO.File]::WriteAllText($draftPath, $raw2)
}

$bad = @(Get-BadSlots)
Write-Host ("bad slots=" + $bad.Count)
$ok=0; $fail=0
$i=0
$touched = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($slot in $bad) {
  $i++
  $theme = $folderTheme[$slot.folder]
  if (-not $theme) { $theme = "cafe" }
  Write-Host ("[$i/$($bad.Count)] $($slot.folder)/$($slot.file) theme=$theme")
  $r = Save-UniqueImage $slot.folder $slot.file $theme $i
  if ($r.ok) {
    $ok++
    [void]$touched.Add($slot.folder)
    Write-Host ("  OK $($r.src) len=$($r.len)")
  } else {
    $fail++
    Write-Host "  FAIL"
  }
  Start-Sleep -Milliseconds 200
}

foreach ($f in $touched) { Bump-DraftCache $f }

# verify no bad hash left
$left = @(Get-BadSlots)
Write-Host ("DONE ok=$ok fail=$fail remainingBad=$($left.Count) foldersTouched=$($touched.Count)")
if ($left.Count -gt 0) {
  $left | ForEach-Object { Write-Host ("  STILL $($_.folder)/$($_.file)") }
}
