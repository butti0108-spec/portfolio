# Fix 01 about plate: cafe only, no insect, no museum
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$stamp = "no-insect-2026-09-18b"
$ua = "kuru-portfolio-no-insect/1.0"
$tmpRoot = Join-Path $env:TEMP ("no-insect-01b-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
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
      $ok = ($bmp.Width -ge 500 -and $bmp.Height -ge 350)
      $bmp.Dispose()
      return $ok
    } finally { $img.Dispose() }
  } finally { $fs.Close() }
}
function Copy-Retry([string]$src,[string]$dest) {
  for ($a = 1; $a -le 12; $a++) {
    try { [IO.File]::Copy($src, $dest, $true); return } catch { Start-Sleep -Milliseconds (350 * $a) }
  }
  throw "copy-fail"
}
function Get-Urls([string]$q, [int]$page) {
  $uri = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=20&page=$page"
  $r = Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{ "User-Agent" = $ua }
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($item in @($r.results)) {
    if (-not $item.url) { continue }
    if ($item.url -match 'wikimedia|\.png') { continue }
    $blob = ("{0} {1}" -f $item.title, $item.url)
    if ($blob -match '(?i)insect|beetle|bee|wasp|butterfly|dragonfly|spider|moth|museum|gallery|painting|american gothic|art exhibit') { continue }
    if ($item.width -lt 700 -or $item.height -lt 500) { continue }
    if (-not $used.Add([string]$item.url)) { continue }
    $list.Add([string]$item.url)
    if ($list.Count -ge 15) { break }
  }
  return $list
}

$dir = Folder "01"
$imgDir = Join-Path $dir.FullName "images"
$queries = @(
  "latte coffee wooden table morning",
  "espresso cup cafe wood table",
  "coffee shop interior wooden chairs",
  "cappuccino on wooden table sunlight",
  "empty cafe booth morning light",
  "pour over coffee cafe counter"
)
$got = $false
foreach ($q in $queries) {
  foreach ($page in 1..3) {
    Write-Host "SEARCH $q p$page"
    try { $urls = @(Get-Urls $q $page) } catch { continue }
    foreach ($url in $urls) {
      $dl = Join-Path $tmpRoot "01-about.jpg"
      try {
        Write-Host "  GET $url"
        Invoke-WebRequest -Uri $url -OutFile $dl -UseBasicParsing -TimeoutSec 60 -Headers @{ "User-Agent" = $ua }
        if ((Get-Item $dl).Length -lt 15000) { throw "tiny" }
        if (-not (Test-Ok $dl)) { throw "size" }
        Copy-Retry $dl (Join-Path $imgDir "about-01.jpg")
        $bytes = [IO.File]::ReadAllBytes((Join-Path $imgDir "about-01.jpg"))
        for ($i = 2; $i -le 4; $i++) {
          $p = Join-Path $imgDir ("about-{0:d2}.jpg" -f $i)
          $t = Join-Path $tmpRoot ("s$i.jpg")
          [IO.File]::WriteAllBytes($t, $bytes)
          Copy-Retry $t $p
        }
        # bump draft
        $path = Join-Path $dir.FullName "draft.json"
        $utf8 = [Text.UTF8Encoding]::new($false)
        $tjson = [IO.File]::ReadAllText($path, $utf8)
        $name = $dir.Name
        foreach ($f in @("about-01.jpg","about-02.jpg","about-03.jpg","about-04.jpg")) {
          $key = switch ($f) {
            "about-01.jpg" { "about_image_1" }
            "about-02.jpg" { "about_image_2" }
            "about-03.jpg" { "about_image_3" }
            "about-04.jpg" { "about_image_4" }
          }
          $val = "sushi-samples/$name/images/$f`?v=$stamp"
          $pat = '"' + [regex]::Escape($key) + '"\s*:\s*"[^"]*"'
          $rep = '"' + $key + '":"' + $val + '"'
          if ([regex]::IsMatch($tjson, $pat)) { $tjson = [regex]::Replace($tjson, $pat, $rep, 1) }
        }
        $dt = Join-Path $tmpRoot "draft.json"
        [IO.File]::WriteAllText($dt, $tjson, $utf8)
        Copy-Retry $dt $path
        $srcPath = Join-Path $dir.FullName "SOURCES-no-insect.md"
        Add-Content -LiteralPath $srcPath -Value "| about-01.jpg | $q | $url |" -Encoding UTF8
        Write-Host "OK $q"
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
if (-not $got) { throw "FAIL 01 about" }

# hash check
$h1 = (Get-FileHash (Join-Path $imgDir "about-01.jpg")).Hash
for ($i = 2; $i -le 4; $i++) {
  $hi = (Get-FileHash (Join-Path $imgDir ("about-{0:d2}.jpg" -f $i))).Hash
  if ($hi -ne $h1) { throw "CONT_MISMATCH $i" }
}
Write-Host "CONT_OK"
Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
Write-Host DONE
