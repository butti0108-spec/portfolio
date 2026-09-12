# Replace hot-red matted images + diversify layout fingerprints (ASCII)
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding $false
$tools = $PSScriptRoot
$sushi = [IO.Path]::GetFullPath((Join-Path $tools "..\.."))
$materials = [IO.Path]::GetFullPath((Join-Path $tools ".."))
Add-Type -AssemblyName System.Drawing

function Ensure-Member($obj, $name, $val) { $obj | Add-Member -NotePropertyName $name -NotePropertyValue $val -Force }
function Json-Save($obj, $path) {
  [IO.File]::WriteAllText($path, ($obj | ConvertTo-Json -Depth 30), $utf8)
}

function Test-HotRed([string]$path) {
  $bmp = $null
  try {
    $bmp = [System.Drawing.Bitmap]::FromFile($path)
    $stepX = [Math]::Max(1, [int]($bmp.Width / 28))
    $stepY = [Math]::Max(1, [int]($bmp.Height / 28))
    [int]$n=0; [int]$hot=0
    for ($y=0; $y -lt $bmp.Height; $y += $stepY) {
      for ($x=0; $x -lt $bmp.Width; $x += $stepX) {
        $c = $bmp.GetPixel($x,$y); $n++
        if ($c.R -ge 185 -and $c.G -le 95 -and $c.B -le 95) { $hot++ }
      }
    }
    return (($hot / [double]$n) -ge 0.35)
  } catch { return $false }
  finally { if ($bmp) { $bmp.Dispose() } }
}

function MakeDirs([string]$recipe, [int]$n) {
  $arr = New-Object System.Collections.Generic.List[string]
  if ($n -le 1) { return ,@() }
  switch ($recipe) {
    "R6" { 1..($n-1) | ForEach-Object { [void]$arr.Add("row") } }
    "R8" { 1..($n-1) | ForEach-Object { [void]$arr.Add("down") } }
    "R2" {
      if ($n -eq 2) { [void]$arr.Add("row") }
      elseif ($n -eq 3) { [void]$arr.Add("row"); [void]$arr.Add("down") }
      else { [void]$arr.Add("row"); [void]$arr.Add("down"); [void]$arr.Add("row") }
    }
    "R3" {
      if ($n -eq 2) { [void]$arr.Add("row") }
      elseif ($n -eq 3) { [void]$arr.Add("row"); [void]$arr.Add("down") }
      else { [void]$arr.Add("row"); [void]$arr.Add("down"); [void]$arr.Add("down") }
    }
    "R4" {
      if ($n -eq 2) { [void]$arr.Add("row") }
      elseif ($n -eq 3) { [void]$arr.Add("row"); [void]$arr.Add("down") }
      else { [void]$arr.Add("row"); [void]$arr.Add("down"); [void]$arr.Add("row") }
    }
    "R5" {
      if ($n -eq 2) { [void]$arr.Add("down") }
      elseif ($n -eq 3) { [void]$arr.Add("down"); [void]$arr.Add("row") }
      else { [void]$arr.Add("down"); [void]$arr.Add("row"); [void]$arr.Add("down") }
    }
    default {
      if ($n -eq 2) { [void]$arr.Add("down") }
      else { [void]$arr.Add("down"); [void]$arr.Add("down") }
    }
  }
  return ,$arr.ToArray()
}

function GapOf([string]$recipe) {
  switch ($recipe) {
    "R6" { return "tight" }
    "R4" { return "tight" }
    "R2" { return "tight" }
    "R8" { return "tight" }
    "R3" { return "normal" }
    default { return "normal" }
  }
}

# Unique orders (A has access; B/C fold access into address)
$ordersA = @(
  @("hero","values","photos","works","accordions","hours","access","address","contact"),
  @("hero","photos","values","works","hours","access","address","accordions","contact"),
  @("hero","values","accordions","photos","works","hours","address","access","contact"),
  @("hero","works","photos","values","accordions","hours","access","address","contact"),
  @("hero","photos","works","values","hours","access","address","contact","accordions"),
  @("hero","values","photos","accordions","works","contact","hours","access","address"),
  @("hero","photos","values","accordions","works","hours","access","address","contact"),
  @("hero","values","works","photos","accordions","hours","access","address","contact"),
  @("hero","accordions","values","photos","works","hours","access","address","contact"),
  @("hero","photos","works","accordions","values","hours","access","address","contact"),
  @("hero","values","photos","works","hours","access","address","contact","accordions"),
  @("hero","photos","accordions","values","works","contact","hours","access","address")
)
$ordersBC = @(
  @("hero","values","photos","works","hours","address","accordions","contact"),
  @("hero","photos","values","works","accordions","contact","hours","address"),
  @("hero","values","works","photos","hours","address","accordions","contact"),
  @("hero","photos","works","values","hours","address","contact","accordions"),
  @("hero","values","photos","accordions","works","contact","hours","address"),
  @("hero","works","photos","values","hours","address","accordions","contact"),
  @("hero","photos","values","accordions","works","hours","address","contact"),
  @("hero","values","works","photos","accordions","contact","hours","address"),
  @("hero","photos","works","hours","address","values","accordions","contact"),
  @("hero","values","photos","works","contact","accordions","hours","address"),
  @("hero","photos","values","hours","address","works","accordions","contact"),
  @("hero","works","values","photos","accordions","contact","hours","address"),
  @("hero","photos","accordions","works","values","hours","address","contact"),
  @("hero","values","hours","address","photos","works","accordions","contact"),
  @("hero","photos","works","accordions","contact","values","hours","address"),
  @("hero","values","photos","hours","address","works","contact","accordions"),
  @("hero","works","photos","hours","address","values","contact","accordions"),
  @("hero","photos","values","contact","accordions","works","hours","address"),
  @("hero","values","accordions","photos","works","hours","address","contact")
)

# Per-folder plan: p|w|pr|wr  (B/C avoid R6 to prevent thin 3-col strips)
$plan = @{
  "01-cafe-warm-a"="3|3|R5|R6"
  "02-cafe-split-b"="4|3|R5|R8"
  "03-cafe-mix-ink-c"="3|3|R8|R2"
  "04-salon-clinic-a"="3|3|R2|R8"
  "05-salon-sakura-b"="3|3|R3|R8"
  "06-bakery-brick-a"="4|3|R5|R2"
  "07-bakery-cafe-c"="3|3|R8|R5"
  "08-bar-ink-b"="3|3|R3|R4"
  "09-bar-brick-a"="4|3|R4|R8"
  "10-clinic-green-a"="3|3|R2|R5"
  "11-clinic-clinic-b"="3|3|R5|R8"
  "12-florist-sakura-a"="3|3|R8|R6"
  "13-florist-green-c"="4|3|R3|R8"
  "14-ramen-brick-b"="4|3|R5|R2"
  "15-ramen-ink-a"="3|3|R8|R3"
  "16-yoga-green-a"="3|3|R2|R8"
  "17-yoga-sakura-b"="3|3|R4|R5"
  "18-studio-clinic-c"="4|3|R8|R2"
  "19-studio-ink-a"="3|3|R5|R3"
  "20-pet-cafe-b"="4|3|R2|R8"
  "21-pet-sakura-a"="3|3|R6|R8"
  "22-cowork-clinic-b"="4|3|R8|R5"
  "23-cowork-green-a"="3|3|R3|R8"
  "24-sweets-sakura-c"="3|3|R8|R2"
  "25-sweets-cafe-a"="3|3|R5|R4"
  "26-izakaya-brick-c"="3|3|R2|R6"
  "27-izakaya-ink-b"="4|3|R3|R8"
  "28-gallery-ink-a"="3|3|R8|R5"
  "29-gallery-clinic-c"="3|3|R5|R2"
  "30-hotel-cafe-b"="3|3|R8|R8"
}

$hashKeep = @{}
# seed existing non-red
Get-ChildItem $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | ForEach-Object {
  $imgDir = Join-Path $_.FullName "images"
  if (-not (Test-Path $imgDir)) { return }
  Get-ChildItem $imgDir -File | Where-Object { $_.Extension -match '\.(jpg|jpeg|png)$' } | ForEach-Object {
    if (Test-HotRed $_.FullName) { return }
    try {
      $h = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
      if (-not $hashKeep.ContainsKey($h)) { $hashKeep[$h] = $_.FullName }
    } catch {}
  }
}

$seedN = 0
function Replace-UniqueNonRed([string]$dest, [string]$folder, [string]$slot) {
  for ($try=0; $try -lt 10; $try++) {
    $script:seedN++
    $seed = 970000 + $script:seedN + ($try * 97)
    $url = "https://picsum.photos/seed/noread-$folder-$slot-$seed/1600/1000.jpg"
    try {
      Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 8
    } catch { continue }
    if (-not (Test-Path $dest) -or ((Get-Item $dest).Length -lt 4000)) { continue }
    if (Test-HotRed $dest) { continue }
    $h = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash
    if ($hashKeep.ContainsKey($h)) { continue }
    $hashKeep[$h] = "$folder/$slot"
    return $true
  }
  return $false
}

$aIdx = 0; $bcIdx = 0
$replaced = 0; $ok = 0

Get-ChildItem $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $folder = $_.Name
  if (-not $plan.ContainsKey($folder)) { Write-Host ("SKIP " + $folder); return }
  $parts = $plan[$folder].Split("|")
  $pc = [int]$parts[0]; $wc = [int]$parts[1]; $pr = $parts[2]; $wr = $parts[3]
  $path = Join-Path $_.FullName "draft.json"
  $j = [IO.File]::ReadAllText($path, $utf8) | ConvertFrom-Json
  $lp = [string]$j.layoutPattern
  if ([string]::IsNullOrWhiteSpace($lp)) { $lp = "a" }

  $j.draftCounts."about-photos" = $pc
  $j.draftCounts."works-list" = $wc
  if ([int]$j.draftCounts."about-accordions" -lt 1) { $j.draftCounts."about-accordions" = 1 }
  # B/C keep accordion 1 to reduce height holes; A can keep up to 2
  if (($lp -eq "b" -or $lp -eq "c") -and [int]$j.draftCounts."about-accordions" -gt 1) {
    $j.draftCounts."about-accordions" = 1
  }

  if (-not $j.draftExtras) { Ensure-Member $j "draftExtras" ([pscustomobject]@{}) }
  Ensure-Member $j.draftExtras "hours" $true
  Ensure-Member $j.draftExtras "address" $true
  if ($lp -eq "a") {
    Ensure-Member $j.draftExtras "access" $true
    Ensure-Member $j "layoutOrder" $ordersA[$aIdx % $ordersA.Count]
    $aIdx++
  } else {
    Ensure-Member $j.draftExtras "access" $false
    Ensure-Member $j "layoutOrder" $ordersBC[$bcIdx % $ordersBC.Count]
    $bcIdx++
    # fold access into address if present
    $f = $j.fields
    $accessTxt = ""; try { $accessTxt = [string]$f.access_text } catch {}
    $addrTxt = ""; try { $addrTxt = [string]$f.address_text } catch {}
    if ($accessTxt -and $addrTxt -notlike ("*" + $accessTxt.Substring(0, [Math]::Min(8,$accessTxt.Length)) + "*")) {
      Ensure-Member $f "address_text" (($addrTxt.Trim() + " / " + $accessTxt.Trim()).Trim())
    }
  }

  $pd = MakeDirs $pr $pc
  $wd = MakeDirs $wr $wc
  Ensure-Member $j "itemLayouts" ([pscustomobject]@{
    "about-photos" = [pscustomobject]@{ growDirs = @($pd); gap = (GapOf $pr); recipe = $pr }
    "works-list" = [pscustomobject]@{ growDirs = @($wd); gap = (GapOf $wr); recipe = $wr }
  })
  Ensure-Member $j "layoutRecipeNote" ("photo={0} works={1} dense=3 uniq=1" -f $pr, $wr)

  # keep hero demos on 01/08
  if ($folder.StartsWith("01-")) {
    Ensure-Member $j "heroTextOnPhoto" $true
    Ensure-Member $j "heroTextPlate" "round"
    Ensure-Member $j "heroTextPlateTone" "white"
  } elseif ($folder.StartsWith("08-")) {
    Ensure-Member $j "heroTextOnPhoto" $true
    Ensure-Member $j "heroTextPlate" "none"
    Ensure-Member $j "heroTextPlateTone" "white"
  } else {
    Ensure-Member $j "heroTextOnPhoto" $false
  }

  $imgDir = Join-Path $_.FullName "images"
  New-Item -ItemType Directory -Force -Path $imgDir | Out-Null
  $slots = New-Object System.Collections.Generic.List[string]
  [void]$slots.Add("hero.jpg")
  for ($i=1; $i -le $pc; $i++) { [void]$slots.Add(("about-{0:d2}.jpg" -f $i)) }
  for ($i=1; $i -le $wc; $i++) { [void]$slots.Add(("work-{0:d2}.jpg" -f $i)) }

  foreach ($slot in $slots) {
    $dest = Join-Path $imgDir $slot
    $need = $true
    if ((Test-Path $dest) -and ((Get-Item $dest).Length -gt 5000) -and -not (Test-HotRed $dest)) {
      $h = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash
      if (-not $hashKeep.ContainsKey($h)) { $hashKeep[$h] = "$folder/$slot"; $need = $false }
      elseif ($hashKeep[$h] -eq "$folder/$slot") { $need = $false }
    }
    if ($need) {
      $got = Replace-UniqueNonRed $dest $folder $slot
      if ($got) { $replaced++; Write-Host ("REPLACED {0}/{1}" -f $folder, $slot) }
      else { Write-Host ("FAILIMG {0}/{1}" -f $folder, $slot) }
    }
  }

  $ip = @{}
  $ip["hero_image"] = ("sushi-samples/{0}/images/hero.jpg?v=dense3" -f $folder)
  for ($i=1; $i -le $pc; $i++) { $ip[("about_image_{0}" -f $i)] = ("sushi-samples/{0}/images/about-{1:d2}.jpg?v=dense3" -f $folder, $i) }
  for ($i=1; $i -le $wc; $i++) { $ip[("work_{0}_image" -f $i)] = ("sushi-samples/{0}/images/work-{1:d2}.jpg?v=dense3" -f $folder, $i) }
  Ensure-Member $j "imagePaths" ([pscustomobject]$ip)

  Json-Save $j $path

  $metaPath = Join-Path $materials (Join-Path $folder "meta.json")
  if (Test-Path $metaPath) {
    $m = [IO.File]::ReadAllText($metaPath, $utf8) | ConvertFrom-Json
    Ensure-Member $m "layoutPattern" $lp
    Ensure-Member $m "layoutOrder" @($j.layoutOrder)
    Ensure-Member $m "counts" ([pscustomobject]@{
      "hero-leads" = [int]$j.draftCounts."hero-leads"
      "hero-values" = [int]$j.draftCounts."hero-values"
      "about-accordions" = [int]$j.draftCounts."about-accordions"
      "about-photos" = $pc
      "works-list" = $wc
    })
    Ensure-Member $m "extras" ([pscustomobject]@{
      hours = [bool]$j.draftExtras.hours
      access = [bool]$j.draftExtras.access
      address = [bool]$j.draftExtras.address
    })
    Ensure-Member $m "imageSlots" @($slots)
    Json-Save $m $metaPath
  }

  $ok++
  Write-Host ("OK {0} L={1} p={2}/{3} w={4}/{5} ord={6}" -f $folder.Substring(0,2), $lp, $pc, $pr, $wc, $wr, (($j.layoutOrder) -join "-"))
}

Write-Host ("DONE ok={0} replaced={1} hashes={2}" -f $ok, $replaced, $hashKeep.Count)
