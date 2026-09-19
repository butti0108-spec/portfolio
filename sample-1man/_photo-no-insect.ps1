# Replace insect photos across sushi-samples (no-insect policy)
# Known: 01 about continuous plate is beetle close-up
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$stamp = "no-insect-2026-09-18"
$ua = "kuru-portfolio-no-insect/1.0"
$tmpRoot = Join-Path $env:TEMP ("no-insect-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$log = New-Object System.Collections.Generic.List[string]
$used = New-Object "System.Collections.Generic.HashSet[string]"

function Folder([string]$id) {
  Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
}
function Test-Ok([string]$path) {
  $fs = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $img = [Drawing.Image]::FromStream($fs)
    try {
      $bmp = New-Object Drawing.Bitmap $img
      $w = [int]$bmp.Width; $h = [int]$bmp.Height
      if ($w -lt 480 -or $h -lt 320) { return $false }
      $bmp.Dispose()
      return $true
    } finally { $img.Dispose() }
  } finally { $fs.Close() }
}
function Copy-Retry([string]$src,[string]$dest) {
  for ($a = 1; $a -le 12; $a++) {
    try { [IO.File]::Copy($src, $dest, $true); return } catch { Start-Sleep -Milliseconds (350 * $a) }
  }
  throw "copy-fail $dest"
}
function Get-Urls([string]$q, [int]$page) {
  $uri = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=20&page=$page"
  $r = Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{ "User-Agent" = $ua }
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($item in @($r.results)) {
    if (-not $item.url) { continue }
    if ($item.url -match 'wikimedia|\.png') { continue }
    # hard reject insect-related titles/urls in search results
    $blob = ("{0} {1} {2}" -f $item.title, $item.url, $item.foreign_landing_url)
    if ($blob -match '(?i)insect|beetle|bee|wasp|butterfly|dragonfly|ladybug|ladybird|cicada|spider|moth|ant\b|bug|mosquito|fly\b|hornet|caterpillar') { continue }
    if ($item.width -lt 600 -or $item.height -lt 400) { continue }
    if (-not $used.Add([string]$item.url)) { continue }
    $list.Add([string]$item.url)
    if ($list.Count -ge 12) { break }
  }
  return $list
}
function Sync-Cont([string]$folderPath,[int]$n,[byte[]]$bytes) {
  for ($i = 2; $i -le $n; $i++) {
    $p = Join-Path $folderPath ("images\about-{0:d2}.jpg" -f $i)
    $t = Join-Path $tmpRoot ("sync-$i.jpg")
    [IO.File]::WriteAllBytes($t, $bytes)
    Copy-Retry $t $p
  }
}
function Bump([string]$id,[string[]]$files) {
  $dir = Folder $id
  $path = Join-Path $dir.FullName "draft.json"
  $utf8 = [Text.UTF8Encoding]::new($false)
  $t = [IO.File]::ReadAllText($path, $utf8)
  $name = $dir.Name
  $map = @{
    "hero.jpg"="hero_image";"about-01.jpg"="about_image_1";"about-02.jpg"="about_image_2"
    "about-03.jpg"="about_image_3";"about-04.jpg"="about_image_4"
    "work-01.jpg"="work_1_image";"work-02.jpg"="work_2_image";"work-03.jpg"="work_3_image"
  }
  foreach ($f in $files) {
    if (-not $map.ContainsKey($f)) { continue }
    $key = $map[$f]; $val = "sushi-samples/$name/images/$f`?v=$stamp"
    $pat = '"' + [regex]::Escape($key) + '"\s*:\s*"[^"]*"'
    $rep = '"' + $key + '":"' + $val + '"'
    if ([regex]::IsMatch($t, $pat)) { $t = [regex]::Replace($t, $pat, $rep, 1) }
  }
  $dt = Join-Path $tmpRoot "draft-$id.json"
  [IO.File]::WriteAllText($dt, $t, $utf8)
  Copy-Retry $dt $path
}
function Append-Source([string]$id,[string]$file,[string]$q,[string]$url) {
  $dir = Folder $id
  $p = Join-Path $dir.FullName "SOURCES-no-insect.md"
  $line = "| $file | $q | $url |"
  if (Test-Path $p) { Add-Content -LiteralPath $p -Value $line -Encoding UTF8 }
  else {
    @("# no-insect replacements — $id", "", "| file | query | url |", "|------|-------|-----|", $line) |
      Set-Content -LiteralPath $p -Encoding UTF8
  }
}
function Replace-Slot([string]$id,[string]$file,[string[]]$queries,[int]$cont) {
  $dir = Folder $id
  $imgDir = Join-Path $dir.FullName "images"
  $got = $false
  foreach ($q in $queries) {
    foreach ($page in @(1, 2, 3)) {
      Write-Host "SEARCH $id/$file <= $q p$page"
      try { $urls = @(Get-Urls $q $page) } catch { Write-Host " search-fail"; continue }
      foreach ($url in $urls) {
        $dl = Join-Path $tmpRoot ("$id-$file".Replace('.', '-') + ".jpg")
        try {
          Write-Host "  GET $url"
          Invoke-WebRequest -Uri $url -OutFile $dl -UseBasicParsing -TimeoutSec 60 -Headers @{ "User-Agent" = $ua }
          if ((Get-Item $dl).Length -lt 12000) { throw "tiny" }
          if (-not (Test-Ok $dl)) { throw "reject" }
          Copy-Retry $dl (Join-Path $imgDir $file)
          Append-Source $id $file $q $url
          $got = $true
          break
        } catch {
          Write-Host "  skip $($_.Exception.Message)"
          [void]$used.Remove($url)
        }
      }
      if ($got) { break }
    }
    if ($got) { break }
  }
  if (-not $got) { $log.Add("FAIL $id/$file"); Write-Host "FAIL $id/$file"; return $false }
  $touched = New-Object System.Collections.Generic.List[string]
  $touched.Add($file)
  if ($cont -gt 0 -and $file -eq "about-01.jpg") {
    $bytes = [IO.File]::ReadAllBytes((Join-Path $imgDir "about-01.jpg"))
    Sync-Cont $dir.FullName $cont $bytes
    for ($k = 2; $k -le $cont; $k++) { $touched.Add(("about-{0:d2}.jpg" -f $k)) }
  }
  Bump $id ($touched.ToArray())
  $log.Add("OK $id/$file (+sync=$cont)")
  return $true
}

# Primary known hit: 01 continuous about = beetle
Replace-Slot "01" "about-01.jpg" @(
  "cafe wood interior morning sunlight",
  "coffee shop window seat wood",
  "dappled sunlight trees no people cafe",
  "wooden cafe table morning light",
  "quiet coffee shop interior"
) 4 | Out-Null

# Extra jobs from scan will be appended by calling with -HitsFile if present
$hitsPath = Join-Path $sushi "_no-insect-hits.json"
if (Test-Path $hitsPath) {
  $hits = Get-Content $hitsPath -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($h in @($hits)) {
    $id = [string]$h.id
    $file = [string]$h.file
    $qs = @($h.q)
    $cont = 0
    if ($h.cont) { $cont = [int]$h.cont }
    if ($id -eq "01" -and $file -eq "about-01.jpg") { continue }
    Replace-Slot $id $file $qs $cont | Out-Null
  }
}

[IO.File]::WriteAllLines((Join-Path $sushi "_no-insect-log.txt"), $log)
Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
Write-Host "DONE"
$log | ForEach-Object { Write-Host $_ }
