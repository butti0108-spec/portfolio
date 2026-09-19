# Sample 18: download remaining about portraits + verify works already on disk
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
Add-Type -AssemblyName System.Drawing
$imgDir = "C:\Users\masub\OneDrive\デスクトップ\テックメンター\ポートフォリオ\sample-1man\sushi-samples\18-studio-clinic-c\images"
$srcMd = "C:\Users\masub\OneDrive\デスクトップ\テックメンター\ポートフォリオ\sample-1man\sushi-samples\18-studio-clinic-c\SOURCES-photo-wv.md"
$hdr = @{
  "User-Agent" = "KuruPortfolioPhotoBot/1.0 (sample 18 portrait fix; local rebuild)"
  "Accept" = "image/jpeg,image/png,image/*,*/*"
}
function OkSize($p) {
  $fs = [IO.File]::Open($p, 'Open', 'Read', 'ReadWrite')
  try {
    $img = [Drawing.Image]::FromStream($fs)
    try { return ($img.Width -ge 500 -and $img.Height -ge 500) }
    finally { $img.Dispose() }
  } finally { $fs.Close() }
}
function Fetch($url, $dest, $note) {
  Write-Host "== $([IO.Path]::GetFileName($dest)) =="
  $tmp = Join-Path $env:TEMP ("18-" + [guid]::NewGuid().ToString('n') + '.jpg')
  $candidates = @()
  if ($url -match '/wikipedia/commons/([0-9a-f])/([0-9a-f]{2})/([^/]+)$') {
    $candidates += "https://upload.wikimedia.org/wikipedia/commons/thumb/$($Matches[1])/$($Matches[2])/$($Matches[3])/1280px-$($Matches[3])"
  }
  $candidates += $url
  $ok = $false
  foreach ($u in $candidates) {
    try {
      Start-Sleep -Seconds 8
      Write-Host "  $u"
      Invoke-WebRequest -Uri $u -OutFile $tmp -TimeoutSec 90 -Headers $hdr
      if (OkSize $tmp) {
        [IO.File]::Copy($tmp, $dest, $true)
        $ok = $true
        Add-Content $srcMd "| 18 | $([IO.Path]::GetFileName($dest)) | $note | $u | 18fix-2 |" -Encoding UTF8
        Write-Host "OK"
        break
      }
    } catch { Write-Host "  fail" }
  }
  Remove-Item $tmp -Force -EA SilentlyContinue
  if (-not $ok) { Write-Host "FAIL $dest" }
}

# about: calm face portrait (same for 01-03)
$aboutUrl = "https://upload.wikimedia.org/wikipedia/commons/e/eb/Kristalina_Georgieva_Headshot.jpg"
Fetch $aboutUrl (Join-Path $imgDir "about-01.jpg") "about calm headshot"
Copy-Item (Join-Path $imgDir "about-01.jpg") (Join-Path $imgDir "about-02.jpg") -Force
Copy-Item (Join-Path $imgDir "about-01.jpg") (Join-Path $imgDir "about-03.jpg") -Force

# If work-02 used same as about, swap work-02 to a different clear headshot
Fetch "https://upload.wikimedia.org/wikipedia/commons/e/e2/Mike_Bloomberg_Headshot.jpg" (Join-Path $imgDir "work-02.jpg") "宣材 professional headshot"

# hero: soft face (flickr already downloaded earlier; re-fetch if needed)
if (-not (OkSize (Join-Path $imgDir "hero.jpg"))) {
  Fetch "https://live.staticflickr.com/7127/6887694416_a43009c727_b.jpg" (Join-Path $imgDir "hero.jpg") "hero portrait"
}

# Ensure work-01 / work-03 exist and sized
foreach ($pair in @(
  @{ f='work-01.jpg'; u='https://upload.wikimedia.org/wikipedia/commons/d/df/Family_Portrait.jpg'; n='family portrait' },
  @{ f='work-03.jpg'; u='https://upload.wikimedia.org/wikipedia/commons/f/fc/Identity_Photo.jpg'; n='identity photo' }
)) {
  $p = Join-Path $imgDir $pair.f
  if (-not (Test-Path $p) -or -not (OkSize $p)) {
    Fetch $pair.u $p $pair.n
  } else {
    Write-Host "KEEP $($pair.f)"
  }
}

Write-Host "---- sizes ----"
Get-ChildItem $imgDir -Include hero.jpg,about-01.jpg,about-02.jpg,about-03.jpg,work-01.jpg,work-02.jpg,work-03.jpg -File | ForEach-Object {
  $fs = [IO.File]::Open($_.FullName, 'Open', 'Read', 'ReadWrite')
  try {
    $img = [Drawing.Image]::FromStream($fs)
    try { Write-Host ("{0}: {1}x{2} {3:N0}KB" -f $_.Name, $img.Width, $img.Height, ($_.Length/1KB)) }
    finally { $img.Dispose() }
  } finally { $fs.Close() }
}
Write-Host DONE
