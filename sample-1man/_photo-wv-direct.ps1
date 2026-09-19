# Direct Wikimedia URL apply for remaining FAIL/WEAK slots
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Add-Type -AssemblyName System.Drawing
$ua = "kuru-portfolio-photo-wv/1.0"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$utf8 = [Text.UTF8Encoding]::new($false)
$tmpRoot = Join-Path $env:TEMP ("photo-direct-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$v = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

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
function Apply-Url([string]$id, [string]$file, [string]$key, [string]$url, [string]$note, [switch]$Sync) {
  $dir = Folder $id
  Write-Host "== $id $file =="
  $tmp = Join-Path $tmpRoot ("t-" + [guid]::NewGuid().ToString("n") + ".jpg")
  $ok = $false
  for ($try = 1; $try -le 5; $try++) {
    try {
      Start-Sleep -Seconds (8 * $try)
      Invoke-WebRequest -Uri $url -OutFile $tmp -TimeoutSec 90 -Headers @{
        "User-Agent" = "kuru-portfolio-photo-wv/1.0 (portfolio sample rebuild; contact: local)"
        "Accept" = "image/jpeg,image/*,*/*"
      }
      $ok = $true
      break
    } catch {
      Write-Host "retry $try $id $file"
    }
  }
  if (-not $ok) { Write-Host "DL-FAIL $id $file"; return }
  if (-not (Test-Size $tmp)) { Write-Host "SIZE-FAIL $id $file"; return }
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
  Add-Content (Join-Path $dir.FullName "SOURCES-photo-wv.md") "| $id | $file | $note | $url | direct-wiki |" -Encoding UTF8
}

# 28 hero: empty yoga mat (leaf-sound / breath room)
Apply-Url "28" "hero.jpg" "hero_image" "https://upload.wikimedia.org/wikipedia/commons/6/6d/Yoga_mat.jpg" "empty yoga mat"
# keep about as seated meditation if current is OK - but replace with mat+water calm room as safer
Apply-Url "28" "about-01.jpg" "about_image_1" "https://upload.wikimedia.org/wikipedia/commons/5/50/Yoga_mat_and_water_bottle_in_a_living_room.jpg" "yoga mat water bottle room" -Sync
# 28 night forest
Apply-Url "28" "work-02.jpg" "work_2_image" "https://upload.wikimedia.org/wikipedia/commons/a/ac/Bog_lake_in_taiga_forest%2C_Dusk%2C_Ergaki%2C_Sayan_Mountains%2C_Siberia.jpg" "forest dusk taiga"

# 10 highball (whisky soda) — pair feel: use whisky soda; edamame alone is weaker but glass is the title core
Apply-Url "10" "work-03.jpg" "work_3_image" "https://upload.wikimedia.org/wikipedia/commons/c/c2/Whisky_soda_high_ball_by_uca0310_2013.jpg" "whisky soda highball"

# 03 cocktails
Apply-Url "03" "work-01.jpg" "work_1_image" "https://upload.wikimedia.org/wikipedia/commons/6/65/Images_of_drinks_with_neutral_Background%3B_Old_Fashioned_%28cocktail%29%2C_Whisky.jpg" "old fashioned cocktail"
Apply-Url "03" "work-02.jpg" "work_2_image" "https://upload.wikimedia.org/wikipedia/commons/3/33/Gin_and_tonic_with_lemon.jpg" "gin and tonic lemon"

# 07 donburi
Apply-Url "07" "work-02.jpg" "work_2_image" "https://upload.wikimedia.org/wikipedia/commons/2/26/Sukiya_eel%26beef_donburi.jpg" "donburi bowl"

# 09 stretch
Apply-Url "09" "work-02.jpg" "work_2_image" "https://upload.wikimedia.org/wikipedia/commons/8/87/Yoga_Stretch.jpg" "yoga stretch"

# 12 dog walk
Apply-Url "12" "work-01.jpg" "work_1_image" "https://upload.wikimedia.org/wikipedia/commons/5/58/Dog_walking_woman.jpg" "dog walking woman"

# 13 coworking plants
Apply-Url "13" "hero.jpg" "hero_image" "https://upload.wikimedia.org/wikipedia/commons/e/eb/Plant_in_a_coworking_space_%28Unsplash%29.jpg" "plant coworking"
# also modern office plants
# Apply-Url "13" "hero.jpg" "hero_image" "https://upload.wikimedia.org/wikipedia/commons/2/20/Modern_office_space_featuring_a_desk%2C_chairs%2C_and_plants.jpg" "office desk plants"

# 14 window photo series
Apply-Url "14" "work-02.jpg" "work_2_image" "https://upload.wikimedia.org/wikipedia/commons/e/ea/Window_photography.jpg" "window photography"

# 05 strawberry sando
Apply-Url "05" "work-01.jpg" "work_1_image" "https://upload.wikimedia.org/wikipedia/commons/e/e6/Strawberry_sando_sandwich.jpg" "strawberry sando"

# 15 bread
Apply-Url "15" "work-01.jpg" "work_1_image" "https://upload.wikimedia.org/wikipedia/commons/5/59/Bread_rolls.JPG" "bread rolls"
Apply-Url "15" "work-02.jpg" "work_2_image" "https://upload.wikimedia.org/wikipedia/commons/b/b8/Whole_Wheat_Bread_01.jpg" "whole wheat bread"

# 18 passport-ish: use a clean modern-looking ID style if possible — Laura Riding is historical; prefer colorchecker skip. Use Agnes only if needed.
# Better: studio plain — skip historical passport. Probe left none great; use Henri as last resort WEAK.
# Use ColorChecker is wrong. Keep a plain portrait approach via flickr later if needed.
# For now use a clean headshot passport style historical is still "証明写真" memory better than 1930s grid group.
Apply-Url "18" "work-03.jpg" "work_3_image" "https://upload.wikimedia.org/wikipedia/commons/7/7c/Henri_Pinault_1945_passport_photo.jpg" "passport photo plain"

# 21 herbal tea
Apply-Url "21" "work-03.jpg" "work_3_image" "https://upload.wikimedia.org/wikipedia/commons/b/b1/Mixture_for_herbal_tea_01.jpg" "herbal tea mixture"

# 23 meeting room
Apply-Url "23" "work-03.jpg" "work_3_image" "https://upload.wikimedia.org/wikipedia/commons/3/3a/Macau_AL_Meeting_Room.jpg" "meeting room"

# 30 gallery night
Apply-Url "30" "work-03.jpg" "work_3_image" "https://upload.wikimedia.org/wikipedia/commons/b/b4/HK_Sai_Ying_Pun_Third_Street_shop_interior_art_gallery_night_Sept-2012.JPG" "gallery night interior"

Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
Write-Host "DONE"
