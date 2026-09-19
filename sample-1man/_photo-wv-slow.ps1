# Slow direct apply — priority FAILs first (28 + 10 + hard leftovers)
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$utf8 = [Text.UTF8Encoding]::new($false)
$tmpRoot = Join-Path $env:TEMP ("photo-slow-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$v = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$hdr = @{
  "User-Agent" = "KuruPortfolioPhotoBot/1.0 (sample site rebuild; offline local use)"
  "Accept" = "image/jpeg,image/png,image/*,*/*"
}

function Folder([string]$id) {
  Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
}
function Test-Size([string]$path) {
  $fs = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $img = [Drawing.Image]::FromStream($fs)
    try { return ($img.Width -ge 500 -and $img.Height -ge 350) }
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
  if ($url -match '/wikipedia/commons/thumb/') { return $url }
  if ($url -notmatch '/wikipedia/commons/([0-9a-f])/([0-9a-f]{2})/([^/]+)$') { return $url }
  $a = $Matches[1]; $b = $Matches[2]; $f = $Matches[3]
  return "https://upload.wikimedia.org/wikipedia/commons/thumb/$a/$b/$f/${w}px-$f"
}
function Apply-Url([string]$id, [string]$file, [string]$key, [string]$url, [string]$note, [switch]$Sync) {
  $dir = Folder $id
  Write-Host "== $id $file =="
  $tmp = Join-Path $tmpRoot ("t-" + [guid]::NewGuid().ToString("n") + ".jpg")
  $candidates = @(
    (To-Thumb $url 1280),
    (To-Thumb $url 1024),
    $url
  ) | Select-Object -Unique
  $ok = $false
  foreach ($u in $candidates) {
    for ($try = 1; $try -le 3; $try++) {
      try {
        Write-Host "  get $u (try $try)"
        Start-Sleep -Seconds (6 + 4 * $try)
        Invoke-WebRequest -Uri $u -OutFile $tmp -TimeoutSec 90 -Headers $hdr
        if (Test-Size $tmp) { $ok = $true; $url = $u; break }
      } catch {
        Write-Host "  fail $($_.Exception.Message)"
      }
    }
    if ($ok) { break }
  }
  if (-not $ok) { Write-Host "DL-FAIL $id $file"; return }
  Copy-Retry $tmp (Join-Path $dir.FullName ("images\" + $file))
  if ($Sync) {
    for ($i = 2; $i -le 3; $i++) {
      Copy-Retry $tmp (Join-Path $dir.FullName ("images\about-{0:d2}.jpg" -f $i))
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
  Write-Host "OK $id $file $note"
  Add-Content (Join-Path $dir.FullName "SOURCES-photo-wv.md") "| $id | $file | $note | $url | slow-wiki |" -Encoding UTF8
}

# Priority: 28 + 10
Apply-Url "28" "hero.jpg" "hero_image" "https://upload.wikimedia.org/wikipedia/commons/6/6d/Yoga_mat.jpg" "empty yoga mat"
Apply-Url "28" "about-01.jpg" "about_image_1" "https://upload.wikimedia.org/wikipedia/commons/5/50/Yoga_mat_and_water_bottle_in_a_living_room.jpg" "yoga mat room" -Sync
Apply-Url "28" "work-02.jpg" "work_2_image" "https://upload.wikimedia.org/wikipedia/commons/a/ac/Bog_lake_in_taiga_forest%2C_Dusk%2C_Ergaki%2C_Sayan_Mountains%2C_Siberia.jpg" "forest dusk"
Apply-Url "10" "work-03.jpg" "work_3_image" "https://upload.wikimedia.org/wikipedia/commons/c/c2/Whisky_soda_high_ball_by_uca0310_2013.jpg" "whisky soda highball"

# Remaining hard FAILs
Apply-Url "03" "work-01.jpg" "work_1_image" "https://upload.wikimedia.org/wikipedia/commons/6/65/Images_of_drinks_with_neutral_Background%3B_Old_Fashioned_%28cocktail%29%2C_Whisky.jpg" "old fashioned"
Apply-Url "03" "work-02.jpg" "work_2_image" "https://upload.wikimedia.org/wikipedia/commons/3/33/Gin_and_tonic_with_lemon.jpg" "gin tonic"
Apply-Url "07" "work-02.jpg" "work_2_image" "https://upload.wikimedia.org/wikipedia/commons/2/26/Sukiya_eel%26beef_donburi.jpg" "donburi"
Apply-Url "09" "work-02.jpg" "work_2_image" "https://upload.wikimedia.org/wikipedia/commons/8/87/Yoga_Stretch.jpg" "yoga stretch"
Apply-Url "12" "work-01.jpg" "work_1_image" "https://upload.wikimedia.org/wikipedia/commons/5/58/Dog_walking_woman.jpg" "dog walking"
Apply-Url "13" "hero.jpg" "hero_image" "https://upload.wikimedia.org/wikipedia/commons/2/20/Modern_office_space_featuring_a_desk%2C_chairs%2C_and_plants.jpg" "office plants"
Apply-Url "14" "work-02.jpg" "work_2_image" "https://upload.wikimedia.org/wikipedia/commons/e/ea/Window_photography.jpg" "window photo"
Apply-Url "05" "work-01.jpg" "work_1_image" "https://upload.wikimedia.org/wikipedia/commons/e/e6/Strawberry_sando_sandwich.jpg" "strawberry sando"
Apply-Url "15" "work-01.jpg" "work_1_image" "https://upload.wikimedia.org/wikipedia/commons/5/59/Bread_rolls.JPG" "bread rolls"
Apply-Url "15" "work-02.jpg" "work_2_image" "https://upload.wikimedia.org/wikipedia/commons/b/b8/Whole_Wheat_Bread_01.jpg" "whole wheat"
Apply-Url "21" "work-03.jpg" "work_3_image" "https://upload.wikimedia.org/wikipedia/commons/b/b1/Mixture_for_herbal_tea_01.jpg" "herbal tea"
Apply-Url "23" "work-03.jpg" "work_3_image" "https://upload.wikimedia.org/wikipedia/commons/3/3a/Macau_AL_Meeting_Room.jpg" "meeting room"
Apply-Url "30" "work-03.jpg" "work_3_image" "https://upload.wikimedia.org/wikipedia/commons/b/b4/HK_Sai_Ying_Pun_Third_Street_shop_interior_art_gallery_night_Sept-2012.JPG" "gallery night"

Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
Write-Host "DONE"
