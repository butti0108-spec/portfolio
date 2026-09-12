# Densify all 30 samples (ASCII-only script; JP copy from densify-fill-copy.json)
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding $false
$tools = $PSScriptRoot
$sushi = [IO.Path]::GetFullPath((Join-Path $tools "..\.."))
$copy = Get-Content -LiteralPath (Join-Path $tools "densify-fill-copy.json") -Raw -Encoding UTF8 | ConvertFrom-Json

function MakeDirs([string]$recipe, [int]$n) {
  $arr = New-Object System.Collections.Generic.List[string]
  if ($n -le 1) { return $arr }
  switch ($recipe) {
    "R1" { 1..($n-1) | ForEach-Object { [void]$arr.Add("down") } }
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
      if ($n -eq 2) { [void]$arr.Add("row") }
      elseif ($n -eq 3) { [void]$arr.Add("down"); [void]$arr.Add("row") }
      else { [void]$arr.Add("down"); [void]$arr.Add("row"); [void]$arr.Add("down") }
    }
  }
  return $arr
}

function GapOf([string]$recipe) {
  switch ($recipe) {
    "R6" { return "tight" }
    "R4" { return "tight" }
    "R2" { return "tight" }
    "R8" { return "tight" }
    "R1" { return "normal" }
    default { return "normal" }
  }
}

$plan = @{}
# folder|p|w|photoRecipe|worksRecipe|heroDemo|plate|tone
@(
  "01-cafe-warm-a|3|3|R5|R6|1|round|white",
  "02-cafe-split-b|4|3|R4|R6|0|round|white",
  "03-cafe-mix-ink-c|3|3|R3|R2|0|round|white",
  "04-salon-clinic-a|3|3|R2|R2|0|round|white",
  "05-salon-sakura-b|3|3|R5|R6|0|round|white",
  "06-bakery-brick-a|4|3|R6|R4|0|round|white",
  "07-bakery-cafe-c|3|3|R5|R8|0|round|white",
  "08-bar-ink-b|3|3|R5|R6|1|none|white",
  "09-bar-brick-a|4|3|R4|R2|0|round|white",
  "10-clinic-green-a|3|3|R3|R8|0|round|white",
  "11-clinic-clinic-b|3|3|R2|R2|0|round|white",
  "12-florist-sakura-a|3|3|R3|R6|0|round|white",
  "13-florist-green-c|4|3|R6|R4|0|round|white",
  "14-ramen-brick-b|4|3|R4|R5|0|round|white",
  "15-ramen-ink-a|3|3|R2|R8|0|round|white",
  "16-yoga-green-a|3|3|R5|R8|0|round|white",
  "17-yoga-sakura-b|3|3|R3|R2|0|round|white",
  "18-studio-clinic-c|4|3|R5|R4|0|round|white",
  "19-studio-ink-a|3|3|R2|R6|0|round|white",
  "20-pet-cafe-b|4|3|R6|R6|0|round|white",
  "21-pet-sakura-a|3|3|R5|R8|0|round|white",
  "22-cowork-clinic-b|4|3|R6|R4|0|round|white",
  "23-cowork-green-a|3|3|R2|R8|0|round|white",
  "24-sweets-sakura-c|3|3|R5|R2|0|round|white",
  "25-sweets-cafe-a|3|3|R3|R6|0|round|white",
  "26-izakaya-brick-c|3|3|R4|R6|0|round|white",
  "27-izakaya-ink-b|4|3|R5|R6|0|round|white",
  "28-gallery-ink-a|3|3|R5|R4|0|round|white",
  "29-gallery-clinic-c|3|3|R6|R8|0|round|white",
  "30-hotel-cafe-b|3|3|R4|R5|0|round|white"
) | ForEach-Object {
  $a = $_.Split("|")
  $plan[$a[0]] = @{
    p = [int]$a[1]; w = [int]$a[2]; pr = $a[3]; wr = $a[4]
    hero = ($a[5] -eq "1"); plate = $a[6]; tone = $a[7]
  }
}

$folderTheme = @{
  "01-cafe-warm-a"="cafe"; "02-cafe-split-b"="florist"; "03-cafe-mix-ink-c"="bar"
  "04-salon-clinic-a"="salon"; "05-salon-sakura-b"="sweets"
  "06-bakery-brick-a"="bakery"; "07-bakery-cafe-c"="ramen"
  "08-bar-ink-b"="inn"; "09-bar-brick-a"="yoga"
  "10-clinic-green-a"="izakaya"; "11-clinic-clinic-b"="clinic"
  "12-florist-sakura-a"="pet"; "13-florist-green-c"="cowork"
  "14-ramen-brick-b"="gallery"; "15-ramen-ink-a"="bakery"
  "16-yoga-green-a"="salon"; "17-yoga-sakura-b"="bar"
  "18-studio-clinic-c"="studio"; "19-studio-ink-a"="ramen"
  "20-pet-cafe-b"="sweets"; "21-pet-sakura-a"="cafe"
  "22-cowork-clinic-b"="izakaya"; "23-cowork-green-a"="cowork"
  "24-sweets-sakura-c"="clinic"; "25-sweets-cafe-a"="bakery"
  "26-izakaya-brick-c"="studio"; "27-izakaya-ink-b"="inn"
  "28-gallery-ink-a"="yoga"; "29-gallery-clinic-c"="florist"
  "30-hotel-cafe-b"="gallery"
}

$hashKeep = @{}
$seedN = 0
$ok = 0

function Ensure-UniqueFile([string]$dest, [string]$folder, [int]$si) {
  $script:seedN++
  $seed = 920000 + $script:seedN
  $url = "https://picsum.photos/seed/dense2-$folder-$si-$seed/1600/1000.jpg"
  Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 8
  if (-not (Test-Path $dest) -or ((Get-Item $dest).Length -lt 3000)) { return $false }
  $h = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash
  if ($hashKeep.ContainsKey($h)) {
    $script:seedN++
    $seed2 = 930000 + $script:seedN
    $url2 = "https://picsum.photos/seed/dense2b-$folder-$si-$seed2/1600/1000.jpg"
    Invoke-WebRequest -Uri $url2 -OutFile $dest -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 8
    $h = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash
  }
  if ($hashKeep.ContainsKey($h)) { return $false }
  $hashKeep[$h] = "$folder/$si"
  return $true
}

Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $folder = $_.Name
  $cfg = $plan[$folder]
  if (-not $cfg) { Write-Host ("SKIP " + $folder); return }
  $path = Join-Path $_.FullName "draft.json"
  $raw0 = [IO.File]::ReadAllText($path, $utf8)
  $j = $raw0 | ConvertFrom-Json
  $pc = [int]$cfg.p
  $wc = [int]$cfg.w
  $pr = [string]$cfg.pr
  $wr = [string]$cfg.wr

  $j.draftCounts."about-photos" = $pc
  $j.draftCounts."works-list" = $wc
  if ([int]$j.draftCounts."hero-values" -lt 3) { $j.draftCounts."hero-values" = 3 }
  if ([int]$j.draftCounts."hero-leads" -lt 2) { $j.draftCounts."hero-leads" = 2 }

  if (-not $j.draftExtras) { $j | Add-Member -NotePropertyName draftExtras -NotePropertyValue ([pscustomobject]@{}) -Force }
  $j.draftExtras | Add-Member -NotePropertyName hours -NotePropertyValue $true -Force
  $j.draftExtras | Add-Member -NotePropertyName access -NotePropertyValue $true -Force
  $j.draftExtras | Add-Member -NotePropertyName address -NotePropertyValue $true -Force

  $f = $j.fields
  $brand = [string]$f.brand_name
  if ([string]::IsNullOrWhiteSpace($brand)) { $brand = "Shop" }

  function SetEmpty($obj, $key, $val) {
    $cur = ""
    try { $cur = [string]$obj.$key } catch {}
    if ([string]::IsNullOrWhiteSpace($cur)) {
      $obj | Add-Member -NotePropertyName $key -NotePropertyValue $val -Force
    }
  }
  SetEmpty $f "hours_text" $copy.hours_text
  SetEmpty $f "access_text" $copy.access_text
  SetEmpty $f "address_text" ("City Sample " + $brand + " " + $copy.address_suffix)
  SetEmpty $f "contact_note_1" $copy.contact_note_1
  SetEmpty $f "contact_note_2" $copy.contact_note_2
  SetEmpty $f "value_3_title" $copy.value_3_title
  SetEmpty $f "value_3_text" $copy.value_3_text
  if ($wc -ge 2) {
    SetEmpty $f "work_2_title" $copy.work_2_title
    SetEmpty $f "work_2_text" $copy.work_2_text
  }
  if ($wc -ge 3) {
    SetEmpty $f "work_3_title" ($brand + $copy.work_3_title_suffix)
    SetEmpty $f "work_3_text" $copy.work_3_text
  }

  # alarm red soft fix
  if ($j.draftColors) {
    foreach ($k in @("contactBg","chromeBg","pageBg")) {
      $hex = ([string]$j.draftColors.$k).ToLowerInvariant()
      if ($hex -match '^#(ff0000|e53935|f44336|d32f2f|c62828|b71c1c|ff1744|ff5252)$') {
        $j.draftColors.$k = "#5c4033"
        Write-Host ("red-fix $folder $k")
      }
    }
  }

  $imgDir = Join-Path $_.FullName "images"
  New-Item -ItemType Directory -Force -Path $imgDir | Out-Null
  $slots = New-Object System.Collections.Generic.List[string]
  [void]$slots.Add("hero.jpg")
  for ($i=1; $i -le $pc; $i++) { [void]$slots.Add(("about-{0:d2}.jpg" -f $i)) }
  for ($i=1; $i -le $wc; $i++) { [void]$slots.Add(("work-{0:d2}.jpg" -f $i)) }

  $pathMap = @{}
  for ($si=0; $si -lt $slots.Count; $si++) {
    $slot = $slots[$si]
    $dest = Join-Path $imgDir $slot
    $reuse = $false
    if ((Test-Path -LiteralPath $dest) -and ((Get-Item -LiteralPath $dest).Length -gt 8000)) {
      $h = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash
      if (-not $hashKeep.ContainsKey($h)) {
        $hashKeep[$h] = "$folder/$slot"
        $reuse = $true
      }
    }
    if (-not $reuse) {
      $got = Ensure-UniqueFile $dest $folder $si
      if (-not $got) { Write-Host ("IMG FAIL $folder $slot") }
    }
    $rel = "sushi-samples/$folder/images/$slot" + "?v=dense1"
    if ($slot -eq "hero.jpg") { $pathMap["hero_image"] = $rel }
    elseif ($slot -match '^about-(\d+)') { $pathMap["about_image_" + [int]$Matches[1]] = $rel }
    elseif ($slot -match '^work-(\d+)') { $pathMap["work_" + [int]$Matches[1] + "_image"] = $rel }
  }

  $pList = MakeDirs $pr $pc
  $wList = MakeDirs $wr $wc
  $pd = (($pList | ForEach-Object { '"' + $_ + '"' }) -join ",")
  $wd = (($wList | ForEach-Object { '"' + $_ + '"' }) -join ",")
  $pgap = GapOf $pr
  $wgap = GapOf $wr
  $heroBool = if ($cfg.hero) { "true" } else { "false" }

  # Rebuild from object JSON then replace tail
  $j.PSObject.Properties.Remove("itemLayouts")
  $j.PSObject.Properties.Remove("layoutRecipeNote")
  $j.PSObject.Properties.Remove("heroTextOnPhoto")
  $j.PSObject.Properties.Remove("heroTextPlate")
  $j.PSObject.Properties.Remove("heroTextPlateTone")
  $j.PSObject.Properties.Remove("imagePaths")
  $j.version = 17

  $ipLines = New-Object System.Collections.Generic.List[string]
  $keys = @($pathMap.Keys | Sort-Object)
  for ($i=0; $i -lt $keys.Count; $i++) {
    $comma = if ($i -lt $keys.Count - 1) { "," } else { "" }
    [void]$ipLines.Add(('    "{0}": "{1}"{2}' -f $keys[$i], $pathMap[$keys[$i]], $comma))
  }

  $body = $j | ConvertTo-Json -Depth 40
  $body = $body.TrimEnd()
  if ($body.EndsWith("}")) { $body = $body.Substring(0, $body.Length - 1).TrimEnd().TrimEnd(",") }

  $tail = @"
,
  "imagePaths": {
$($ipLines -join "`r`n")
  },
  "itemLayouts": {
    "about-photos": {
      "growDirs": [$pd],
      "gap": "$pgap",
      "recipe": "$pr"
    },
    "works-list": {
      "growDirs": [$wd],
      "gap": "$wgap",
      "recipe": "$wr"
    }
  },
  "layoutRecipeNote": "photo=$pr works=$wr dense=1",
  "heroTextOnPhoto": $heroBool,
  "heroTextPlate": "$($cfg.plate)",
  "heroTextPlateTone": "$($cfg.tone)"
}
"@
  $json = $body + $tail
  try {
    $null = $json | ConvertFrom-Json
    [IO.File]::WriteAllText($path, $json, $utf8)
    Write-Host ("OK $folder p=$pc w=$wc $pr/$wr hero=$heroBool")
    $script:ok++
  } catch {
    Write-Host ("BAD $folder :: " + $_.Exception.Message)
  }
}

Write-Host ("DONE ok=$ok hashes=$($hashKeep.Count)")
