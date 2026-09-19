# Retry 10 highball + remaining hard mismatches
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
Add-Type -AssemblyName System.Drawing
$ua = "kuru-portfolio-photo-wv/1.0"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$utf8 = [Text.UTF8Encoding]::new($false)
$tmpRoot = Join-Path $env:TEMP ("photo-retry3-" + [guid]::NewGuid().ToString("n"))
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
      Write-Host "api-fail $q"; Start-Sleep -Milliseconds 900; continue
    }
    foreach ($item in @($r.results)) {
      if (-not $item.url) { continue }
      $u = [string]$item.url
      if ($u -notmatch "staticflickr\.com|pd\.w\.org|upload\.wikimedia\.org") { continue }
      if ($item.width -and ($item.width -lt 600 -or $item.height -lt 400)) { continue }
      $title = ([string]$item.title + " " + [string]$item.tags).ToLowerInvariant()
      if ($title -match "insect|bee|butterfly|beetle|bug|spider|moth|wasp|mojito|mint julep") { continue }
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
  Write-Host "== $id $file =="
  $hit = Pick $qs
  if (-not $hit) { Write-Host "FAIL $id $file"; return }
  Copy-Retry $hit.Path (Join-Path $dir.FullName ("images\" + $file))
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
      $k = "about_image_$i"; $af = ("about-{0:d2}.jpg" -f $i)
      $r2 = "sushi-samples/$($dir.Name)/images/$af?v=photo-wv-match-$v"
      $t = [regex]::Replace($t, '"' + $k + '"\s*:\s*"[^"]*"', '"' + $k + '":"' + $r2 + '"', 1)
    }
  }
  $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-18-photo-wv-match"', 1)
  [IO.File]::WriteAllText($dp, $t, $utf8)
  Write-Host "OK $id $file $($hit.Query)"
  Add-Content (Join-Path $dir.FullName "SOURCES-photo-wv.md") "| $id | $file | $($hit.Query) | $($hit.Url) | retry3 |" -Encoding UTF8
}

Apply-Slot "10" "work-03.jpg" "work_3_image" @(
  "whisky soda highball",
  "japanese highball drink",
  "whiskey soda glass ice",
  "beer glass appetizer",
  "cocktail glass ice soda",
  "glass of whisky on rocks"
)

# More clear mismatches from audit
Apply-Slot "07" "work-01.jpg" "work_1_image" @("shoyu ramen bowl", "soy sauce ramen steam", "japanese ramen bowl chopsticks")
Apply-Slot "07" "work-02.jpg" "work_2_image" @("japanese donburi bowl", "gyudon rice bowl egg", "donburi rice bowl nori")
Apply-Slot "12" "work-01.jpg" "work_1_image" @("dog walking leash park daytime", "walking dog sidewalk", "person dog leash outdoor")
Apply-Slot "18" "work-01.jpg" "work_1_image" @("family portrait studio", "family photo parents children", "family portrait outdoor natural")
Apply-Slot "21" "work-01.jpg" "work_1_image" @("green salad lunch plate", "fresh green salad bowl", "salad lunch cafe plate")
Apply-Slot "21" "work-03.jpg" "work_3_image" @("herbal tea cup leaves", "herb tea pot cup", "chamomile tea cup")
Apply-Slot "26" "about-01.jpg" "about_image_1" @("black white portrait studio", "monochrome portrait person", "bw portrait photography") -Sync
Apply-Slot "05" "work-01.jpg" "work_1_image" @("strawberry cream sandwich cake", "strawberry shortcake sandwich", "strawberry cream pastry")
Apply-Slot "15" "work-01.jpg" "work_1_image" @("plain bread roll bakery", "morning bread roll", "simple white bread roll")
Apply-Slot "15" "work-02.jpg" "work_2_image" @("whole wheat sandwich bread", "wholegrain loaf bread", "brown sandwich bread loaf")

Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
Write-Host "DONE"
