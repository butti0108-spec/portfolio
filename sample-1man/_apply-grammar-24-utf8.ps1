# UTF-8 safe grammar patcher: never round-trip whole JSON via ConvertTo-Json.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$utf8 = [Text.UTF8Encoding]::new($false)
$sushi = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "sushi-samples"
$stamp = "grammar-24-v1"
$log = New-Object System.Collections.Generic.List[string]

function Folder([string]$id) {
  $d = Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
  if (-not $d) { throw "no folder $id" }
  return $d
}

function Read-Text([string]$path) { [IO.File]::ReadAllText($path, $utf8) }
function Write-Text([string]$path, [string]$text) {
  if ($text.Length -lt 80) { throw "refuse tiny write $path" }
  $tmp = "$path.tmp"
  [IO.File]::WriteAllText($tmp, $text, $utf8)
  [IO.File]::Copy($tmp, $path, $true)
  Remove-Item -Force $tmp -ErrorAction SilentlyContinue
}

function Replace-Or-Insert([string]$text, [string]$pattern, [string]$replacement, [string]$insertAfterPattern) {
  if ([regex]::IsMatch($text, $pattern)) {
    return [regex]::Replace($text, $pattern, $replacement, 1)
  }
  if ($insertAfterPattern) {
    $m = [regex]::Match($text, $insertAfterPattern)
    if (-not $m.Success) { throw "insert anchor not found: $insertAfterPattern" }
    $idx = $m.Index + $m.Length
    return $text.Substring(0, $idx) + $replacement + $text.Substring($idx)
  }
  throw "pattern not found: $pattern"
}

function Set-AboutCount([string]$text, [int]$n) {
  if ($text -match '"about-photos"\s*:') {
    return [regex]::Replace($text, '("about-photos"\s*:\s*)\d+', "`${1}$n", 1)
  }
  # insert into draftCounts
  return [regex]::Replace($text, '("draftCounts"\s*:\s*\{)', ("`$1`"about-photos`":$n,"), 1)
}

function Set-AboutLayoutBlock([string]$text, [string]$layoutJson) {
  if ($text -match '"about-photos"\s*:\s*\{') {
    return [regex]::Replace($text, '"about-photos"\s*:\s*\{(?:[^{}]|\{[^{}]*\})*\}', $layoutJson, 1)
  }
  # insert into itemLayouts
  return [regex]::Replace($text, '("itemLayouts"\s*:\s*\{)', ("`$1$layoutJson,"), 1)
}

function Set-ImagePath([string]$text, [string]$key, [string]$val) {
  $pat = '"' + [regex]::Escape($key) + '"\s*:\s*"[^"]*"'
  $rep = '"' + $key + '":"' + $val + '"'
  if ([regex]::IsMatch($text, $pat)) {
    return [regex]::Replace($text, $pat, $rep, 1)
  }
  if ($text -match '"imagePaths"\s*:\s*\{') {
    return [regex]::Replace($text, '("imagePaths"\s*:\s*\{)', ("`$1$rep,"), 1)
  }
  # add imagePaths object before last }
  $repBlock = '"imagePaths":{' + $rep + '},'
  return [regex]::Replace($text, '("version"\s*:\s*\d+,)', ("`$1$repBlock"), 1)
}

function Set-TopBool([string]$text, [string]$key, [bool]$val) {
  $v = if ($val) { 'true' } else { 'false' }
  $pat = '"' + [regex]::Escape($key) + '"\s*:\s*(true|false)'
  $rep = '"' + $key + '":' + $v
  if ([regex]::IsMatch($text, $pat)) { return [regex]::Replace($text, $pat, $rep, 1) }
  return [regex]::Replace($text, '("version"\s*:\s*\d+,)', ("`$1$rep,"), 1)
}

function Set-TopString([string]$text, [string]$key, [string]$val) {
  $pat = '"' + [regex]::Escape($key) + '"\s*:\s*"[^"]*"'
  $rep = '"' + $key + '":"' + $val.Replace('\','\\').Replace('"','\"') + '"'
  if ([regex]::IsMatch($text, $pat)) { return [regex]::Replace($text, $pat, $rep, 1) }
  return [regex]::Replace($text, '("version"\s*:\s*\d+,)', ("`$1$rep,"), 1)
}

function Sync-Plate([string]$folderPath, [int]$n) {
  $src = Join-Path $folderPath "images\about-01.jpg"
  $bytes = [IO.File]::ReadAllBytes($src)
  for ($i=2; $i -le $n; $i++) {
    $dst = Join-Path $folderPath ("images\about-{0:d2}.jpg" -f $i)
    [IO.File]::WriteAllBytes($dst, $bytes)
  }
}

function HexColor([string]$hex) {
  $h = $hex.TrimStart('#')
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
  $codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | ? { $_.MimeType -eq 'image/jpeg' }
  $ep = New-Object Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), 92L
  $tmp = "$path.tmp.jpg"
  $bmp.Save($tmp, $codec, $ep)
  $bmp.Dispose()
  [IO.File]::Copy($tmp, $path, $true)
  Remove-Item -Force $tmp -EA SilentlyContinue
}

function Mix([string]$hex, [bool]$lighten, [bool]$mute) {
  $c = HexColor $hex
  $r=[int]$c.R; $g=[int]$c.G; $b=[int]$c.B
  if ($lighten) {
    $r=[Math]::Min(255,[int]($r+(255-$r)*0.72))
    $g=[Math]::Min(255,[int]($g+(255-$g)*0.72))
    $b=[Math]::Min(255,[int]($b+(255-$b)*0.72))
  }
  if ($mute) {
    $r=[int]($r*0.55+40*0.45); $g=[int]($g*0.55+36*0.45); $b=[int]($b*0.55+28*0.45)
  }
  return "#{0:X2}{1:X2}{2:X2}" -f $r,$g,$b
}

function Apply-Continuous([string]$id, [int]$n, $focals) {
  $dir = Folder $id
  $path = Join-Path $dir.FullName 'draft.json'
  $t = Read-Text $path
  Sync-Plate $dir.FullName $n
  $sizes = ((1..$n | ForEach-Object { '"L"' }) -join ',')
  $foc = ($focals | ForEach-Object { "$_" }) -join ','
  $layout = '"about-photos":{"sizes":[' + $sizes + '],"gap":"tight","growDirs":[],"focalYs":[' + $foc + ']}'
  $t = Set-AboutCount $t $n
  $t = Set-AboutLayoutBlock $t $layout
  $name = $dir.Name
  for ($i=1; $i -le $n; $i++) {
    $t = Set-ImagePath $t ("about_image_$i") ("sushi-samples/$name/images/about-{0:d2}.jpg?v=$stamp" -f $i)
  }
  $t = Set-ImagePath $t 'hero_image' "sushi-samples/$name/images/hero.jpg?v=$stamp"
  $t = Set-TopString $t 'brushUpPhoto' '2026-09-17-grammar-continuous'
  $t = Set-TopString $t 'layoutRecipeNote' "grammar continuous n=$n"
  Write-Text $path $t
  $null = $t | ConvertFrom-Json
  $log.Add("continuous $id n=$n")
}

function Apply-Insert([string]$id, [string]$approvedHex, [bool]$lighten, [bool]$mute) {
  $dir = Folder $id
  $path = Join-Path $dir.FullName 'draft.json'
  $t = Read-Text $path
  $sw = Mix $approvedHex $lighten $mute
  Write-Swatch (Join-Path $dir.FullName 'images\color-insert.jpg') $sw
  $layout = '"about-photos":{"sizes":["L","L","L"],"gap":"normal","growDirs":[],"focalYs":[30,50,70]}'
  $t = Set-AboutCount $t 3
  $t = Set-AboutLayoutBlock $t $layout
  $name = $dir.Name
  $t = Set-ImagePath $t 'about_image_1' "sushi-samples/$name/images/about-01.jpg?v=$stamp"
  $t = Set-ImagePath $t 'about_image_2' "sushi-samples/$name/images/color-insert.jpg?v=$stamp"
  $t = Set-ImagePath $t 'about_image_3' "sushi-samples/$name/images/about-02.jpg?v=$stamp"
  $t = Set-ImagePath $t 'hero_image' "sushi-samples/$name/images/hero.jpg?v=$stamp"
  $t = Set-TopString $t 'brushUpPhoto' '2026-09-17-grammar-insert'
  $t = Set-TopString $t 'layoutRecipeNote' "grammar insert swatch=$sw"
  Write-Text $path $t
  $null = $t | ConvertFrom-Json
  $log.Add("insert $id $sw")
}

# Continuous
Apply-Continuous '01' 4 @(10,35,60,85)
Apply-Continuous '03' 3 @(15,50,85)
Apply-Continuous '06' 3 @(20,50,80)
Apply-Continuous '08' 4 @(10,35,60,85)
Apply-Continuous '09' 3 @(15,50,85)
Apply-Continuous '28' 3 @(20,50,80)

# Insert — approved palette bases (do not rewrite draftColors)
Apply-Insert '05' '#fdf5f6' $false $false
Apply-Insert '14' '#7a9ab8' $true $false
Apply-Insert '18' '#ffffff' $false $false
Apply-Insert '26' '#c9a227' $false $true
Apply-Insert '30' '#262828' $false $false

# 16 HH
$dir = Folder '16'; $path = Join-Path $dir.FullName 'draft.json'; $t = Read-Text $path
$layout = '"about-photos":{"sizes":["H","H"],"gap":"tight","growDirs":[],"focalYs":[45,55]}'
$t = Set-AboutCount $t 2
$t = Set-AboutLayoutBlock $t $layout
$name=$dir.Name
$t = Set-ImagePath $t 'about_image_1' "sushi-samples/$name/images/about-01.jpg?v=$stamp"
$t = Set-ImagePath $t 'about_image_2' "sushi-samples/$name/images/about-02.jpg?v=$stamp"
$t = Set-TopString $t 'brushUpPhoto' '2026-09-17-grammar-hh'
$t = Set-TopString $t 'layoutRecipeNote' 'grammar HH flower|hair'
Write-Text $path $t; $null = $t | ConvertFrom-Json; $log.Add('hh 16')

# 21 color catch
$dir = Folder '21'; $path = Join-Path $dir.FullName 'draft.json'; $t = Read-Text $path
$t = Set-TopBool $t 'heroImageOff' $true
$t = Set-TopBool $t 'heroTextOnPhoto' $true
$t = Set-TopString $t 'brushUpPhoto' '2026-09-17-grammar-color-catch'
$t = Set-TopString $t 'layoutRecipeNote' 'grammar color-catch + oudo'
Write-Text $path $t; $null = $t | ConvertFrom-Json; $log.Add('color-catch 21')

# oudo tags
foreach ($id in @('02','04','07','10','11','12','13','15','19','23','29')) {
  $dir = Folder $id; $path = Join-Path $dir.FullName 'draft.json'; $t = Read-Text $path
  $t = Set-TopString $t 'brushUpPhoto' '2026-09-17-grammar-oudo'
  if ($t -notmatch '"layoutRecipeNote"') {
    $t = Set-TopString $t 'layoutRecipeNote' 'grammar oudo'
  } elseif ($t -notmatch 'grammar') {
    $t = [regex]::Replace($t, '("layoutRecipeNote"\s*:\s*")([^"]*)(")', '${1}${2} | grammar oudo${3}', 1)
  }
  Write-Text $path $t
  $null = $t | ConvertFrom-Json
  $log.Add("oudo $id")
}

# final validate first-team 24
$first = @('01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','18','19','21','23','26','28','29','30')
foreach ($id in $first) {
  $dir = Folder $id
  $raw = Read-Text (Join-Path $dir.FullName 'draft.json')
  if ($raw.Trim() -eq 'null') { throw "null draft $id" }
  $j = $raw | ConvertFrom-Json
  if (-not $j.fields) { throw "missing fields $id" }
}

[IO.File]::WriteAllLines((Join-Path $sushi '_grammar-apply-log.txt'), $log)
Write-Host 'DONE'
$log | % { Write-Host $_ }
