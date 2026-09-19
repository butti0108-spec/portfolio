# Batch replace worldview-FAIL photos (FIRST_TEAM)
# 28 leaf-sound + other FAIL/strong WEAK from audit
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$stamp = "photo-wv-match"
$ua = "kuru-portfolio-photo-wv/1.0"
$tmpRoot = Join-Path $env:TEMP ("photo-match-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$ProgressPreference = "SilentlyContinue"
$used = New-Object "System.Collections.Generic.HashSet[string]"
$utf8 = [Text.UTF8Encoding]::new($false)
$v = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$log = New-Object System.Collections.Generic.List[string]

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
    try { [IO.File]::Copy($src, $dest, $true); return } catch { Start-Sleep -Milliseconds (280 * $a) }
  }
  throw "copy-fail $dest"
}
function Pick([string[]]$queries) {
  foreach ($q in $queries) {
    Write-Host "  q: $q"
    $uri = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=20"
    try {
      $r = Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{ "User-Agent" = $ua }
    } catch {
      Write-Host ("  api fail: " + $_.Exception.Message)
      Start-Sleep -Milliseconds 600
      continue
    }
    foreach ($item in @($r.results)) {
      if (-not $item.url) { continue }
      $u = [string]$item.url
      if ($u -notmatch 'staticflickr\.com|pd\.w\.org') { continue }
      if ($item.width -lt 650 -or $item.height -lt 450) { continue }
      if (-not $used.Add($u)) { continue }
      $tmp = Join-Path $tmpRoot ("t-" + [guid]::NewGuid().ToString("n") + ".jpg")
      try {
        Invoke-WebRequest -Uri $u -OutFile $tmp -TimeoutSec 60 -Headers @{ "User-Agent" = $ua }
        if (Test-Size $tmp) {
          return @{ Path = $tmp; Url = $u; Query = $q }
        }
      } catch { }
      Remove-Item $tmp -Force -EA SilentlyContinue
    }
    Start-Sleep -Milliseconds 300
  }
  return $null
}
function Bump-Key([ref]$text, [string]$key, [string]$rel) {
  $pattern = '"' + $key + '"\s*:\s*"[^"]*"'
  if ($text.Value -match $pattern) {
    $text.Value = [regex]::Replace($text.Value, $pattern, '"' + $key + '":"' + $rel + '"', 1)
  }
}
function Stamp-Photo([ref]$text) {
  if ($text.Value -match '"brushUpPhoto"\s*:') {
    $text.Value = [regex]::Replace($text.Value, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-18-photo-wv-match"', 1)
  } elseif ($text.Value -match '"brushUpCopy"\s*:') {
    $text.Value = [regex]::Replace($text.Value, '("brushUpCopy"\s*:\s*"[^"]*")', '$1,"brushUpPhoto":"2026-09-18-photo-wv-match"', 1)
  }
}
function Apply-One([string]$id, [string]$file, [string]$key, [string[]]$queries, [switch]$SyncAboutN) {
  $dir = Folder $id
  if (-not $dir) { throw "no folder $id" }
  Write-Host "== $id $file =="
  $hit = Pick $queries
  if (-not $hit) {
    $log.Add("| $id | $file | FAIL | no-photo |")
    Write-Host "FAIL $id $file"
    return
  }
  $imgDir = Join-Path $dir.FullName "images"
  $dest = Join-Path $imgDir $file
  Copy-Retry $hit.Path $dest
  if ($SyncAboutN) {
    $n = 4
    if ($id -eq "28" -or $id -eq "09") { $n = 3 }
    if ($id -eq "08") { $n = 4 }
    for ($i = 2; $i -le $n; $i++) {
      $af = "about-{0:d2}.jpg" -f $i
      Copy-Retry $hit.Path (Join-Path $imgDir $af)
    }
  }
  $draftPath = Join-Path $dir.FullName "draft.json"
  $t = [IO.File]::ReadAllText($draftPath, $utf8)
  $rel = "sushi-samples/$($dir.Name)/images/$file?v=$stamp-$v"
  Bump-Key ([ref]$t) $key $rel
  if ($SyncAboutN) {
    $max = if ($id -eq "08") { 4 } elseif ($id -eq "28" -or $id -eq "09") { 3 } else { 3 }
    for ($i = 2; $i -le $max; $i++) {
      $af = "about-{0:d2}.jpg" -f $i
      $k = "about_image_$i"
      $r2 = "sushi-samples/$($dir.Name)/images/$af?v=$stamp-$v"
      Bump-Key ([ref]$t) $k $r2
    }
  }
  Stamp-Photo ([ref]$t)
  [IO.File]::WriteAllText($draftPath, $t, $utf8)
  $line = "| $id | $file | $($hit.Query) | $($hit.Url) |"
  $log.Add($line)
  $src = Join-Path $dir.FullName "SOURCES-photo-wv.md"
  Add-Content -Path $src -Value $line -Encoding UTF8
  Write-Host "OK $line"
  Start-Sleep -Milliseconds 450
}

# --- jobs ---
# 28 full
Apply-One "28" "about-01.jpg" "about_image_1" @("yoga mat","yoga studio","green leaves sunlight") -SyncAboutN
Apply-One "28" "work-01.jpg" "work_1_image" @("bamboo forest","bamboo grove","bamboo path")
Apply-One "28" "work-02.jpg" "work_2_image" @("forest evening","woods dusk","forest trees night")
Apply-One "28" "work-03.jpg" "work_3_image" @("sunbeams through trees","sunlight forest","light through leaves")
Apply-One "28" "hero.jpg" "hero_image" @("yoga mat floor","meditation mat","yoga studio empty")

# 08 about continuous (conference FAIL)
Apply-One "08" "about-01.jpg" "about_image_1" @("japanese tatami guest room inn","ryokan washitsu futon daylight","tatami room low table window") -SyncAboutN

# 04 salon
Apply-One "04" "work-01.jpg" "work_1_image" @("hair salon blow dry soft light","hairdresser cutting hair white salon","salon mirror hair styling")
Apply-One "04" "work-02.jpg" "work_2_image" @("hair color salon gray roots","salon color treatment chair","hair dye salon soft light")

# 06 bakery
Apply-One "06" "work-01.jpg" "work_1_image" @("japanese white sandwich bread loaf","shokupan bakery loaf","pullman bread loaf bakery")
Apply-One "06" "work-02.jpg" "work_2_image" @("focaccia bread bakery","focaccia cheese herbs","olive oil focaccia tray")
Apply-One "06" "work-03.jpg" "work_3_image" @("artisan rustic bread walnut fig","campagne bread bakery","sourdough loaf bakery case")

# 07 ramen hero
Apply-One "07" "hero.jpg" "hero_image" @("steaming ramen bowl japan","ramen steam chopsticks bowl","hot ramen soup steam")

# 09 yoga about
Apply-One "09" "about-01.jpg" "about_image_1" @("morning yoga studio sunlight mat","yoga class soft daylight room","yoga mat sunlight wooden floor") -SyncAboutN

# 10 izakaya
Apply-One "10" "work-01.jpg" "work_1_image" @("yakitori skewers plate izakaya","negima yakitori grilled","chicken skewer izakaya")
Apply-One "10" "work-02.jpg" "work_2_image" @("japanese simmered stew dish","otsumami nikomi bowl","izakaya simmered appetizer")
Apply-One "10" "work-03.jpg" "work_3_image" @("highball glass edamame izakaya","whisky highball bar japan","edamame beer izakaya counter")

# 11 clinic hero
Apply-One "11" "hero.jpg" "hero_image" @("small clinic waiting room japan","neighborhood medical clinic interior","quiet clinic reception soft light")

# 14 gallery
Apply-One "14" "work-01.jpg" "work_1_image" @("minimal drawing white wall gallery","line drawing empty space art","white gallery wall sparse art")
Apply-One "14" "work-02.jpg" "work_2_image" @("window light photo series gallery","photograph near window soft light","gallery photo prints window")
Apply-One "14" "work-03.jpg" "work_3_image" @("postcard shelf small artworks","small art objects white shelf","gallery postcard display shelf")

# 15 hero (correct file)
Apply-One "15" "hero.jpg" "hero_image" @("morning bakery bread rolls","fresh baked bread bakery morning","bakery counter morning loaves")

# 16 salon flower
Apply-One "16" "work-01.jpg" "work_1_image" @("hair salon cut flower bouquet","salon styling single flower","hairdresser scissors flower vase")

# 18 photo studio
Apply-One "18" "work-01.jpg" "work_1_image" @("family portrait soft light studio","family photo white background soft","parents child portrait studio")
Apply-One "18" "work-03.jpg" "work_3_image" @("passport photo plain background","ID photo formal portrait","identity photo white backdrop")

# 19 ramen
Apply-One "19" "work-02.jpg" "work_2_image" @("ramen roasted chashu bowl","char siu pork ramen steam","japanese ramen chashu slices")
Apply-One "19" "work-03.jpg" "work_3_image" @("soft boiled ramen egg","ajitsuke tamago ramen topping","ramen egg half soy")

# 26 photo mono
Apply-One "26" "work-02.jpg" "work_2_image" @("black white portrait headshot studio","monochrome actor headshot","bw portrait soft light")
Apply-One "26" "work-03.jpg" "work_3_image" @("photo contact sheet desk","photography delivery USB prints","photo studio desk files")

# 29 florist
Apply-One "29" "work-01.jpg" "work_1_image" @("table flower arrangement bouquet","florist table centerpiece","flower bouquet arrangement table")

# 30 gallery night
Apply-One "30" "work-01.jpg" "work_1_image" @("framed art exhibition white gallery","gallery wall framed paintings","art exhibition frames white wall")
Apply-One "30" "work-03.jpg" "work_3_image" @("evening art gallery opening warm light","gallery night framed art","art gallery evening interior warm")

$rep = Join-Path $root "_photo-wv-match-report.md"
$body = @("# photo-wv-match report", "", "| id | file | query | url |", "|----|------|-------|-----|") + $log.ToArray()
[IO.File]::WriteAllText($rep, ($body -join "`n"), $utf8)
Write-Host "DONE count=$($log.Count)"
Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
