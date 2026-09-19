# Fix sample 18 only: proper portraits + repair broken imagePaths
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dir = Get-ChildItem (Join-Path $root "sushi-samples") -Directory | Where-Object { $_.Name -like "18-*" } | Select-Object -First 1
$imgDir = Join-Path $dir.FullName "images"
$utf8 = [Text.UTF8Encoding]::new($false)
$tmpRoot = Join-Path $env:TEMP ("photo-18fix-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$v = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$hdr = @{
  "User-Agent" = "KuruPortfolioPhotoBot/1.0 (sample 18 portrait fix; local rebuild)"
  "Accept" = "image/jpeg,image/png,image/*,*/*"
}

function Test-Size([string]$path) {
  $fs = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $img = [Drawing.Image]::FromStream($fs)
    try { return ($img.Width -ge 500 -and $img.Height -ge 500) }
    finally { $img.Dispose() }
  } finally { $fs.Close() }
}
function Copy-Retry([string]$src, [string]$dest) {
  for ($a = 1; $a -le 14; $a++) {
    try { [IO.File]::Copy($src, $dest, $true); return } catch { Start-Sleep -Milliseconds (250 * $a) }
  }
  throw "copy-fail"
}
function To-Thumb([string]$url, [int]$w = 1280) {
  if ($url -match 'staticflickr\.com') { return $url }
  if ($url -match '/wikipedia/commons/thumb/') { return $url }
  if ($url -notmatch '/wikipedia/commons/([0-9a-f])/([0-9a-f]{2})/([^/]+)$') { return $url }
  $a = $Matches[1]; $b = $Matches[2]; $f = $Matches[3]
  return "https://upload.wikimedia.org/wikipedia/commons/thumb/$a/$b/$f/${w}px-$f"
}
function Get-Url([string]$url) {
  $tmp = Join-Path $tmpRoot ("t-" + [guid]::NewGuid().ToString("n") + ".jpg")
  foreach ($u in @((To-Thumb $url 1280), (To-Thumb $url 1024), $url) | Select-Object -Unique) {
    for ($try = 1; $try -le 3; $try++) {
      try {
        Start-Sleep -Seconds (5 + 3 * $try)
        Write-Host "  get $u"
        Invoke-WebRequest -Uri $u -OutFile $tmp -TimeoutSec 90 -Headers $hdr
        if (Test-Size $tmp) { return @{ Path = $tmp; Url = $u } }
      } catch { Write-Host "  fail try $try" }
    }
  }
  return $null
}
function Set-ImagePath([string]$text, [string]$key, [string]$file) {
  $rel = "sushi-samples/$($dir.Name)/images/$file?v=photo-18fix-$v"
  if ($text -match '"' + [regex]::Escape($key) + '"\s*:') {
    return [regex]::Replace($text, '"' + [regex]::Escape($key) + '"\s*:\s*"[^"]*"', '"' + $key + '":"' + $rel + '"', 1)
  }
  return $text
}

$plan = @(
  # Face high in frame so object-position:top still shows eyes/face, not forehead-only or torso
  @{ File = "hero.jpg"; Key = "hero_image"; Note = "studio portrait soft face"; Url = "https://live.staticflickr.com/7127/6887694416_a43009c727_b.jpg"; SyncAbout = $false }
  @{ File = "about-01.jpg"; Key = "about_image_1"; Note = "calm portrait face"; Url = "https://live.staticflickr.com/4111/4991547696_296a08243f_b.jpg"; SyncAbout = $true }
  @{ File = "work-01.jpg"; Key = "work_1_image"; Note = "family portrait"; Url = "https://upload.wikimedia.org/wikipedia/commons/d/df/Family_Portrait.jpg"; SyncAbout = $false }
  @{ File = "work-02.jpg"; Key = "work_2_image"; Note = "professional headshot"; Url = "https://upload.wikimedia.org/wikipedia/commons/e/eb/Kristalina_Georgieva_Headshot.jpg"; SyncAbout = $false }
  @{ File = "work-03.jpg"; Key = "work_3_image"; Note = "identity photo plain"; Url = "https://upload.wikimedia.org/wikipedia/commons/f/fc/Identity_Photo.jpg"; SyncAbout = $false }
)

$dp = Join-Path $dir.FullName "draft.json"
$t = [IO.File]::ReadAllText($dp, $utf8)
$srcLines = @()

foreach ($item in $plan) {
  Write-Host "== $($item.File) =="
  $hit = Get-Url $item.Url
  if (-not $hit) { Write-Host "FAIL $($item.File)"; continue }
  Copy-Retry $hit.Path (Join-Path $imgDir $item.File)
  if ($item.SyncAbout) {
    for ($i = 2; $i -le 3; $i++) {
      Copy-Retry $hit.Path (Join-Path $imgDir ("about-{0:d2}.jpg" -f $i))
    }
  }
  $t = Set-ImagePath $t $item.Key $item.File
  if ($item.SyncAbout) {
    $t = Set-ImagePath $t "about_image_2" "about-02.jpg"
    $t = Set-ImagePath $t "about_image_3" "about-03.jpg"
  }
  Write-Host "OK $($item.File) $($item.Note)"
  $srcLines += "| 18 | $($item.File) | $($item.Note) | $($hit.Url) | 18fix |"
}

# Ensure work paths exist even if download partial
$t = Set-ImagePath $t "work_1_image" "work-01.jpg"
$t = Set-ImagePath $t "work_2_image" "work-02.jpg"
$t = Set-ImagePath $t "work_3_image" "work-03.jpg"
$t = Set-ImagePath $t "hero_image" "hero.jpg"
$t = Set-ImagePath $t "about_image_1" "about-01.jpg"
$t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-18-photo-18fix"', 1)
if ($t -notmatch '"brushUpPhoto"') {
  $t = $t -replace '(\{\s*\r?\n)', "`$1    `"brushUpPhoto`":`"2026-09-18-photo-18fix`",`r`n"
}

[IO.File]::WriteAllText($dp, $t, $utf8)
Add-Content (Join-Path $dir.FullName "SOURCES-photo-wv.md") ($srcLines -join "`n") -Encoding UTF8
Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue

# verify paths
$check = [IO.File]::ReadAllText($dp, $utf8)
Write-Host "---- imagePaths ----"
[regex]::Matches($check, '"(hero_image|about_image_[123]|work_[123]_image)"\s*:\s*"([^"]*)"') | ForEach-Object {
  Write-Host "$($_.Groups[1].Value) = $($_.Groups[2].Value)"
}
Write-Host "DONE"
