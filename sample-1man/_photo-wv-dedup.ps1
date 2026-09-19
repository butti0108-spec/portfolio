# Dedup only
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$utf8 = [Text.UTF8Encoding]::new($false)
$tmpRoot = Join-Path $env:TEMP ("photo-dedup2-" + [guid]::NewGuid().ToString("n"))
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
  try { $img = [Drawing.Image]::FromStream($fs); try { return ($img.Width -ge 500 -and $img.Height -ge 350) } finally { $img.Dispose() } }
  finally { $fs.Close() }
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
function Apply-Url([string]$id, [string]$file, [string]$key, [string]$url, [string]$note) {
  $dir = Folder $id
  Write-Host "== $id $file =="
  $tmp = Join-Path $tmpRoot ("t-" + [guid]::NewGuid().ToString("n") + ".jpg")
  $ok = $false
  foreach ($u in @((To-Thumb $url 1280), $url) | Select-Object -Unique) {
    try {
      Start-Sleep -Seconds 10
      Write-Host "  $u"
      Invoke-WebRequest -Uri $u -OutFile $tmp -TimeoutSec 90 -Headers $hdr
      if (Test-Size $tmp) { $ok = $true; $url = $u; break }
    } catch { Write-Host "  fail" }
  }
  if (-not $ok) { Write-Host "DL-FAIL $id $file"; return }
  Copy-Retry $tmp (Join-Path $dir.FullName ("images\" + $file))
  $dp = Join-Path $dir.FullName "draft.json"
  $t = [IO.File]::ReadAllText($dp, $utf8)
  $rel = "sushi-samples/$($dir.Name)/images/$file?v=photo-wv-match-$v"
  $t = [regex]::Replace($t, '"' + $key + '"\s*:\s*"[^"]*"', '"' + $key + '":"' + $rel + '"', 1)
  $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-18-photo-wv-match"', 1)
  [IO.File]::WriteAllText($dp, $t, $utf8)
  Write-Host "OK $id $file $note"
  Add-Content (Join-Path $dir.FullName "SOURCES-photo-wv.md") "| $id | $file | $note | $url | dedup |" -Encoding UTF8
}

Apply-Url "19" "work-03.jpg" "work_3_image" "https://upload.wikimedia.org/wikipedia/commons/8/8a/Onsen_tamago_at_minshuku_Korakuen%2C_Nagano_by_Blue_Lotus.jpg" "onsen tamago"
Apply-Url "12" "work-03.jpg" "work_3_image" "https://upload.wikimedia.org/wikipedia/commons/a/a4/Dog_Walk_%288548992109%29.jpg" "dog walk weekend"
Apply-Url "14" "work-01.jpg" "work_1_image" "https://upload.wikimedia.org/wikipedia/commons/8/89/Place_du_Carrousel_from_the_window_2007.jpg" "window light series"

Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
Write-Host "DONE"
