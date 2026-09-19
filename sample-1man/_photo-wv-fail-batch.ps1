# Replace FAIL title-mismatch slots (FIRST_TEAM) + 28 hero/about (calm mat/breath)
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
Add-Type -AssemblyName System.Drawing
$ua = "kuru-portfolio-photo-wv/1.0"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$utf8 = [Text.UTF8Encoding]::new($false)
$tmpRoot = Join-Path $env:TEMP ("photo-fail-batch-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$used = New-Object "System.Collections.Generic.HashSet[string]"
$v = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$log = Join-Path $root "_photo-wv-fail-batch-log.txt"
"" | Set-Content $log -Encoding UTF8

function Folder([string]$id) {
  Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
}
function Test-Size([string]$path) {
  $fs = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $img = [Drawing.Image]::FromStream($fs)
    try { return ($img.Width -ge 550 -and $img.Height -ge 380) }
    finally { $img.Dispose() }
  } finally { $fs.Close() }
}
function Copy-Retry([string]$src, [string]$dest) {
  for ($a = 1; $a -le 14; $a++) {
    try { [IO.File]::Copy($src, $dest, $true); return } catch { Start-Sleep -Milliseconds (250 * $a) }
  }
  throw "copy-fail"
}
function Pick([string[]]$qs) {
  foreach ($q in $qs) {
    Write-Host "q $q"
    $uri = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=20"
    try {
      $r = Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{ "User-Agent" = $ua }
    } catch {
      Write-Host "api-fail $q"
      Start-Sleep -Milliseconds 900
      continue
    }
    foreach ($item in @($r.results)) {
      if (-not $item.url) { continue }
      $u = [string]$item.url
      if ($u -notmatch "staticflickr\.com|pd\.w\.org|upload\.wikimedia\.org") { continue }
      if ($item.width -and ($item.width -lt 600 -or $item.height -lt 400)) { continue }
      $title = ([string]$item.title + " " + [string]$item.tags).ToLowerInvariant()
      if ($title -match "insect|bee|butterfly|beetle|bug|spider|moth|wasp|skunk|harry potter|ministry of magic") { continue }
      if (-not $used.Add($u)) { continue }
      $tmp = Join-Path $tmpRoot ("t-" + [guid]::NewGuid().ToString("n") + ".jpg")
      try {
        Invoke-WebRequest -Uri $u -OutFile $tmp -TimeoutSec 60 -Headers @{ "User-Agent" = $ua }
        if (Test-Size $tmp) { return @{ Path = $tmp; Url = $u; Query = $q } }
      } catch { }
      Remove-Item $tmp -Force -EA SilentlyContinue
    }
    Start-Sleep -Milliseconds 400
  }
  return $null
}
function Apply-Slot([string]$id, [string]$file, [string]$key, [string[]]$qs, [switch]$Sync) {
  $dir = Folder $id
  if (-not $dir) { Write-Host "NOFOLDER $id"; Add-Content $log "NOFOLDER $id"; return }
  Write-Host "== $id $file =="
  $hit = Pick $qs
  if (-not $hit) {
    Write-Host "FAIL $id $file"
    Add-Content $log "FAIL $id $file"
    return
  }
  $dest = Join-Path $dir.FullName ("images\" + $file)
  Copy-Retry $hit.Path $dest
  if ($Sync) {
    for ($i = 2; $i -le 3; $i++) {
      Copy-Retry $hit.Path (Join-Path $dir.FullName ("images\about-{0:d2}.jpg" -f $i))
    }
  }
  $dp = Join-Path $dir.FullName "draft.json"
  $t = [IO.File]::ReadAllText($dp, $utf8)
  $rel = "sushi-samples/$($dir.Name)/images/$file?v=photo-wv-match-$v"
  $t = [regex]::Replace($t, '"' + $key + '"\s*:\s*"[^"]*"', '"' + $key + '":"' + $rel + '"', 1)
  if ($Sync) {
    for ($i = 2; $i -le 3; $i++) {
      $k = "about_image_$i"
      $af = ("about-{0:d2}.jpg" -f $i)
      $r2 = "sushi-samples/$($dir.Name)/images/$af?v=photo-wv-match-$v"
      $t = [regex]::Replace($t, '"' + $k + '"\s*:\s*"[^"]*"', '"' + $k + '":"' + $r2 + '"', 1)
    }
  }
  if ($t -match '"brushUpPhoto"') {
    $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-18-photo-wv-match"', 1)
  }
  [IO.File]::WriteAllText($dp, $t, $utf8)
  Write-Host "OK $id $file $($hit.Query)"
  Add-Content $log "OK $id $file $($hit.Query)"
  Add-Content (Join-Path $dir.FullName "SOURCES-photo-wv.md") "| $id | $file | $($hit.Query) | $($hit.Url) | fail-batch |" -Encoding UTF8
}

# --- 28 leaf-sound yoga: mat + breathing (calm), not acro/beard peacock ---
Apply-Slot "28" "hero.jpg" "hero_image" @(
  "yoga meditation seated mat",
  "person sitting yoga mat calm",
  "yoga savasana relaxation",
  "gentle yoga stretch mat",
  "yoga class mats wooden floor",
  "breathing meditation yoga"
)
Apply-Slot "28" "about-01.jpg" "about_image_1" @(
  "yoga mats studio floor",
  "yoga practice seated breathing",
  "woman yoga mat seated calm",
  "yoga room wooden floor mats",
  "meditation yoga mat indoor"
) -Sync

# --- Hard FAILs across first team ---
Apply-Slot "03" "work-01.jpg" "work_1_image" @("old fashioned whiskey cocktail", "whiskey cocktail ice glass", "bourbon cocktail bar")
Apply-Slot "07" "work-03.jpg" "work_3_image" @("soft boiled egg ramen", "ajitama ramen egg", "ramen egg topping bowl")
Apply-Slot "09" "work-02.jpg" "work_2_image" @("yoga stretch floor mat", "person stretching yoga mat", "yoga stretch calm indoor")
Apply-Slot "09" "work-03.jpg" "work_3_image" @("yoga relax mat weekend", "yoga relaxation pose mat", "restorative yoga mat")
Apply-Slot "12" "work-03.jpg" "work_3_image" @("dog walking leash park", "person walking dog path", "dog walk outdoor leash")
Apply-Slot "13" "hero.jpg" "hero_image" @("coworking desk plant greenery", "office desk green plants", "shared workspace plants")
Apply-Slot "14" "work-02.jpg" "work_2_image" @("window light photo series", "window photography gallery", "light through window photo art")
Apply-Slot "14" "work-03.jpg" "work_3_image" @("postcard shelf display", "small artworks on shelf", "postcards art table gallery")
Apply-Slot "18" "work-03.jpg" "work_3_image" @("passport photo studio", "ID photo plain backdrop", "portrait photo booth plain")
Apply-Slot "23" "work-02.jpg" "work_2_image" @("coworking desk laptop", "shared workspace laptop", "coworking open desk people")
Apply-Slot "23" "work-03.jpg" "work_3_image" @("small meeting room table", "conference room chairs table", "meeting room glass wall")
Apply-Slot "26" "work-03.jpg" "work_3_image" @("usb flash drive desk", "external hard drive files", "photo files computer delivery")
Apply-Slot "30" "work-03.jpg" "work_3_image" @("gallery night lighting art", "art gallery evening lights", "framed art museum night")

# Strong WEAKs that are basically wrong memory
Apply-Slot "10" "work-03.jpg" "work_3_image" @("highball whisky soda", "whisky highball glass", "edamame bowl beer glass")
Apply-Slot "03" "work-02.jpg" "work_2_image" @("gin tonic citrus ice", "gin and tonic glass", "gin tonic cucumber")

Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
Write-Host "DONE — see $log"
Get-Content $log
