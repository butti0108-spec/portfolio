$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sample = Join-Path $root "sushi-samples\01-cafe-warm-a"
$exp = Join-Path $sample "_grammar-exp"
New-Item -ItemType Directory -Force -Path $exp | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $exp "images") | Out-Null

$draftPath = Join-Path $sample "draft.json"
$baseline = Join-Path $exp "E0-baseline-draft.json"
if (-not (Test-Path $baseline)) {
  Copy-Item -Force $draftPath $baseline
  Write-Host "baseline saved"
} else {
  Write-Host "baseline exists (keep)"
}

# Soft cafe color swatch (UI-uploadable solid) — not warning red/yellow/pink
Add-Type -AssemblyName System.Drawing
$swatchPath = Join-Path $exp "images\color-soft-cafe.jpg"
$bmp = New-Object System.Drawing.Bitmap 1200, 800
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(255, 92, 64, 51)) # #5c4033 chrome-ish, muted
$g.Dispose()
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$enc = [System.Drawing.Imaging.Encoder]::Quality
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter $enc, 90L
$bmp.Save($swatchPath, $jpegCodec, $ep)
$bmp.Dispose()
# also copy into sample images so draft paths resolve like other assets
Copy-Item -Force $swatchPath (Join-Path $sample "images\color-soft-cafe.jpg")
Write-Host "swatch ok"

function Get-DraftObject {
  return (Get-Content -Raw -Encoding UTF8 $baseline | ConvertFrom-Json)
}

function Set-ImagePaths($j, $map) {
  $ip = $j.imagePaths
  foreach ($k in $map.Keys) {
    $ip | Add-Member -NotePropertyName $k -NotePropertyValue $map[$k] -Force
  }
}

$v = "grammar-exp-1"
$about1 = "sushi-samples/01-cafe-warm-a/images/about-01.jpg?v=$v"
$about2 = "sushi-samples/01-cafe-warm-a/images/about-02.jpg?v=$v"
$hero = "sushi-samples/01-cafe-warm-a/images/hero.jpg?v=$v"
$color = "sushi-samples/01-cafe-warm-a/images/color-soft-cafe.jpg?v=$v"
# keep works pointing at existing
function Keep-Works($j) {
  $w1 = $j.imagePaths.work_1_image
  $w2 = $j.imagePaths.work_2_image
  $w3 = $j.imagePaths.work_3_image
  if (-not $w1) { $w1 = "sushi-samples/01-cafe-warm-a/images/work-01.jpg?v=$v" }
  if (-not $w2) { $w2 = "sushi-samples/01-cafe-warm-a/images/work-02.jpg?v=$v" }
  if (-not $w3) { $w3 = "sushi-samples/01-cafe-warm-a/images/work-03.jpg?v=$v" }
  return @{ w1 = $w1; w2 = $w2; w3 = $w3 }
}

# --- E3 curtain: 4x L, tight, SAME file, focalY stairs ---
$e3 = Get-DraftObject
$e3.draftCounts."about-photos" = 4
$e3.itemLayouts."about-photos" = [pscustomobject]@{
  sizes = @("L","L","L","L")
  gap = "tight"
  growDirs = @()
  focalYs = @(10, 35, 60, 85)
}
$e3.brushUpPhoto = "2026-09-17-grammar-E3"
$e3.layoutRecipeNote = "grammar-exp E3 curtain same-file focalY"
$w = Keep-Works $e3
Set-ImagePaths $e3 @{
  hero_image = $hero
  about_image_1 = $about1
  about_image_2 = $about1
  about_image_3 = $about1
  about_image_4 = $about1
  work_1_image = $w.w1
  work_2_image = $w.w2
  work_3_image = $w.w3
}
$e3 | ConvertTo-Json -Depth 30 | Set-Content -Encoding UTF8 (Join-Path $exp "E3-curtain-draft.json")

# --- E4 diptych HH: same file both halves (① test — expect weak without focalX) ---
$e4 = Get-DraftObject
$e4.draftCounts."about-photos" = 2
$e4.itemLayouts."about-photos" = [pscustomobject]@{
  sizes = @("H","H")
  gap = "tight"
  growDirs = @()
  focalYs = @(40, 60)
}
$e4.brushUpPhoto = "2026-09-17-grammar-E4"
$e4.layoutRecipeNote = "grammar-exp E4 HH same-file (no focalX)"
$w = Keep-Works $e4
Set-ImagePaths $e4 @{
  hero_image = $hero
  about_image_1 = $about1
  about_image_2 = $about1
  work_1_image = $w.w1
  work_2_image = $w.w2
  work_3_image = $w.w3
}
# clear about_3/4 if present by leaving them; loader may ignore extra counts
$e4 | ConvertTo-Json -Depth 30 | Set-Content -Encoding UTF8 (Join-Path $exp "E4-diptych-draft.json")

# --- E5 photo / color / photo ---
$e5 = Get-DraftObject
$e5.draftCounts."about-photos" = 3
$e5.itemLayouts."about-photos" = [pscustomobject]@{
  sizes = @("L","L","L")
  gap = "normal"
  growDirs = @()
  focalYs = @(30, 50, 70)
}
$e5.brushUpPhoto = "2026-09-17-grammar-E5"
$e5.layoutRecipeNote = "grammar-exp E5 photo-color-photo"
$w = Keep-Works $e5
Set-ImagePaths $e5 @{
  hero_image = $hero
  about_image_1 = $about1
  about_image_2 = $color
  about_image_3 = $about2
  work_1_image = $w.w1
  work_2_image = $w.w2
  work_3_image = $w.w3
}
$e5 | ConvertTo-Json -Depth 30 | Set-Content -Encoding UTF8 (Join-Path $exp "E5-color-slit-draft.json")

# --- E6 far→mid→near: 3x L same file focalY ---
$e6 = Get-DraftObject
$e6.draftCounts."about-photos" = 3
$e6.itemLayouts."about-photos" = [pscustomobject]@{
  sizes = @("L","L","L")
  gap = "tight"
  growDirs = @()
  focalYs = @(15, 50, 85)
}
$e6.brushUpPhoto = "2026-09-17-grammar-E6"
$e6.layoutRecipeNote = "grammar-exp E6 approach same-file focalY"
$w = Keep-Works $e6
Set-ImagePaths $e6 @{
  hero_image = $hero
  about_image_1 = $about1
  about_image_2 = $about1
  about_image_3 = $about1
  work_1_image = $w.w1
  work_2_image = $w.w2
  work_3_image = $w.w3
}
$e6 | ConvertTo-Json -Depth 30 | Set-Content -Encoding UTF8 (Join-Path $exp "E6-approach-draft.json")

# Activate E3 as live draft for first viewing (baseline kept in _grammar-exp)
Copy-Item -Force (Join-Path $exp "E3-curtain-draft.json") $draftPath
Write-Host "live draft = E3"
Write-Host "done"
Get-ChildItem $exp | Select-Object Name, Length
