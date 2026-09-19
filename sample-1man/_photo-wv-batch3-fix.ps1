# photo-wv-3: worldview fixes (16/10) + 404 leftovers + 09/28 separation
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$sushi = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "sushi-samples"
$stamp = "photo-wv-3"
$log = New-Object System.Collections.Generic.List[string]

function Folder([string]$id) {
  Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
}

function Test-NotRedBanner([string]$path) {
  $img = [Drawing.Image]::FromFile((Resolve-Path $path))
  try {
    $bmp = New-Object Drawing.Bitmap $img
    $w = [int]$bmp.Width
    $h = [int]$bmp.Height
    $coords = @(
      @(2, 2),
      @([int]($w / 2), 2),
      @(($w - 3), 2),
      @(2, [int]($h / 2)),
      @(($w - 3), [int]($h / 2)),
      @(2, ($h - 3)),
      @([int]($w / 2), ($h - 3)),
      @(($w - 3), ($h - 3))
    )
    $redish = 0
    foreach ($p in $coords) {
      $c = $bmp.GetPixel([int]$p[0], [int]$p[1])
      if ($c.R -gt 180 -and $c.G -lt 90 -and $c.B -lt 90) { $redish++ }
    }
    $bmp.Dispose()
    return ($redish -lt 5)
  } finally { $img.Dispose() }
}

function Get-U([string]$rawId, [string]$outPath) {
  $photoId = if ($rawId -like "photo-*") { $rawId } else { "photo-$rawId" }
  $url = "https://images.unsplash.com/$photoId`?auto=format&fit=crop&w=1600&h=1200&q=85"
  $tmp = "$outPath.tmp.jpg"
  Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 60
  if ((Get-Item $tmp).Length -lt 12000) { throw "tiny $photoId" }
  if (-not (Test-NotRedBanner $tmp)) { Remove-Item $tmp -Force; throw "red-banner rejected $photoId" }
  [IO.File]::Copy($tmp, $outPath, $true)
  Remove-Item $tmp -Force -EA SilentlyContinue
}

function Sync-Cont([string]$folderPath, [int]$n) {
  $src = Join-Path $folderPath "images\about-01.jpg"
  $bytes = [IO.File]::ReadAllBytes($src)
  for ($i = 2; $i -le $n; $i++) {
    [IO.File]::WriteAllBytes((Join-Path $folderPath ("images\about-{0:d2}.jpg" -f $i)), $bytes)
  }
}

function Bump([string]$id, [string[]]$files) {
  $dir = Folder $id
  $path = Join-Path $dir.FullName "draft.json"
  $utf8 = [Text.UTF8Encoding]::new($false)
  $t = [IO.File]::ReadAllText($path, $utf8)
  $name = $dir.Name
  $map = @{
    "hero.jpg"="hero_image"; "about-01.jpg"="about_image_1"; "about-02.jpg"="about_image_2"
    "about-03.jpg"="about_image_3"; "about-04.jpg"="about_image_4"
    "work-01.jpg"="work_1_image"; "work-02.jpg"="work_2_image"; "work-03.jpg"="work_3_image"
  }
  foreach ($f in $files) {
    if (-not $map.ContainsKey($f)) { continue }
    $key = $map[$f]
    $val = "sushi-samples/$name/images/$f`?v=$stamp"
    $pat = '"' + [regex]::Escape($key) + '"\s*:\s*"[^"]*"'
    $rep = '"' + $key + '":"' + $val + '"'
    if ([regex]::IsMatch($t, $pat)) { $t = [regex]::Replace($t, $pat, $rep, 1) }
  }
  if ($t -match '"brushUpPhoto"') {
    $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-17-photo-wv-3"', 1)
  } else {
    $t = [regex]::Replace($t, '("version"\s*:\s*\d+,)', '${1}"brushUpPhoto":"2026-09-17-photo-wv-3",', 1)
  }
  $tmp = "$path.tmp"
  [IO.File]::WriteAllText($tmp, $t, $utf8)
  [IO.File]::Copy($tmp, $path, $true)
  Remove-Item $tmp -Force -EA SilentlyContinue
  $null = $t | ConvertFrom-Json
}

# Unique IDs across this batch. Avoid batch2 successes still on disk for OTHER sites:
# 04 keeps hero/about from wv-2; only fills works.
# 16 full retheme (winter portrait was wrong for 花綴り).
# 10 full retheme (fine-dining lounge was wrong for 提灯居酒屋).
# 09 floor-light yoga / 28 leaf yoga — continuous.

$jobs = @(
  @{ id="16"; cont=0; map=[ordered]@{
    "hero.jpg"="1487412947147-5cebf100ffc2"
    "about-01.jpg"="1490750965861-431e51d6e2fd"
    "about-02.jpg"="1595476108010-b4d1f595b71b"
    "about-03.jpg"="1487530812381-9811f7d6d1f8"
    "work-01.jpg"="1457089328109-a2b0750710ce"
    "work-02.jpg"="1521590832167-7bcbfaaae3f8"
    "work-03.jpg"="1634444436400-9bda925c87f3"
  }}
  @{ id="10"; cont=0; map=[ordered]@{
    "hero.jpg"="1553621042-f6e147245754"
    "about-01.jpg"="1544025162-d766902659d0"
    "about-02.jpg"="1470337458703-46ad1756a187"
    "about-03.jpg"="1514933651103-005eec06c04b"
    "work-01.jpg"="1566417713940-809a29a2fe00"
    "work-02.jpg"="1551024506-0bccd828d307"
    "work-03.jpg"="1546173159-315724a31605"
  }}
  @{ id="04"; cont=0; map=[ordered]@{
    "work-01.jpg"="1522335786636-a7c6f0a88666"
    "work-02.jpg"="1515377905703-c4788e51af15"
    "work-03.jpg"="1519014816548-bf5fe059798b"
  }}
  @{ id="06"; cont=3; map=[ordered]@{
    "work-03.jpg"="1565958012100-4ef28b0a2f0e"
  }}
  @{ id="15"; cont=0; map=[ordered]@{
    "about-02.jpg"="1509365465985-36d1623b4a0d"
    "work-03.jpg"="1608198093002-eb4d4e37b9d9"
  }}
  @{ id="21"; cont=0; map=[ordered]@{
    "work-01.jpg"="1498804103079-a7412eacad80"
  }}
  @{ id="09"; cont=3; map=[ordered]@{
    "hero.jpg"="1544367567-0f2fcb009e0b"
    "about-01.jpg"="1599901860904-17e6ed7083a0"
    "work-01.jpg"="1506126613408-eca07ce68773"
    "work-02.jpg"="1571019613454-1cb2f99b2d8b"
    "work-03.jpg"="1518611012118-696072aa579a"
  }}
  @{ id="28"; cont=3; map=[ordered]@{
    "hero.jpg"="1441974230-7d547261fb32"
    "about-01.jpg"="1502082553048-f028b7e0f2b0"
    "work-01.jpg"="1469474968028-56623f02e42e"
    "work-02.jpg"="1470071459604-9c4409f0c0c0"
    "work-03.jpg"="1493246318654-5f5f5f5f5f5f"
  }}
)

# 04 work-02/03 collide with 16's OLD wv-2 leftover paths — those files are being replaced on 16 now,
# so after 16 runs first, 04 can claim 151537... and 151901... only if 16 no longer uses them.
# 16 NEW set does not include those — OK.

$used = New-Object "System.Collections.Generic.HashSet[string]"
foreach ($job in $jobs) {
  foreach ($photoId in $job.map.Values) {
    if (-not $used.Add([string]$photoId)) { throw "dup id in jobs: $photoId" }
  }
}

foreach ($job in $jobs) {
  $dir = Folder $job.id
  $imgDir = Join-Path $dir.FullName "images"
  $touched = New-Object System.Collections.Generic.List[string]
  foreach ($file in $job.map.Keys) {
    $photoId = [string]$job.map[$file]
    Write-Host "GET $($job.id)/$file <= $photoId"
    try {
      Get-U $photoId (Join-Path $imgDir $file)
      $touched.Add($file)
    } catch {
      Write-Host "SKIP $($job.id)/$file : $($_.Exception.Message)"
      $log.Add("skip $($job.id)/$file $($_.Exception.Message)")
    }
  }
  if ([int]$job.cont -gt 0 -and (Test-Path (Join-Path $imgDir "about-01.jpg"))) {
    Sync-Cont $dir.FullName ([int]$job.cont)
    for ($k = 2; $k -le [int]$job.cont; $k++) { $touched.Add(("about-{0:d2}.jpg" -f $k)) }
  }
  if ($touched.Count -gt 0) { Bump $job.id ($touched.ToArray()) }
  $log.Add("done $($job.id) touched=$($touched.Count)")
}

# Also re-sync continuous sites not in this batch (01/03/08) to keep identical bytes
foreach ($pair in @(@{id="01";n=4},@{id="03";n=3},@{id="08";n=4})) {
  $d = Folder $pair.id
  Sync-Cont $d.FullName ([int]$pair.n)
  Write-Host "resync cont $($pair.id) n=$($pair.n)"
}

$map = @{}
Get-ChildItem $sushi -Directory | Where-Object { $_.Name -match "^\d{2}-" } | ForEach-Object {
  $id = $_.Name.Substring(0, 2)
  $contN = 0
  foreach ($j in $jobs) { if ($j.id -eq $id) { $contN = [int]$j.cont } }
  # known continuous
  $known = @{ "01"=4; "03"=3; "06"=3; "08"=4; "09"=3; "28"=3 }
  if ($known.ContainsKey($id)) { $contN = [int]$known[$id] }
  Get-ChildItem (Join-Path $_.FullName "images") -File -EA SilentlyContinue |
    Where-Object { $_.Name -match "\.jpe?g$" -and $_.Name -notlike "color-*" } |
    ForEach-Object {
      if ($contN -gt 0 -and $_.Name -match "^about-0[2-9]") { return }
      $h = (Get-FileHash $_.FullName).Hash
      if (-not $map.ContainsKey($h)) { $map[$h] = New-Object System.Collections.Generic.List[string] }
      $map[$h].Add("$id/$($_.Name)")
    }
}
$cross = @($map.GetEnumerator() | Where-Object {
  ($_.Value | ForEach-Object { $_.Split("/")[0] } | Select-Object -Unique).Count -gt 1
})
Write-Host ("cross_groups=" + $cross.Count)
$cross | Select-Object -First 10 | ForEach-Object { Write-Host ($_.Value -join " | ") }

[IO.File]::WriteAllLines((Join-Path $sushi "_photo-wv-batch3-log.txt"), $log)
Write-Host "DONE"
$log | ForEach-Object { Write-Host $_ }
