# 28 葉音ヨガ: replace all photos to match copy/worldview
# about連: 葉音・緑の静けさ（同一原板連続）
# work1 朝のリセット → 竹やぶ
# work2 夜のリラックス → 森・夕〜夜の静けさ
# work3 プライベート60分 → 木漏れ日
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dir = Get-ChildItem (Join-Path $root "sushi-samples") -Directory | Where-Object { $_.Name -like "28-*" } | Select-Object -First 1
if (-not $dir) { throw "28 missing" }
$stamp = "photo-wv-28-leaf"
$ua = "kuru-portfolio-photo-wv/1.0"
$tmpRoot = Join-Path $env:TEMP ("photo-28-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$ProgressPreference = "SilentlyContinue"
$used = New-Object "System.Collections.Generic.HashSet[string]"

function Test-Size([string]$path) {
  $fs = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $img = [Drawing.Image]::FromStream($fs)
    try { return ($img.Width -ge 600 -and $img.Height -ge 400) }
    finally { $img.Dispose() }
  } finally { $fs.Close() }
}
function Copy-Retry([string]$src, [string]$dest) {
  for ($a = 1; $a -le 12; $a++) {
    try { [IO.File]::Copy($src, $dest, $true); return } catch { Start-Sleep -Milliseconds (300 * $a) }
  }
  throw "copy-fail $dest"
}
function Pick([string[]]$queries) {
  foreach ($q in $queries) {
    Write-Host "API $q"
    $uri = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=20"
    $r = Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{ "User-Agent" = $ua }
    foreach ($item in @($r.results)) {
      if (-not $item.url) { continue }
      $u = [string]$item.url
      if ($u -notmatch 'staticflickr\.com') { continue }
      if ($item.width -lt 700 -or $item.height -lt 500) { continue }
      if (-not $used.Add($u)) { continue }
      $tmp = Join-Path $tmpRoot ("t-" + [guid]::NewGuid().ToString("n") + ".jpg")
      try {
        Invoke-WebRequest -Uri $u -OutFile $tmp -TimeoutSec 60 -Headers @{ "User-Agent" = $ua }
        if (Test-Size $tmp) { return @{ Path = $tmp; Url = $u; Query = $q } }
      } catch { }
      Remove-Item $tmp -Force -EA SilentlyContinue
    }
    Start-Sleep -Milliseconds 350
  }
  throw "no photo for $($queries[0])"
}

$jobs = @(
  @{
    Files = @("about-01.jpg"); SyncAbout = $true
    Key = "about_image_1"
    Q = @("green leaves sunlight calm", "forest leaves soft light", "bamboo green leaves close")
  }
  @{
    Files = @("work-01.jpg"); Key = "work_1_image"
    Q = @("bamboo grove path", "bamboo forest morning", "bamboo thicket sunlight")
  }
  @{
    Files = @("work-02.jpg"); Key = "work_2_image"
    Q = @("forest evening calm trees", "woods dusk soft light", "quiet forest night trees")
  }
  @{
    Files = @("work-03.jpg"); Key = "work_3_image"
    Q = @("sunbeams through trees komorebi", "forest light rays morning", "sunlight through leaves")
  }
  @{
    Files = @("hero.jpg"); Key = "hero_image"
    Q = @("yoga mat calm room soft light", "meditation mat sunlight floor", "empty yoga studio soft green light")
  }
)

$imgDir = Join-Path $dir.FullName "images"
$v = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$draftPath = Join-Path $dir.FullName "draft.json"
$utf8 = [Text.UTF8Encoding]::new($false)
$draftText = [IO.File]::ReadAllText($draftPath, $utf8)
$notes = New-Object System.Collections.Generic.List[string]
$aboutBytes = $null

foreach ($job in $jobs) {
  $hit = Pick $job.Q
  $bytes = [IO.File]::ReadAllBytes($hit.Path)
  foreach ($f in $job.Files) {
    $dest = Join-Path $imgDir $f
    [IO.File]::WriteAllBytes((Join-Path $tmpRoot "w-$f"), $bytes)
    Copy-Retry (Join-Path $tmpRoot "w-$f") $dest
  }
  if ($job.SyncAbout) {
    $aboutBytes = $bytes
    foreach ($i in 2..3) {
      $af = "about-{0:d2}.jpg" -f $i
      Copy-Retry $hit.Path (Join-Path $imgDir $af)
    }
  }
  $rel = "sushi-samples/$($dir.Name)/images/$($job.Files[0])?v=$stamp-$v"
  if ($job.Key) {
    $pattern = '"' + $job.Key + '"\s*:\s*"[^"]*"'
    if ($draftText -match $pattern) {
      $draftText = [regex]::Replace($draftText, $pattern, '"' + $job.Key + '":"' + $rel + '"', 1)
    }
  }
  if ($job.SyncAbout) {
    foreach ($k in @("about_image_2","about_image_3")) {
      $pattern = '"' + $k + '"\s*:\s*"[^"]*"'
      $af = if ($k -eq "about_image_2") { "about-02.jpg" } else { "about-03.jpg" }
      $r2 = "sushi-samples/$($dir.Name)/images/$af?v=$stamp-$v"
      if ($draftText -match $pattern) {
        $draftText = [regex]::Replace($draftText, $pattern, '"' + $k + '":"' + $r2 + '"', 1)
      }
    }
  }
  $notes.Add("| $($job.Files[0]) | $($hit.Query) | $($hit.Url) |")
  Write-Host "OK $($job.Files[0])"
  Start-Sleep -Milliseconds 400
}

if ($draftText -match '"brushUpPhoto"\s*:') {
  $draftText = [regex]::Replace($draftText, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-18-photo-wv-28-leaf"', 1)
} else {
  $draftText = [regex]::Replace($draftText, '("brushUpCopy"\s*:\s*"[^"]*")', '$1,"brushUpPhoto":"2026-09-18-photo-wv-28-leaf"', 1)
}
[IO.File]::WriteAllText($draftPath, $draftText, $utf8)

$srcMd = Join-Path $dir.FullName "SOURCES-photo-wv.md"
$block = @("# SOURCES photo-wv 28 leaf sound", "", "| file | query | url |", "|------|-------|-----|") + $notes.ToArray() + @("", "stamp: $stamp", "about: continuous same bytes", "")
$prior = if (Test-Path $srcMd) { "`n---`n" + [IO.File]::ReadAllText($srcMd, $utf8) } else { "" }
[IO.File]::WriteAllText($srcMd, (($block -join "`n") + $prior), $utf8)
Write-Host "done 28"
Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
