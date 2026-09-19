# Apply approved image-grammar assignments to first-team samples.
# Constraints: no code/quality-bar changes; palette HEX untouched; ①② only.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Web.Extensions

$sushi = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "sushi-samples"
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$ser.MaxJsonLength = [int]::MaxValue

function Read-Draft([string]$path) {
  $raw = [IO.File]::ReadAllText($path, [Text.UTF8Encoding]::new($false))
  return $ser.DeserializeObject($raw)
}

function Write-Draft($obj, [string]$path) {
  $json = $ser.Serialize($obj)
  $tmp = $path + ".tmp"
  [IO.File]::WriteAllText($tmp, $json, [Text.UTF8Encoding]::new($false))
  if (Test-Path $path) {
    try { [IO.File]::Delete($path) } catch { Start-Sleep -Milliseconds 300; [IO.File]::Delete($path) }
  }
  [IO.File]::Move($tmp, $path)
}

function Find-Folder([string]$id) {
  $d = Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
  if (-not $d) { throw "folder not found for $id" }
  return $d.FullName
}

function Hex-Color([string]$hex) {
  $h = $hex.TrimStart('#')
  if ($h.Length -eq 3) { $h = "$($h[0])$($h[0])$($h[1])$($h[1])$($h[2])$($h[2])" }
  $r = [Convert]::ToInt32($h.Substring(0,2),16)
  $g = [Convert]::ToInt32($h.Substring(2,2),16)
  $b = [Convert]::ToInt32($h.Substring(4,2),16)
  return [System.Drawing.Color]::FromArgb(255,$r,$g,$b)
}

function Write-Swatch([string]$outPath, [string]$hex) {
  $bmp = New-Object System.Drawing.Bitmap 1200, 800
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear((Hex-Color $hex))
  $g.Dispose()
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L
  $tmp = $outPath + ".tmp.jpg"
  $bmp.Save($tmp, $codec, $ep)
  $bmp.Dispose()
  if (Test-Path $outPath) {
    try { [IO.File]::Delete($outPath) } catch { Start-Sleep -Milliseconds 200; [IO.File]::Delete($outPath) }
  }
  [IO.File]::Move($tmp, $outPath)
}

function Ensure-ItemLayout($draft) {
  if (-not $draft.ContainsKey('itemLayouts') -or $null -eq $draft['itemLayouts']) {
    $draft['itemLayouts'] = @{}
  }
  if (-not $draft['itemLayouts'].ContainsKey('about-photos')) {
    $draft['itemLayouts']['about-photos'] = @{}
  }
  if (-not $draft.ContainsKey('draftCounts') -or $null -eq $draft['draftCounts']) {
    $draft['draftCounts'] = @{}
  }
  if (-not $draft.ContainsKey('imagePaths') -or $null -eq $draft['imagePaths']) {
    $draft['imagePaths'] = @{}
  }
}

function Set-AboutLayout($draft, [int]$count, $sizes, [string]$gap, $focals) {
  Ensure-ItemLayout $draft
  $draft['draftCounts']['about-photos'] = $count
  $draft['itemLayouts']['about-photos'] = @{
    sizes = [object[]]$sizes
    gap = $gap
    growDirs = @()
    focalYs = [object[]]$focals
  }
}

function Rel-Path([string]$folderName, [string]$file, [string]$v) {
  return "sushi-samples/$folderName/images/$file?v=$v"
}

function Sync-ContinuousFiles([string]$folder, [int]$n) {
  $src = Join-Path $folder "images\about-01.jpg"
  if (-not (Test-Path $src)) { throw "missing about-01 in $folder" }
  $bytes = [IO.File]::ReadAllBytes($src)
  for ($i = 2; $i -le $n; $i++) {
    $dst = Join-Path $folder ("images\about-{0:d2}.jpg" -f $i)
    $tmp = $dst + ".tmp"
    [IO.File]::WriteAllBytes($tmp, $bytes)
    if (Test-Path $dst) {
      try { [IO.File]::Delete($dst) } catch { Start-Sleep -Milliseconds 200; [IO.File]::Delete($dst) }
    }
    [IO.File]::Move($tmp, $dst)
  }
}

$stamp = "grammar-24-v1"
$log = New-Object System.Collections.Generic.List[string]

# --- Continuous trimming ---
$continuous = @(
  @{ id='01'; n=4; focals=@(10,35,60,85) },
  @{ id='03'; n=3; focals=@(15,50,85) },
  @{ id='06'; n=3; focals=@(20,50,80) },
  @{ id='08'; n=4; focals=@(10,35,60,85) },
  @{ id='09'; n=3; focals=@(15,50,85) },
  @{ id='28'; n=3; focals=@(20,50,80) }
)

foreach ($c in $continuous) {
  $folder = Find-Folder $c.id
  $name = Split-Path $folder -Leaf
  $draftPath = Join-Path $folder "draft.json"
  $draft = Read-Draft $draftPath
  Sync-ContinuousFiles $folder $c.n
  $sizes = @(1..$c.n | ForEach-Object { 'L' })
  Set-AboutLayout $draft $c.n $sizes 'tight' $c.focals
  for ($i = 1; $i -le $c.n; $i++) {
    $draft['imagePaths'][("about_image_" + $i)] = (Rel-Path $name ("about-{0:d2}.jpg" -f $i) $stamp)
  }
  # keep hero path if present
  if (-not $draft['imagePaths'].ContainsKey('hero_image') -or [string]::IsNullOrWhiteSpace([string]$draft['imagePaths']['hero_image'])) {
    $draft['imagePaths']['hero_image'] = (Rel-Path $name 'hero.jpg' $stamp)
  } else {
    $draft['imagePaths']['hero_image'] = (Rel-Path $name 'hero.jpg' $stamp)
  }
  $draft['brushUpPhoto'] = "2026-09-17-grammar-continuous"
  $draft['layoutRecipeNote'] = ("grammar continuous n={0}" -f $c.n)
  Write-Draft $draft $draftPath
  $log.Add("continuous $($c.id) n=$($c.n)")
}

# --- Insert (挟む): photo / palette swatch / photo ---
$inserts = @(
  @{ id='05'; hexKey='pageBg'; fallback='#fdf5f6' },
  @{ id='14'; hexKey='chromeBg'; fallback='#7a9ab8'; lighten=$true },
  @{ id='18'; hexKey='pageBg'; fallback='#ffffff' },
  @{ id='26'; hexKey='accent'; fallback='#c9a227'; mute=$true },
  @{ id='30'; hexKey='pageBg'; fallback='#262828' }
)

function Adjust-Hex([string]$hex, $lighten, $mute) {
  $c = Hex-Color $hex
  $r = [int]$c.R; $g = [int]$c.G; $b = [int]$c.B
  if ($lighten) {
    $r = [Math]::Min(255, [int]($r + (255-$r)*0.72))
    $g = [Math]::Min(255, [int]($g + (255-$g)*0.72))
    $b = [Math]::Min(255, [int]($b + (255-$b)*0.72))
  }
  if ($mute) {
    # pull toward mid gray slightly (muted gold/ink)
    $r = [int](($r * 0.55) + (40 * 0.45))
    $g = [int](($g * 0.55) + (36 * 0.45))
    $b = [int](($b * 0.55) + (28 * 0.45))
  }
  return ("#{0:X2}{1:X2}{2:X2}" -f $r,$g,$b)
}

foreach ($ins in $inserts) {
  $folder = Find-Folder $ins.id
  $name = Split-Path $folder -Leaf
  $draftPath = Join-Path $folder "draft.json"
  $draft = Read-Draft $draftPath
  Ensure-ItemLayout $draft
  $hex = $ins.fallback
  if ($draft.ContainsKey('draftColors') -and $draft['draftColors'].ContainsKey($ins.hexKey)) {
    $hex = [string]$draft['draftColors'][$ins.hexKey]
  }
  $swatchHex = Adjust-Hex $hex ($ins.ContainsKey('lighten') -and $ins.lighten) ($ins.ContainsKey('mute') -and $ins.mute)
  $swatchFile = "color-insert.jpg"
  Write-Swatch (Join-Path $folder "images\$swatchFile") $swatchHex
  Set-AboutLayout $draft 3 @('L','L','L') 'normal' @(30,50,70)
  $draft['imagePaths']['about_image_1'] = (Rel-Path $name 'about-01.jpg' $stamp)
  $draft['imagePaths']['about_image_2'] = (Rel-Path $name $swatchFile $stamp)
  $draft['imagePaths']['about_image_3'] = (Rel-Path $name 'about-02.jpg' $stamp)
  $draft['imagePaths']['hero_image'] = (Rel-Path $name 'hero.jpg' $stamp)
  $draft['brushUpPhoto'] = "2026-09-17-grammar-insert"
  $draft['layoutRecipeNote'] = ("grammar insert swatch={0}" -f $swatchHex)
  Write-Draft $draft $draftPath
  $log.Add("insert $($ins.id) swatch=$swatchHex")
}

# --- 16: 王道 + 別写真HH ---
{
  $folder = Find-Folder '16'
  $name = Split-Path $folder -Leaf
  $draftPath = Join-Path $folder "draft.json"
  $draft = Read-Draft $draftPath
  Set-AboutLayout $draft 2 @('H','H') 'tight' @(45,55)
  $draft['imagePaths']['about_image_1'] = (Rel-Path $name 'about-01.jpg' $stamp)
  $draft['imagePaths']['about_image_2'] = (Rel-Path $name 'about-02.jpg' $stamp)
  $draft['imagePaths']['hero_image'] = (Rel-Path $name 'hero.jpg' $stamp)
  $draft['brushUpPhoto'] = "2026-09-17-grammar-hh"
  $draft['layoutRecipeNote'] = "grammar HH flower|hair"
  Write-Draft $draft $draftPath
  $log.Add("hh 16")
}

# --- 21: 王道 + 色キャッチ (heroImageOff) ---
{
  $folder = Find-Folder '21'
  $name = Split-Path $folder -Leaf
  $draftPath = Join-Path $folder "draft.json"
  $draft = Read-Draft $draftPath
  $draft['heroImageOff'] = $true
  $draft['heroTextOnPhoto'] = $true
  # keep about as ordinary 王道 (distinct photos) — ensure not continuous
  if ([int]$draft['draftCounts']['about-photos'] -lt 2) {
    $draft['draftCounts']['about-photos'] = 3
  }
  $draft['brushUpPhoto'] = "2026-09-17-grammar-color-catch"
  $draft['layoutRecipeNote'] = "grammar color-catch + oudo"
  Write-Draft $draft $draftPath
  $log.Add("color-catch 21 heroImageOff=true")
}

# Tag remaining 王道 first-team for traceability (structure unchanged)
$oudo = @('02','04','07','10','11','12','13','15','19','23','29')
foreach ($id in $oudo) {
  $folder = Find-Folder $id
  $draftPath = Join-Path $folder "draft.json"
  $draft = Read-Draft $draftPath
  $draft['brushUpPhoto'] = "2026-09-17-grammar-oudo"
  if (-not $draft.ContainsKey('layoutRecipeNote') -or [string]::IsNullOrWhiteSpace([string]$draft['layoutRecipeNote'])) {
    $draft['layoutRecipeNote'] = "grammar oudo"
  } elseif ([string]$draft['layoutRecipeNote'] -notmatch 'grammar') {
    $draft['layoutRecipeNote'] = ([string]$draft['layoutRecipeNote'] + " | grammar oudo")
  }
  Write-Draft $draft $draftPath
  $log.Add("oudo-tag $id")
}

$logPath = Join-Path $sushi "_grammar-apply-log.txt"
[IO.File]::WriteAllLines($logPath, $log)
Write-Host "DONE"
$log | ForEach-Object { Write-Host $_ }
