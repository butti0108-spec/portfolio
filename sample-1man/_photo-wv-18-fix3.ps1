# Fix 18 about + work-01/03 only. Paths via script root (no hardcoded JP path).
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
Add-Type -AssemblyName System.Drawing
$sampleRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$dir = Get-ChildItem (Join-Path $sampleRoot "sushi-samples") -Directory | Where-Object { $_.Name -like "18-*" } | Select-Object -First 1
$imgDir = Join-Path $dir.FullName "images"
$srcMd = Join-Path $dir.FullName "SOURCES-photo-wv.md"
$ua = "KuruPortfolioPhotoBot/1.0 (sample18 fix)"
$hdr = @{ "User-Agent" = $ua; "Accept" = "image/jpeg,image/png,*/*" }
$used = New-Object "System.Collections.Generic.HashSet[string]"

function OkSize([string]$p) {
  if (-not (Test-Path $p)) { return $false }
  $fs = [IO.File]::Open($p, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $img = [Drawing.Image]::FromStream($fs)
    try { return ($img.Width -ge 500 -and $img.Height -ge 500) }
    finally { $img.Dispose() }
  } finally { $fs.Close() }
}
function Save-FromUrl([string]$url, [string]$dest) {
  $tmp = Join-Path $env:TEMP ("p18-" + [guid]::NewGuid().ToString("n") + ".jpg")
  try {
    Invoke-WebRequest -Uri $url -OutFile $tmp -TimeoutSec 90 -Headers $hdr
    if (-not (OkSize $tmp)) { return $false }
    [IO.File]::Copy($tmp, $dest, $true)
    return $true
  } catch { return $false }
  finally { Remove-Item $tmp -Force -EA SilentlyContinue }
}
function Pick-Openverse([string[]]$qs) {
  foreach ($q in $qs) {
    Write-Host "q $q"
    $uri = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=20"
    try {
      $r = Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{ "User-Agent" = $ua }
    } catch { Start-Sleep -Seconds 2; continue }
    foreach ($item in @($r.results)) {
      if (-not $item.url) { continue }
      $u = [string]$item.url
      if ($u -notmatch "staticflickr\.com") { continue }
      if ($item.width -lt 700 -or $item.height -lt 700) { continue }
      $blob = ([string]$item.title + " " + [string]$item.tags).ToLowerInvariant()
      if ($blob -match "collage|contact sheet|grid|silhouette|sunset|group of many|ministry|harry") { continue }
      if (-not $used.Add($u)) { continue }
      return $u
    }
    Start-Sleep -Milliseconds 500
  }
  return $null
}
function Apply-Slot([string]$file, [string[]]$qs, [string]$note) {
  Write-Host "== $file =="
  $url = Pick-Openverse $qs
  if (-not $url) { Write-Host "FAIL pick $file"; return $false }
  Write-Host "  $url"
  $dest = Join-Path $imgDir $file
  if (-not (Save-FromUrl $url $dest)) { Write-Host "FAIL dl $file"; return $false }
  Write-Host "OK $file $note"
  Add-Content $srcMd "| 18 | $file | $note | $url | 18fix-3 |" -Encoding UTF8
  return $true
}

# Sync about to clear face portrait (reuse hero if pick fails)
$okAbout = Apply-Slot "about-01.jpg" @(
  "studio portrait face closeup",
  "black and white portrait studio",
  "portrait soft light face"
) "about face portrait"
if ($okAbout) {
  Copy-Item (Join-Path $imgDir "about-01.jpg") (Join-Path $imgDir "about-02.jpg") -Force
  Copy-Item (Join-Path $imgDir "about-01.jpg") (Join-Path $imgDir "about-03.jpg") -Force
} else {
  Copy-Item (Join-Path $imgDir "hero.jpg") (Join-Path $imgDir "about-01.jpg") -Force
  Copy-Item (Join-Path $imgDir "hero.jpg") (Join-Path $imgDir "about-02.jpg") -Force
  Copy-Item (Join-Path $imgDir "hero.jpg") (Join-Path $imgDir "about-03.jpg") -Force
  Write-Host "about synced from hero"
}

Apply-Slot "work-01.jpg" @(
  "family portrait studio indoors",
  "family photo parents children studio",
  "family of four portrait"
) "family portrait faces"

Apply-Slot "work-03.jpg" @(
  "passport photo white background",
  "ID photo plain backdrop",
  "mugshot style plain background portrait",
  "headshot white background formal"
) "id photo plain bg"

Write-Host "---- verify ----"
foreach ($f in @("hero.jpg","about-01.jpg","work-01.jpg","work-02.jpg","work-03.jpg")) {
  $p = Join-Path $imgDir $f
  if (OkSize $p) {
    $fs = [IO.File]::Open($p, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    try {
      $img = [Drawing.Image]::FromStream($fs)
      try { Write-Host ("{0}: {1}x{2}" -f $f, $img.Width, $img.Height) }
      finally { $img.Dispose() }
    } finally { $fs.Close() }
  } else { Write-Host "MISSING $f" }
}
Write-Host DONE
