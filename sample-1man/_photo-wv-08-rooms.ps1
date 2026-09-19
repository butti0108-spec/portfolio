# 08 work photos → ryokan rooms (flickr only; skip wikimedia 429)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dir = Get-ChildItem (Join-Path $root "sushi-samples") -Directory | Where-Object { $_.Name -like "08-*" } | Select-Object -First 1
if (-not $dir) { throw "08 folder missing" }
$stamp = "photo-wv-08-rooms"
$ua = "kuru-portfolio-photo-wv/1.0"
$tmpRoot = Join-Path $env:TEMP ("photo-wv-08b-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$ProgressPreference = "SilentlyContinue"

function Test-Ok([string]$path) {
  $fs = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $img = [Drawing.Image]::FromStream($fs)
    try {
      if ($img.Width -lt 500 -or $img.Height -lt 350) { return $false }
      return $true
    } finally { $img.Dispose() }
  } finally { $fs.Close() }
}

function Copy-Retry([string]$src, [string]$dest) {
  for ($a = 1; $a -le 12; $a++) {
    try { [IO.File]::Copy($src, $dest, $true); return } catch { Start-Sleep -Milliseconds (300 * $a) }
  }
  throw "copy-fail $dest"
}

function Pick-Url([string]$q, [System.Collections.Generic.HashSet[string]]$used) {
  $uri = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=20"
  Write-Host "API $q"
  $r = Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{ "User-Agent" = $ua }
  foreach ($item in @($r.results)) {
    if (-not $item.url) { continue }
    $u = [string]$item.url
    if ($u -notmatch 'staticflickr\.com') { continue }
    if ($item.width -lt 600 -or $item.height -lt 400) { continue }
    if (-not $used.Add($u)) { continue }
    $tmp = Join-Path $tmpRoot ("t-" + [guid]::NewGuid().ToString("n") + ".jpg")
    try {
      Invoke-WebRequest -Uri $u -OutFile $tmp -TimeoutSec 60 -Headers @{ "User-Agent" = $ua }
      if (Test-Ok $tmp) {
        return @{ Path = $tmp; Url = $u; Query = $q }
      }
      Remove-Item $tmp -Force -EA SilentlyContinue
    } catch {
      Write-Host ("dl fail: " + $_.Exception.Message)
      Remove-Item $tmp -Force -EA SilentlyContinue
    }
  }
  return $null
}

$used = New-Object "System.Collections.Generic.HashSet[string]"
$jobs = @(
  @{ File = "work-01.jpg"; Key = "work_1_image"; Q = @("ryokan interior", "tatami room", "washitsu") },
  @{ File = "work-02.jpg"; Key = "work_2_image"; Q = @("japanese room interior", "tatami sunlight", "ryokan room") },
  @{ File = "work-03.jpg"; Key = "work_3_image"; Q = @("futon japanese room", "ryokan hallway", "japanese inn interior") }
)

$imgDir = Join-Path $dir.FullName "images"
$v = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$draftPath = Join-Path $dir.FullName "draft.json"
$utf8 = [Text.UTF8Encoding]::new($false)
$draftText = [IO.File]::ReadAllText($draftPath, $utf8)
$notes = New-Object System.Collections.Generic.List[string]

foreach ($job in $jobs) {
  $hit = $null
  foreach ($q in $job.Q) {
    $hit = Pick-Url $q $used
    if ($hit) { break }
    Start-Sleep -Milliseconds 400
  }
  if (-not $hit) { throw "no photo for $($job.File)" }
  $dest = Join-Path $imgDir $job.File
  Copy-Retry $hit.Path $dest
  $rel = "sushi-samples/$($dir.Name)/images/$($job.File)?v=$stamp-$v"
  $pattern = '"' + $job.Key + '"\s*:\s*"[^"]*"'
  if ($draftText -notmatch $pattern) { throw "missing $($job.Key)" }
  $draftText = [regex]::Replace($draftText, $pattern, '"' + $job.Key + '":"' + $rel + '"', 1)
  $notes.Add("| $($job.File) | $($hit.Query) | $($hit.Url) |")
  Write-Host "OK $($job.File) <- $($hit.Url)"
  Start-Sleep -Milliseconds 500
}

if ($draftText -match '"brushUpPhoto"\s*:') {
  $draftText = [regex]::Replace($draftText, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-18-photo-wv-08-rooms"', 1)
} elseif ($draftText -match '"brushUpCopy"\s*:') {
  $draftText = [regex]::Replace($draftText, '("brushUpCopy"\s*:\s*"[^"]*")', '$1,"brushUpPhoto":"2026-09-18-photo-wv-08-rooms"', 1)
}

[IO.File]::WriteAllText($draftPath, $draftText, $utf8)
$srcMd = Join-Path $dir.FullName "SOURCES-photo-wv.md"
$block = @(
  "# SOURCES photo-wv 08 rooms",
  "",
  "| file | query | url |",
  "|------|-------|-----|"
) + $notes.ToArray() + @("", "stamp: $stamp", "")
$prior = if (Test-Path $srcMd) { "`n---`n" + [IO.File]::ReadAllText($srcMd, $utf8) } else { "" }
[IO.File]::WriteAllText($srcMd, (($block -join "`n") + $prior), $utf8)
Write-Host "done"
Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
