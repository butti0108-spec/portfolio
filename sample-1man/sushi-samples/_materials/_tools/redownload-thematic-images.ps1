# Redownload thematic Unsplash images (commercial OK: unsplash.com/license)
$ErrorActionPreference = "Stop"
$utf8Bom = New-Object System.Text.UTF8Encoding $true
$utf8 = New-Object System.Text.UTF8Encoding $false
$tools = $PSScriptRoot
$materials = Split-Path $tools -Parent
$sushi = Split-Path $materials -Parent

$U = @{
  cafe    = @("1495474472287-4d71bcdd2085","1509042239860-f550ce710b93","1442512595331-e2238af176a0","1511920170033-f8396924c348","1498804103079-a7412eacad80")
  florist = @("1490750965861-431e51d6e2fd","1487530812381-9811f7d6d1f8","1457089328109-a2b0750710ce","1487077154930-3e6ce0a0f0f0","1519378058450-c4d1c7f0a1f1")
  bar     = @("1514933651103-005eec06c04b","1470337458703-46ad1756a187","1551024506-0bccd828d307","1546173159-315724a31605","1566417713940-809a29a2fe00")
  salon   = @("1560066984-138dadb4c035","1522337360788-8b13dee7a37e","1487412947147-5cebf100ffc2","1516975080664-ed2fc6a32937","1521590832167-7bcbfaaae3f8")
  sweets  = @("1488477180301-c774a5b7b6f0","1578985545062-69928b1d9587","1563729784474-d77cbfe44a7a","1464349095431-e9a21285b5f3","1551024506-0bccd828d307")
  bakery  = @("1509440159596-0249088772ff","1549931319-a545dcf3bc73","1555507036-ab1f4038808a","1517433670267-08bbd4be890f")
  ramen   = @("1569718212165-3a8278d5f624","1557872943-16a5ac26437e","1623345805780-8ea76ba6d86f","1547592166-23ac45744acd","1617093727343-374698b1b08d")
  inn     = @("1631049307264-da0ec9d70304","1590490360182-c33d57733427","1611892440504-42a792e24d32","1582719478250-c89cae4dc85b","1566073771259-6a8506099945")
  yoga    = @("1544367567-0f2fcb009e0b","1599901860904-17e6ed7083a0","1518611012118-696072aa579a","1506126613408-eca07ce68773","1571019613454-1cb2f99b2d8b")
  izakaya = @("1559339352-11d035aa65de","1414235077428-338989a2e8c0","1553621042-f6e147245754","1544025162-d766902659d0")
  clinic  = @("1576091160399-112ba8d25d1d","1516549655169-df83a0774514","1666214280557-c48bae73be36","1581594693702-fbdc10129668")
  pet     = @("1548199973-03cce0bbc87b","1587300003388-59205b953809","1450778869180-41d0601e046e","1561037404-61cd46aa615b","1518717758536-85ae29035b6d")
  cowork  = @("1497366216548-37526070297c","1522071820081-009f0129c71c","1497215728101-536909192426","1556761175-b413da4baf72")
  gallery = @("1536924940846-227afb31e2a5","1577083552431-6e5fd01988ec","1541961017774-22349e4a1262")
  studio  = @("1554048612-481ba4291e0f","1542038784456-1ea8e935640e","1516035069371-29a1b244c32c","1452587925148-ce544e77e082")
}

# Fix florist id that might be wrong - use only 3 known good
$U.florist = @("1490750965861-431e51d6e2fd","1487530812381-9811f7d6d1f8","1457089328109-a2b0750710ce","1490750965861-431e51d6e2fd","1487530812381-9811f7d6d1f8","1457089328109-a2b0750710ce","1490750965861-431e51d6e2fd")

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

function SlotToField([string]$slot) {
  switch ($slot) {
    "hero.jpg" { return "hero_image" }
    "about-01.jpg" { return "about_image_1" }
    "about-02.jpg" { return "about_image_2" }
    "about-03.jpg" { return "about_image_3" }
    "about-04.jpg" { return "about_image_4" }
    "work-01.jpg" { return "work_1_image" }
    "work-02.jpg" { return "work_2_image" }
    "work-03.jpg" { return "work_3_image" }
    default { return $null }
  }
}

$ok=0; $fail=0
foreach ($dir in (Get-ChildItem -LiteralPath $materials -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name)) {
  $folder = $dir.Name
  $metaPath = Join-Path $dir.FullName "meta.json"
  if (-not (Test-Path -LiteralPath $metaPath)) { continue }
  $meta = [IO.File]::ReadAllText($metaPath, $utf8) | ConvertFrom-Json
  $slots = @($meta.imageSlots)
  if (-not $slots -or $slots.Count -eq 0) { $slots = @("hero.jpg","about-01.jpg","work-01.jpg") }
  $key = $folderTheme[$folder]
  if (-not $key) { $key = "cafe" }
  $ids = $U[$key]

  $imgDir = Join-Path $sushi (Join-Path $folder "images")
  $matImg = Join-Path $dir.FullName "images"
  New-Item -ItemType Directory -Force -Path $imgDir | Out-Null
  New-Item -ItemType Directory -Force -Path $matImg | Out-Null

  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("# Photo sources - $folder")
  $lines.Add("")
  $lines.Add("Theme: $key | Unsplash license https://unsplash.com/license")
  $lines.Add("")
  $lines.Add("| file | photo_id | url |")
  $lines.Add("|------|----------|-----|")

  $imagePaths = @{}
  for ($i=0; $i -lt $slots.Count; $i++) {
    $slot = $slots[$i]
    $id = $ids[$i % $ids.Count]
    $url = "https://images.unsplash.com/photo-$id" + "?auto=format&fit=crop&w=1600&q=80"
    $dest = Join-Path $imgDir $slot
    $got = $false
    try {
      Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 90
      if ((Get-Item -LiteralPath $dest).Length -gt 8000) { $got = $true }
    } catch {}
    if (-not $got) {
      $purl = "https://picsum.photos/seed/tw-$folder-$i/1600/1000.jpg"
      try {
        Invoke-WebRequest -Uri $purl -OutFile $dest -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 5
        $url = $purl
        $id = "picsum"
        $got = $true
      } catch {}
    }
    if ($got) {
      Copy-Item -LiteralPath $dest -Destination (Join-Path $matImg $slot) -Force
      $lines.Add("| $slot | $id | $url |")
      $field = SlotToField $slot
      if ($field) { $imagePaths[$field] = "sushi-samples/$folder/images/$slot" }
      $ok++; Write-Host "OK $folder $slot ($key)"
    } else {
      $fail++; Write-Host "FAIL $folder $slot"
    }
  }
  [IO.File]::WriteAllLines((Join-Path $dir.FullName "SOURCES.md"), $lines, $utf8Bom)

  $draftPath = Join-Path $sushi (Join-Path $folder "draft.json")
  if (Test-Path -LiteralPath $draftPath) {
    $draft = [IO.File]::ReadAllText($draftPath, $utf8) | ConvertFrom-Json
    $ip = New-Object psobject
    foreach ($k in $imagePaths.Keys) {
      $ip | Add-Member -NotePropertyName $k -NotePropertyValue ($imagePaths[$k] + "?v=theme2") -Force
    }
    $draft | Add-Member -NotePropertyName imagePaths -NotePropertyValue $ip -Force
    [IO.File]::WriteAllText($draftPath, ($draft | ConvertTo-Json -Depth 40), $utf8)
  }
}
Write-Host "DONE ok=$ok fail=$fail"
