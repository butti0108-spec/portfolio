# Fix 28 hero/about/work-02 to match titles (mat+breath / evening forest)
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Add-Type -AssemblyName System.Drawing
$ua = "kuru-portfolio-photo-wv/1.0"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$utf8 = [Text.UTF8Encoding]::new($false)
$tmpRoot = Join-Path $env:TEMP ("photo-28fix-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$used = New-Object "System.Collections.Generic.HashSet[string]"
$v = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

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
      if ($u -notmatch "staticflickr\.com|pd\.w\.org") { continue }
      if ($item.width -lt 600 -or $item.height -lt 400) { continue }
      $title = ([string]$item.title + " " + [string]$item.tags).ToLowerInvariant()
      if ($title -match "insect|bee|butterfly|beetle|bug|spider|moth|fly|wasp") { continue }
      if (-not $used.Add($u)) { continue }
      $tmp = Join-Path $tmpRoot ("t-" + [guid]::NewGuid().ToString("n") + ".jpg")
      try {
        Invoke-WebRequest -Uri $u -OutFile $tmp -TimeoutSec 60 -Headers @{ "User-Agent" = $ua }
        if (Test-Size $tmp) { return @{ Path = $tmp; Url = $u; Query = $q } }
      } catch { }
      Remove-Item $tmp -Force -EA SilentlyContinue
    }
    Start-Sleep -Milliseconds 450
  }
  return $null
}
function Apply-Slot([string]$id, [string]$file, [string]$key, [string[]]$qs, [switch]$Sync) {
  $dir = Folder $id
  Write-Host "== $id $file =="
  $hit = Pick $qs
  if (-not $hit) { Write-Host "FAIL $id $file"; return }
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
  Add-Content (Join-Path $dir.FullName "SOURCES-photo-wv.md") "| $id | $file | $($hit.Query) | $($hit.Url) | 28fix |" -Encoding UTF8
}

# Prefer empty mat / calm room — no acro, no peacock pose
Apply-Slot "28" "hero.jpg" "hero_image" @(
  "empty yoga mat wooden floor",
  "yoga mat rolled studio floor",
  "yoga mat sunlight empty room",
  "meditation cushion wooden floor"
)
Apply-Slot "28" "about-01.jpg" "about_image_1" @(
  "empty yoga mat soft light",
  "yoga mats lined up studio",
  "folded yoga mat wooden floor",
  "calm yoga room empty"
) -Sync
Apply-Slot "28" "work-02.jpg" "work_2_image" @(
  "green forest evening",
  "dense forest path green",
  "forest trees soft green light",
  "woodland canopy green calm"
)

Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
Write-Host "DONE"
