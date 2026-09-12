# Finish 30 samples for human review: reset NG, bump image counts, fix dark heroInk, fill missing images.
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding $false
$utf8Bom = New-Object System.Text.UTF8Encoding $true
$tools = $PSScriptRoot
$materials = Split-Path $tools -Parent
$sushi = Split-Path $materials -Parent
$repoRoot = Split-Path (Split-Path $sushi -Parent) -Parent

# --- 1) Reset STATUS ---
$statusPath = Join-Path $materials "STATUS.md"
$status = @"
# 見本30 進捗

状態: ``未着手`` → ``材料中`` → ``文反映・画像入稿`` → ``完成確認待ち`` → ``要修正`` / ``営業格納`` / ``NG``

品質: ``_plot/quality-bar.md``
配置: ``_plot/2026-09-09-配置レシピ30.md``
レビュー: ``sample-1man/review-dash/``

**2026-09-09 完成確認ラウンド**: 旧NG/要修正はリセット。表側（キャッチ・特徴・写真・カード・連絡）を厚くした完成品で人目視。アコーディオン中身は表に出ないため薄い／適当で可。

| No | folder | 帯 | 状態 | メモ |
|----|--------|----|------|------|
| 01 | 01-cafe-warm-a | N | 完成確認待ち | |
| 02 | 02-cafe-split-b | N | 完成確認待ち | |
| 03 | 03-cafe-mix-ink-c | N | 完成確認待ち | |
| 04 | 04-salon-clinic-a | N | 完成確認待ち | |
| 05 | 05-salon-sakura-b | N | 完成確認待ち | |
| 06 | 06-bakery-brick-a | N | 完成確認待ち | |
| 07 | 07-bakery-cafe-c | N | 完成確認待ち | |
| 08 | 08-bar-ink-b | N | 完成確認待ち | |
| 09 | 09-bar-brick-a | N | 完成確認待ち | |
| 10 | 10-clinic-green-a | N | 完成確認待ち | |
| 11 | 11-clinic-clinic-b | N | 完成確認待ち | |
| 12 | 12-florist-sakura-a | N | 完成確認待ち | |
| 13 | 13-florist-green-c | N | 完成確認待ち | |
| 14 | 14-ramen-brick-b | N | 完成確認待ち | |
| 15 | 15-ramen-ink-a | N | 完成確認待ち | |
| 16 | 16-yoga-green-a | N | 完成確認待ち | |
| 17 | 17-yoga-sakura-b | N | 完成確認待ち | |
| 18 | 18-studio-clinic-c | N | 完成確認待ち | |
| 19 | 19-studio-ink-a | N | 完成確認待ち | |
| 20 | 20-pet-cafe-b | N | 完成確認待ち | |
| 21 | 21-pet-sakura-a | N | 完成確認待ち | |
| 22 | 22-cowork-clinic-b | A | 完成確認待ち | |
| 23 | 23-cowork-green-a | A | 完成確認待ち | |
| 24 | 24-sweets-sakura-c | A | 完成確認待ち | |
| 25 | 25-sweets-cafe-a | A | 完成確認待ち | |
| 26 | 26-izakaya-brick-c | A | 完成確認待ち | |
| 27 | 27-izakaya-ink-b | A | 完成確認待ち | |
| 28 | 28-gallery-ink-a | X | 完成確認待ち | |
| 29 | 29-gallery-clinic-c | X | 完成確認待ち | |
| 30 | 30-hotel-cafe-b | X | 完成確認待ち | |
"@
[IO.File]::WriteAllText($statusPath, $status, $utf8Bom)
Write-Host "STATUS reset"

# Clear NOTES decision lines (keep file stub)
Get-ChildItem -LiteralPath $materials -Directory | Where-Object { $_.Name -match '^\d{2}-' } | ForEach-Object {
  $notes = Join-Path $_.FullName "NOTES.md"
  $stub = "# NOTES $($_.Name)`r`n`r`n- review round reset 2026-09-09 (complete pack for human review)`r`n"
  [IO.File]::WriteAllText($notes, $stub, $utf8Bom)
}

function Is-LightInk([string]$hex) {
  if ([string]::IsNullOrWhiteSpace($hex)) { return $false }
  $h = $hex.Trim().TrimStart('#')
  if ($h.Length -ne 6) { return $false }
  $r = [Convert]::ToInt32($h.Substring(0,2), 16)
  $g = [Convert]::ToInt32($h.Substring(2,2), 16)
  $b = [Convert]::ToInt32($h.Substring(4,2), 16)
  # relative luminance approx
  $y = (0.2126 * $r + 0.7152 * $g + 0.0722 * $b) / 255.0
  return ($y -ge 0.72)
}

function DirsJson([string]$recipe, [int]$n) {
  if ($n -le 1) { return "[]" }
  $list = New-Object System.Collections.Generic.List[string]
  switch ($recipe) {
    "R1" { 1..($n-1) | ForEach-Object { [void]$list.Add("down") } }
    "R2" {
      if ($n -eq 2) { [void]$list.Add("row") }
      elseif ($n -eq 3) { [void]$list.Add("row"); [void]$list.Add("down") }
      else { [void]$list.Add("row"); [void]$list.Add("down"); [void]$list.Add("row") }
    }
    "R3" {
      if ($n -eq 2) { [void]$list.Add("row") }
      elseif ($n -eq 3) { [void]$list.Add("row"); [void]$list.Add("down") }
      else { [void]$list.Add("row"); [void]$list.Add("down"); [void]$list.Add("down") }
    }
    "R4" {
      if ($n -eq 2) { [void]$list.Add("row") }
      elseif ($n -eq 3) { [void]$list.Add("row"); [void]$list.Add("down") }
      else { [void]$list.Add("row"); [void]$list.Add("down"); [void]$list.Add("row") }
    }
    "R5" {
      if ($n -eq 2) { [void]$list.Add("down") }
      elseif ($n -eq 3) { [void]$list.Add("down"); [void]$list.Add("row") }
      else { [void]$list.Add("down"); [void]$list.Add("row"); [void]$list.Add("down") }
    }
    "R6" { 1..($n-1) | ForEach-Object { [void]$list.Add("row") } }
    "R7" { 1..($n-1) | ForEach-Object { [void]$list.Add("down") } }
    "R8" { 1..($n-1) | ForEach-Object { [void]$list.Add("down") } }
    default { 1..($n-1) | ForEach-Object { [void]$list.Add("row") } }
  }
  return ("[" + (($list | ForEach-Object { '"' + $_ + '"' }) -join ",") + "]")
}

function GapOf([string]$recipe) {
  switch ($recipe) {
    "R1" { return "loose" }
    "R6" { return "tight" }
    "R7" { return "loose" }
    default { return "normal" }
  }
}

$U = @{
  cafe = @("1495474472287-4d71bcdd2085","1509042239860-f550ce710b93","1442512595331-e2238af176a0","1511920170033-f8396924c348")
  florist = @("1490750965861-431e51d6e2fd","1487530812381-9811f7d6d1f8","1457089328109-a2b0750710ce","1490750965861-431e51d6e2fd")
  bar = @("1514933651103-005eec06c04b","1470337458703-46ad1756a187","1551024506-0bccd828d307","1546173159-315724a31605")
  salon = @("1560066984-138dadb4c035","1522337360788-8b13dee7a37e","1487412947147-5cebf100ffc2","1516975080664-ed2fc6a32937")
  sweets = @("1488477180301-c774a5b7b6f0","1578985545062-69928b1d9587","1563729784474-d77cbfe44a7a","1464349095431-e9a21285b5f3")
  bakery = @("1509440159596-0249088772ff","1549931319-a545dcf3bc73","1555507036-ab1f4038808a","1517433670267-08bbd4be890f")
  ramen = @("1569718212165-3a8278d5f624","1557872943-16a5ac26437e","1547592166-23ac45744acd","1617093727343-374698b1b08d")
  inn = @("1631049307264-da0ec9d70304","1590490360182-c33d57733427","1611892440504-42a792e24d32","1582719478250-c89cae4dc85b")
  yoga = @("1544367567-0f2fcb009e0b","1599901860904-17e6ed7083a0","1518611012118-696072aa579a","1506126613408-eca07ce68773")
  izakaya = @("1559339352-11d035aa65de","1414235077428-338989a2e8c0","1553621042-f6e147245754","1544025162-d766902659d0")
  clinic = @("1576091160399-112ba8d25d1d","1516549655169-df83a0774514","1666214280557-c48bae73be36","1581594693702-fbdc10129668")
  pet = @("1548199973-03cce0bbc87b","1587300003388-59205b953809","1450778869180-41d0601e046e","1561037404-61cd46aa615b")
  cowork = @("1497366216548-37526070297c","1522071820081-009f0129c71c","1497215728101-536909192426","1556761175-b413da4baf72")
  gallery = @("1536924940846-227afb31e2a5","1577083552431-6e5fd01988ec","1541961017774-22349e4a1262","1536924940846-227afb31e2a5")
  studio = @("1554048612-481ba4291e0f","1542038784456-1ea8e935640e","1516035069371-29a1b244c32c","1452587925148-ce544e77e082")
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

function Ensure-Image([string]$dest, [string]$photoId, [string]$seed) {
  if ((Test-Path -LiteralPath $dest) -and ((Get-Item -LiteralPath $dest).Length -gt 8000)) { return $true }
  $url = "https://images.unsplash.com/photo-$photoId" + "?auto=format&fit=crop&w=1600&q=80"
  try {
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 90
    if ((Get-Item -LiteralPath $dest).Length -gt 8000) { return $true }
  } catch {}
  $purl = "https://picsum.photos/seed/$seed/1600/1000.jpg"
  try {
    Invoke-WebRequest -Uri $purl -OutFile $dest -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 5
    return ((Get-Item -LiteralPath $dest).Length -gt 3000)
  } catch { return $false }
}

$dlOk = 0; $dlFail = 0; $patched = 0
Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $folder = $_.Name
  $draftPath = Join-Path $_.FullName "draft.json"
  $raw = [IO.File]::ReadAllText($draftPath, $utf8)
  $draft = $raw | ConvertFrom-Json

  $photoR = "R2"; $worksR = "R2"
  if ($draft.itemLayouts -and $draft.itemLayouts."about-photos" -and $draft.itemLayouts."about-photos".recipe) {
    $photoR = [string]$draft.itemLayouts."about-photos".recipe
  }
  if ($draft.itemLayouts -and $draft.itemLayouts."works-list" -and $draft.itemLayouts."works-list".recipe) {
    $worksR = [string]$draft.itemLayouts."works-list".recipe
  }
  if ($draft.layoutRecipeNote -match 'photo=(\w+).*works=(\w+)') {
    $photoR = $Matches[1]; $worksR = $Matches[2]
  }

  $pc = [int]$draft.draftCounts."about-photos"
  $wc = [int]$draft.draftCounts."works-list"
  if ($pc -lt 2) { $pc = 2 }
  if ($wc -lt 2) { $wc = 2 }
  if ($pc -gt 4) { $pc = 4 }
  if ($wc -gt 3) { $wc = 3 }

  $raw = [regex]::Replace($raw, '("about-photos"\s*:\s*)\d+', ('${1}' + $pc))
  $raw = [regex]::Replace($raw, '("works-list"\s*:\s*)\d+', ('${1}' + $wc))

  $heroInk = [string]$draft.draftColors.heroInk
  if (-not (Is-LightInk $heroInk)) {
    $raw = [regex]::Replace($raw, '("heroInk"\s*:\s*")[^"]+(")', '${1}#ffffff${2}')
    Write-Host ("ink-fix " + $folder + " " + $heroInk + " -> #ffffff")
  }

  # Soften accordion bodies (not in screenshot) - short placeholder via fields if long
  # Skip heavy rewrite; only if empty
  if ($raw -match '"acc_1_body"\s*:\s*""') {
    $raw = $raw -replace '"acc_1_body"\s*:\s*""', '"acc_1_body": "（詳細は編集画面で入れられます）"'
  }

  $photoDirs = DirsJson $photoR $pc
  $worksDirs = DirsJson $worksR $wc
  $photoGap = GapOf $photoR
  $worksGap = GapOf $worksR
  $block = @"
    "itemLayouts": {
        "about-photos": {
            "growDirs": $photoDirs,
            "gap": "$photoGap",
            "recipe": "$photoR"
        },
        "works-list": {
            "growDirs": $worksDirs,
            "gap": "$worksGap",
            "recipe": "$worksR"
        }
    },
    "layoutRecipeNote": "photo=$photoR works=$worksR"
}
"@
  if ($raw -match '"itemLayouts"') {
    $raw = [regex]::Replace($raw, '(?s),\s*"itemLayouts"\s*:.*$', "")
    $raw = $raw.TrimEnd().TrimEnd(',').TrimEnd()
    if ($raw.EndsWith("}")) { $raw = $raw.Substring(0, $raw.Length - 1).TrimEnd().TrimEnd(",") }
  } else {
    $raw = $raw.TrimEnd()
    if ($raw.EndsWith("}")) { $raw = $raw.Substring(0, $raw.Length - 1).TrimEnd().TrimEnd(",") }
  }
  # ensure imagePaths closed
  if ($raw -match '"imagePaths"' -and $raw.TrimEnd() -notmatch '\}\s*$') {
    # leave as-is; brace fix later
  }
  $raw = $raw + ",`r`n" + $block

  # close imagePaths if needed before itemLayouts
  $idx = $raw.LastIndexOf('"itemLayouts"')
  $before = $raw.Substring(0, $idx).TrimEnd().TrimEnd(',')
  if (-not $before.EndsWith("}")) { $before = $before + "`r`n                    }" }
  $raw = $before + ",`r`n    " + $raw.Substring($idx)

  try {
    $null = $raw | ConvertFrom-Json
  } catch {
    Write-Host ("JSON BAD before images " + $folder + " " + $_.Exception.Message)
  }

  # Download images
  $theme = $folderTheme[$folder]
  if (-not $theme) { $theme = "cafe" }
  $ids = $U[$theme]
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
    $photoId = $ids[$si % $ids.Count]
    $ok = Ensure-Image $dest $photoId ("fin-$folder-$si")
    if ($ok) {
      $script:dlOk++
      $rel = "sushi-samples/$folder/images/$slot" + "?v=fin1"
      if ($slot -eq "hero.jpg") { $pathMap["hero_image"] = $rel }
      elseif ($slot -match '^about-(\d+)\.jpg$') { $pathMap["about_image_" + [int]$Matches[1]] = $rel }
      elseif ($slot -match '^work-(\d+)\.jpg$') { $pathMap["work_" + [int]$Matches[1] + "_image"] = $rel }
    } else { $script:dlFail++; Write-Host ("FAIL img " + $folder + " " + $slot) }
  }

  # Rebuild imagePaths block via regex replace of whole imagePaths object
  $ipLines = New-Object System.Collections.Generic.List[string]
  foreach ($k in ($pathMap.Keys | Sort-Object)) {
    [void]$ipLines.Add(('                       "' + $k + '":  "' + $pathMap[$k] + '"'))
  }
  $ipBody = ($ipLines -join ",`r`n")
  $ipBlock = "    `"imagePaths`":  {`r`n$ipBody`r`n                    }"
  if ($raw -match '"imagePaths"') {
    $raw = [regex]::Replace($raw, '(?s)"imagePaths"\s*:\s*\{.*?\n\s*\}', $ipBlock.Trim())
  } else {
    $raw = $raw -replace '("itemLayouts")', ($ipBlock + ",`r`n    `$1")
  }

  try {
    $null = $raw | ConvertFrom-Json
    [IO.File]::WriteAllText($draftPath, $raw, $utf8)
    $script:patched++
    Write-Host ("OK " + $folder + " p=$pc w=$wc")
  } catch {
    Write-Host ("SAVE BAD " + $folder + " " + $_.Exception.Message)
  }

  # meta imageSlots
  $metaPath = Join-Path $materials (Join-Path $folder "meta.json")
  if (Test-Path -LiteralPath $metaPath) {
    try {
      $meta = [IO.File]::ReadAllText($metaPath, $utf8) | ConvertFrom-Json
      $meta.imageSlots = @($slots)
      if (-not $meta.counts) { $meta | Add-Member counts ([pscustomobject]@{}) -Force }
      $meta.counts."about-photos" = $pc
      $meta.counts."works-list" = $wc
      [IO.File]::WriteAllText($metaPath, ($meta | ConvertTo-Json -Depth 20), $utf8)
    } catch {}
  }
}

Write-Host ("DONE patched=$patched dlOk=$dlOk dlFail=$dlFail")
