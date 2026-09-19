# Safe grammar apply using ConvertFrom-Json / ConvertTo-Json only.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sushi = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "sushi-samples"
$stamp = "grammar-24-v1"
$log = New-Object System.Collections.Generic.List[string]

function Find-Folder([string]$id) {
  $d = Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
  if (-not $d) { throw "missing folder $id" }
  return $d
}

function Save-Json($obj, [string]$path) {
  $json = $obj | ConvertTo-Json -Depth 40 -Compress
  if ([string]::IsNullOrWhiteSpace($json) -or $json.Trim() -eq 'null') { throw "refuse write null to $path" }
  $tmp = "$path.tmp"
  [IO.File]::WriteAllText($tmp, $json, [Text.UTF8Encoding]::new($false))
  $bak = "$path.bak"
  if (Test-Path $path) { Copy-Item -Force $path $bak }
  [IO.File]::Copy($tmp, $path, $true)
  Remove-Item -Force $tmp -ErrorAction SilentlyContinue
}

function HexColor([string]$hex) {
  $h = $hex.TrimStart('#')
  if ($h.Length -eq 3) { $h = "$($h[0])$($h[0])$($h[1])$($h[1])$($h[2])$($h[2])" }
  return [Drawing.Color]::FromArgb(255,
    [Convert]::ToInt32($h.Substring(0,2),16),
    [Convert]::ToInt32($h.Substring(2,2),16),
    [Convert]::ToInt32($h.Substring(4,2),16))
}

function Write-Swatch([string]$path, [string]$hex) {
  $bmp = New-Object Drawing.Bitmap 1200, 800
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.Clear((HexColor $hex))
  $g.Dispose()
  $codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ep = New-Object Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), 92L
  $tmp = "$path.tmp.jpg"
  $bmp.Save($tmp, $codec, $ep)
  $bmp.Dispose()
  [IO.File]::Copy($tmp, $path, $true)
  Remove-Item -Force $tmp -ErrorAction SilentlyContinue
}

function Sync-Plate([string]$folderPath, [int]$n) {
  $src = Join-Path $folderPath "images\about-01.jpg"
  $bytes = [IO.File]::ReadAllBytes($src)
  for ($i=2; $i -le $n; $i++) {
    $dst = Join-Path $folderPath ("images\about-{0:d2}.jpg" -f $i)
    $tmp = "$dst.tmp"
    [IO.File]::WriteAllBytes($tmp, $bytes)
    [IO.File]::Copy($tmp, $dst, $true)
    Remove-Item -Force $tmp -ErrorAction SilentlyContinue
  }
}

function Apply-Continuous([string]$id, [int]$n, $focals) {
  $dir = Find-Folder $id
  $path = Join-Path $dir.FullName "draft.json"
  $j = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
  Sync-Plate $dir.FullName $n
  $sizes = @(); 1..$n | ForEach-Object { $sizes += 'L' }
  $j.draftCounts | Add-Member -NotePropertyName 'about-photos' -NotePropertyValue $n -Force
  $j.itemLayouts | Add-Member -NotePropertyName 'about-photos' -NotePropertyValue ([pscustomobject]@{
    sizes = $sizes
    gap = 'tight'
    growDirs = @()
    focalYs = $focals
  }) -Force
  if (-not $j.imagePaths) { $j | Add-Member -NotePropertyName imagePaths -NotePropertyValue ([pscustomobject]@{}) -Force }
  $name = $dir.Name
  for ($i=1; $i -le $n; $i++) {
    $key = "about_image_$i"
    $val = "sushi-samples/$name/images/about-{0:d2}.jpg?v=$stamp" -f $i
    $j.imagePaths | Add-Member -NotePropertyName $key -NotePropertyValue $val -Force
  }
  $j.imagePaths | Add-Member -NotePropertyName hero_image -NotePropertyValue "sushi-samples/$name/images/hero.jpg?v=$stamp" -Force
  $j | Add-Member -NotePropertyName brushUpPhoto -NotePropertyValue "2026-09-17-grammar-continuous" -Force
  $j | Add-Member -NotePropertyName layoutRecipeNote -NotePropertyValue "grammar continuous n=$n" -Force
  Save-Json $j $path
  $log.Add("continuous $id n=$n")
}

function Mix-Hex([string]$hex, [bool]$lighten, [bool]$mute) {
  $c = HexColor $hex
  $r=[int]$c.R; $g=[int]$c.G; $b=[int]$c.B
  if ($lighten) {
    $r = [Math]::Min(255,[int]($r+(255-$r)*0.72))
    $g = [Math]::Min(255,[int]($g+(255-$g)*0.72))
    $b = [Math]::Min(255,[int]($b+(255-$b)*0.72))
  }
  if ($mute) {
    $r = [int]($r*0.55 + 40*0.45)
    $g = [int]($g*0.55 + 36*0.45)
    $b = [int]($b*0.55 + 28*0.45)
  }
  return "#{0:X2}{1:X2}{2:X2}" -f $r,$g,$b
}

function Apply-Insert([string]$id, [string]$hexKey, [bool]$lighten, [bool]$mute) {
  $dir = Find-Folder $id
  $path = Join-Path $dir.FullName "draft.json"
  $j = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
  $hex = $j.draftColors.$hexKey
  if (-not $hex) { throw "no $hexKey on $id" }
  $sw = Mix-Hex $hex $lighten $mute
  $swatchPath = Join-Path $dir.FullName "images\color-insert.jpg"
  Write-Swatch $swatchPath $sw
  $j.draftCounts | Add-Member -NotePropertyName 'about-photos' -NotePropertyValue 3 -Force
  $j.itemLayouts | Add-Member -NotePropertyName 'about-photos' -NotePropertyValue ([pscustomobject]@{
    sizes = @('L','L','L'); gap='normal'; growDirs=@(); focalYs=@(30,50,70)
  }) -Force
  $name = $dir.Name
  if (-not $j.imagePaths) { $j | Add-Member imagePaths ([pscustomobject]@{}) -Force }
  $j.imagePaths | Add-Member about_image_1 "sushi-samples/$name/images/about-01.jpg?v=$stamp" -Force
  $j.imagePaths | Add-Member about_image_2 "sushi-samples/$name/images/color-insert.jpg?v=$stamp" -Force
  $j.imagePaths | Add-Member about_image_3 "sushi-samples/$name/images/about-02.jpg?v=$stamp" -Force
  $j.imagePaths | Add-Member hero_image "sushi-samples/$name/images/hero.jpg?v=$stamp" -Force
  $j | Add-Member brushUpPhoto "2026-09-17-grammar-insert" -Force
  $j | Add-Member layoutRecipeNote "grammar insert swatch=$sw" -Force
  Save-Json $j $path
  $log.Add("insert $id $sw")
}

# Continuous
Apply-Continuous '01' 4 @(10,35,60,85)
Apply-Continuous '03' 3 @(15,50,85)
Apply-Continuous '06' 3 @(20,50,80)
Apply-Continuous '08' 4 @(10,35,60,85)
Apply-Continuous '09' 3 @(15,50,85)
Apply-Continuous '28' 3 @(20,50,80)

# Insert
Apply-Insert '05' 'pageBg' $false $false
Apply-Insert '14' 'chromeBg' $true $false
Apply-Insert '18' 'pageBg' $false $false
Apply-Insert '26' 'accent' $false $true
Apply-Insert '30' 'pageBg' $false $false

# 16 HH
$dir = Find-Folder '16'
$path = Join-Path $dir.FullName 'draft.json'
$j = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
$j.draftCounts | Add-Member about-photos 2 -Force
$j.itemLayouts | Add-Member about-photos ([pscustomobject]@{ sizes=@('H','H'); gap='tight'; growDirs=@(); focalYs=@(45,55) }) -Force
$name=$dir.Name
if (-not $j.imagePaths) { $j | Add-Member imagePaths ([pscustomobject]@{}) -Force }
$j.imagePaths | Add-Member about_image_1 "sushi-samples/$name/images/about-01.jpg?v=$stamp" -Force
$j.imagePaths | Add-Member about_image_2 "sushi-samples/$name/images/about-02.jpg?v=$stamp" -Force
$j.imagePaths | Add-Member hero_image "sushi-samples/$name/images/hero.jpg?v=$stamp" -Force
$j | Add-Member brushUpPhoto "2026-09-17-grammar-hh" -Force
$j | Add-Member layoutRecipeNote "grammar HH flower|hair" -Force
Save-Json $j $path
$log.Add("hh 16")

# 21 color catch
$dir = Find-Folder '21'
$path = Join-Path $dir.FullName 'draft.json'
$j = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
$j | Add-Member heroImageOff $true -Force
$j | Add-Member heroTextOnPhoto $true -Force
$j | Add-Member brushUpPhoto "2026-09-17-grammar-color-catch" -Force
$j | Add-Member layoutRecipeNote "grammar color-catch + oudo" -Force
Save-Json $j $path
$log.Add("color-catch 21")

# Tag oudo
foreach ($id in @('02','04','07','10','11','12','13','15','19','23','29')) {
  $dir = Find-Folder $id
  $path = Join-Path $dir.FullName 'draft.json'
  $j = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
  $j | Add-Member brushUpPhoto "2026-09-17-grammar-oudo" -Force
  $note = [string]$j.layoutRecipeNote
  if ($note -notmatch 'grammar') {
    if ([string]::IsNullOrWhiteSpace($note)) { $j | Add-Member layoutRecipeNote "grammar oudo" -Force }
    else { $j.layoutRecipeNote = "$note | grammar oudo" }
  }
  Save-Json $j $path
  $log.Add("oudo $id")
}

# Verify no nulls
Get-ChildItem $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | ForEach-Object {
  $p = Join-Path $_.FullName 'draft.json'
  $raw = [IO.File]::ReadAllText($p)
  if ($raw.Trim() -eq 'null' -or $raw.Length -lt 80) { throw "BAD after apply $($_.Name)" }
  $null = $raw | ConvertFrom-Json
}

[IO.File]::WriteAllLines((Join-Path $sushi '_grammar-apply-log.txt'), $log)
Write-Host "DONE"
$log | ForEach-Object { Write-Host $_ }
