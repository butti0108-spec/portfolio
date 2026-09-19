# Unsplash-only worldview photo batch. Reject near-solid red frames.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$sushi = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "sushi-samples"
$stamp = "photo-wv-2"
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

function Get-U([string]$photoId, [string]$outPath) {
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
  for ($i=2; $i -le $n; $i++) {
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
    'hero.jpg'='hero_image'; 'about-01.jpg'='about_image_1'; 'about-02.jpg'='about_image_2'
    'about-03.jpg'='about_image_3'; 'about-04.jpg'='about_image_4'
    'work-01.jpg'='work_1_image'; 'work-02.jpg'='work_2_image'; 'work-03.jpg'='work_3_image'
  }
  foreach ($f in $files) {
    if (-not $map.ContainsKey($f)) { continue }
    $key=$map[$f]; $val="sushi-samples/$name/images/$f`?v=$stamp"
    $pat='"'+[regex]::Escape($key)+'"\s*:\s*"[^"]*"'
    $rep='"'+$key+'":"'+$val+'"'
    if ([regex]::IsMatch($t,$pat)) { $t=[regex]::Replace($t,$pat,$rep,1) }
  }
  if ($t -match '"brushUpPhoto"') {
    $t=[regex]::Replace($t,'"brushUpPhoto"\s*:\s*"[^"]*"','"brushUpPhoto":"2026-09-17-photo-wv-2"',1)
  } else {
    $t=[regex]::Replace($t,'("version"\s*:\s*\d+,)','${1}"brushUpPhoto":"2026-09-17-photo-wv-2",',1)
  }
  $tmp="$path.tmp"; [IO.File]::WriteAllText($tmp,$t,$utf8); [IO.File]::Copy($tmp,$path,$true); Remove-Item $tmp -Force -EA SilentlyContinue
  $null=$t|ConvertFrom-Json
}

# Unique Unsplash IDs (verified-style). One ID = one file.
$jobs = @(
  @{ id='04'; cont=0; map=[ordered]@{
    'hero.jpg'='photo-1560066984-138dadb4c035'
    'about-01.jpg'='photo-1522337360788-8b13dee7a37e'
    'about-02.jpg'='photo-1516975080664-ed2fc6a32937'
    'about-03.jpg'='photo-1562322140-8baeececf3df'
    'work-01.jpg'='photo-1521590832167-7bcbfaaae24d'
    'work-02.jpg'='photo-1595476108010-b4d1f595b71b'
    'work-03.jpg'='photo-1634444436400-9bda925c87f3'
  }}
  @{ id='16'; cont=0; map=[ordered]@{
    'hero.jpg'='photo-1487412720507-e7ab37603c6f'
    'about-01.jpg'='photo-1490750967868-88aa4486c946'
    'about-02.jpg'='photo-1522336572468-97b06e8ef143'
    'about-03.jpg'='photo-1463936575829-25148e1df1eb'
    'work-01.jpg'='photo-1455659817273-f96807726540'
    'work-02.jpg'='photo-1515377905703-c4788e51af15'
    'work-03.jpg'='photo-1519014816548-bf5fe059798b'
  }}
  @{ id='06'; cont=3; map=[ordered]@{
    'hero.jpg'='photo-1509440159596-0249088772ff'
    'about-01.jpg'='photo-1517433670267-08bbd4be890f'
    'work-01.jpg'='photo-1549931319-a545dcf3bc73'
    'work-02.jpg'='photo-1555507036-ab1f4038808a'
    'work-03.jpg'='photo-1608198093002-eb4d4e37b9d9'
  }}
  @{ id='15'; cont=0; map=[ordered]@{
    'hero.jpg'='photo-1558961363-fa8fdf82db35'
    'about-01.jpg'='photo-1576618148400-f54bed99fcfd'
    'about-02.jpg'='photo-1509365465985-36d1623b4a0d'
    'about-03.jpg'='photo-1586444248902-2f64eddc13df'
    'work-01.jpg'='photo-1533089860892-a7c6f0a88666'
    'work-02.jpg'='photo-1606313564200-e75d5e30476c'
    'work-03.jpg'='photo-1623334044303-241021148d29'
  }}
  @{ id='19'; cont=0; map=[ordered]@{
    'hero.jpg'='photo-1557872943-16a5ac26437e'
    'about-01.jpg'='photo-1569718212165-3a8278d5f624'
    'about-02.jpg'='photo-1617093727343-374698b1b08d'
    'about-03.jpg'='photo-1623341214825-9f4f963727da'
    'work-01.jpg'='photo-1591814468924-caf88d1232e1'
    'work-02.jpg'='photo-1552611052-33e04de081de'
    'work-03.jpg'='photo-1582878826629-29b7ad1cdc43'
  }}
  @{ id='10'; cont=0; map=[ordered]@{
    'hero.jpg'='photo-1517248135467-4c7edcad34c4'
    'about-01.jpg'='photo-1559339352-11d035aa65de'
    'about-02.jpg'='photo-1414235077428-338989a2e8c0'
    'about-03.jpg'='photo-1550966871-3ed3cdb132d8'
    'work-01.jpg'='photo-1544025162-d76694265947'
    'work-02.jpg'='photo-1476224203421-9ac39bcb3327'
    'work-03.jpg'='photo-1555939594-58d7cb561ad1'
  }}
  @{ id='11'; cont=0; map=[ordered]@{
    'hero.jpg'='photo-1519494026892-80bbd2d6fd0d'
    'about-01.jpg'='photo-1576091160399-112ba8d25d1d'
    'about-02.jpg'='photo-1631217868264-e5b90bb7e133'
    'about-03.jpg'='photo-1584820927498-cfe5211fd8bf'
    'work-01.jpg'='photo-1579684385127-1ef15d508118'
    'work-02.jpg'='photo-1666214280557-f1b5022eb634'
    'work-03.jpg'='photo-1581056771107-24ca5f033842'
  }}
  @{ id='21'; cont=0; map=[ordered]@{
    'hero.jpg'='photo-1495474472287-4d71bcdd2085'
    'about-01.jpg'='photo-1445116572660-236099ec97a0'
    'about-02.jpg'='photo-1501339847302-ac426a4a7cbb'
    'about-03.jpg'='photo-1453614512568-c4024d13c247'
    'work-01.jpg'='photo-1498804103079-a6351b80588c'
    'work-02.jpg'='photo-1497935586351-b67a49e012bf'
    'work-03.jpg'='photo-1461023058943-07fcbe16d735'
  }}
)

$used = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($job in $jobs) {
  foreach ($photoId in $job.map.Values) {
    if (-not $used.Add([string]$photoId)) { throw "dup id $photoId" }
  }
}

foreach ($job in $jobs) {
  $dir = Folder $job.id
  $imgDir = Join-Path $dir.FullName 'images'
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
  if ([int]$job.cont -gt 0 -and (Test-Path (Join-Path $imgDir 'about-01.jpg'))) {
    Sync-Cont $dir.FullName ([int]$job.cont)
    for ($k=2; $k -le [int]$job.cont; $k++) { $touched.Add(("about-{0:d2}.jpg" -f $k)) }
  }
  if ($touched.Count -gt 0) { Bump $job.id ($touched.ToArray()) }
  $log.Add("done $($job.id) touched=$($touched.Count)")
}

# cross-site hash check excluding continuous about-02+
$map=@{}
foreach ($job in $jobs) {
  $dir = Folder $job.id
  Get-ChildItem (Join-Path $dir.FullName 'images') -File | ? { $_.Name -match '\.jpe?g$' -and $_.Name -notlike 'color-*' } | % {
    if ($job.cont -gt 0 -and $_.Name -match '^about-0[2-9]') { return }
    $h=(Get-FileHash $_.FullName).Hash
    if (-not $map.ContainsKey($h)) { $map[$h]=New-Object System.Collections.Generic.List[string] }
    $map[$h].Add("$($job.id)/$($_.Name)")
  }
}
$cross = @($map.GetEnumerator() | ? { ($_.Value | % { $_.Split('/')[0] } | Select -Unique).Count -gt 1 })
Write-Host ("cross_groups=" + $cross.Count)
$cross | Select -First 5 | % { Write-Host ($_.Value -join ' | ') }

[IO.File]::WriteAllLines((Join-Path $sushi '_photo-wv-batch2-log.txt'), $log)
Write-Host 'DONE'
$log | % { Write-Host $_ }
