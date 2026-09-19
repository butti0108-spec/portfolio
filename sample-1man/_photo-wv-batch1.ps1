# Download worldview-matched Unsplash stills for first-team samples.
# Unique photo ID per file. No cross-site reuse. Grammar/colors/copy untouched.
$ErrorActionPreference = "Stop"
$sushi = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "sushi-samples"
$stamp = "photo-wv-1"
$ua = "Mozilla/5.0 (compatible; kuru-photo-pass/1.0)"

function Folder([string]$id) {
  Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
}

function Get-U([string]$photoId, [string]$outPath) {
  $url = "https://images.unsplash.com/$photoId`?auto=format&fit=crop&w=1600&q=85"
  $tmp = "$outPath.tmp.jpg"
  Invoke-WebRequest -Uri $url -OutFile $tmp -Headers @{ "User-Agent" = $ua } -UseBasicParsing
  if ((Get-Item $tmp).Length -lt 8000) { throw "tiny download $photoId" }
  [IO.File]::Copy($tmp, $outPath, $true)
  Remove-Item -Force $tmp -EA SilentlyContinue
}

function Sync-Cont([string]$folderPath, [int]$n) {
  $src = Join-Path $folderPath "images\about-01.jpg"
  $bytes = [IO.File]::ReadAllBytes($src)
  for ($i=2; $i -le $n; $i++) {
    [IO.File]::WriteAllBytes((Join-Path $folderPath ("images\about-{0:d2}.jpg" -f $i)), $bytes)
  }
}

function Bump-Paths([string]$id, [string[]]$files) {
  $dir = Folder $id
  $path = Join-Path $dir.FullName "draft.json"
  $utf8 = [Text.UTF8Encoding]::new($false)
  $t = [IO.File]::ReadAllText($path, $utf8)
  $name = $dir.Name
  $map = @{
    'hero.jpg'='hero_image'
    'about-01.jpg'='about_image_1'
    'about-02.jpg'='about_image_2'
    'about-03.jpg'='about_image_3'
    'about-04.jpg'='about_image_4'
    'work-01.jpg'='work_1_image'
    'work-02.jpg'='work_2_image'
    'work-03.jpg'='work_3_image'
  }
  foreach ($f in $files) {
    if (-not $map.ContainsKey($f)) { continue }
    if ($f -like 'color-*') { continue }
    $key = $map[$f]
    $val = "sushi-samples/$name/images/$f`?v=$stamp"
    $pat = '"' + [regex]::Escape($key) + '"\s*:\s*"[^"]*"'
    $rep = '"' + $key + '":"' + $val + '"'
    if ([regex]::IsMatch($t, $pat)) { $t = [regex]::Replace($t, $pat, $rep, 1) }
  }
  $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-17-photo-wv-1"', 1)
  if ($t -notmatch '"brushUpPhoto"') {
    $t = [regex]::Replace($t, '("version"\s*:\s*\d+,)', '${1}"brushUpPhoto":"2026-09-17-photo-wv-1",', 1)
  }
  $tmp = "$path.tmp"
  [IO.File]::WriteAllText($tmp, $t, $utf8)
  [IO.File]::Copy($tmp, $path, $true)
  Remove-Item $tmp -Force -EA SilentlyContinue
  $null = $t | ConvertFrom-Json
}

# photo-ID assignments (unsplash path id). Each ID used once in this script.
$jobs = @(
  # 04 white salon
  @{ id='04'; cont=0; files=@{
    'hero.jpg'='photo-1560066984-138dadb4c035'
    'about-01.jpg'='photo-1522337360788-8b13dee7a37e'
    'about-02.jpg'='photo-1633681926022-84c1035c7c8e'
    'about-03.jpg'='photo-1562322140-8baeececf3df'
    'work-01.jpg'='photo-1595476108010-b4d1f595b71b'
    'work-02.jpg'='photo-1516975080664-ed2fc6a32937'
    'work-03.jpg'='photo-1521590832167-7bcbfaaae24d'
  }}
  # 16 flower + hair (distinct from 04)
  @{ id='16'; cont=0; files=@{
    'hero.jpg'='photo-1487412720507-e7ab37603c6f'
    'about-01.jpg'='photo-1490750967868-88aa4486c946'
    'about-02.jpg'='photo-1522336572468-97b06e8ef143'
    'about-03.jpg'='photo-1455659817273-f96807726540'
    'work-01.jpg'='photo-1463936575829-25148e1df1eb'
    'work-02.jpg'='photo-1515377905703-c4788e51af15'
    'work-03.jpg'='photo-1519014816548-bf5fe059798b'
  }}
  # 06 bakery case
  @{ id='06'; cont=3; files=@{
    'hero.jpg'='photo-1509440159596-0249088772ff'
    'about-01.jpg'='photo-1517433670267-08bbd4be890f'
    'work-01.jpg'='photo-1549931319-a545dcf3bc73'
    'work-02.jpg'='photo-1555507036-ab1f4038808a'
    'work-03.jpg'='photo-1608198093002-eb4d4e37b9d9'
  }}
  # 15 morning bakery (distinct)
  @{ id='15'; cont=0; files=@{
    'hero.jpg'='photo-1558961363-fa8fdf82db35'
    'about-01.jpg'='photo-1586444248902-2f64eddc13df'
    'about-02.jpg'='photo-1576618148400-f54bed99fcfd'
    'about-03.jpg'='photo-1509365465985-36d1623b4a0d'
    'work-01.jpg'='photo-1533089860892-a7c6f0a88666'
    'work-02.jpg'='photo-1606313564200-e75d5e30476c'
    'work-03.jpg'='photo-1623334044303-241021148d29'
  }}
  # 19 ramen noren/steam
  @{ id='19'; cont=0; files=@{
    'hero.jpg'='photo-1557872943-16a5ac26437e'
    'about-01.jpg'='photo-1569718212165-3a8278d5f624'
    'about-02.jpg'='photo-1617093727343-374698b1b08d'
    'about-03.jpg'='photo-1591814468924-caf88d1232e1'
    'work-01.jpg'='photo-1623341214825-9f4f963727da'
    'work-02.jpg'='photo-1552611052-33e04de081de'
    'work-03.jpg'='photo-1582878826629-29b7ad1cdc43'
  }}
  # 10 izakaya (warm interior, not firetruck red wall)
  @{ id='10'; cont=0; files=@{
    'hero.jpg'='photo-1559339352-11d035aa65de'
    'about-01.jpg'='photo-1517248135467-4c7edcad34c4'
    'about-02.jpg'='photo-1559339352-11d035aa65de'
    'about-03.jpg'='photo-1414235077428-338989a2e8c0'
    'work-01.jpg'='photo-1544025162-d76694265947'
    'work-02.jpg'='photo-1476224203421-9ac39bcb3327'
    'work-03.jpg'='photo-1555939594-58d7cb561ad1'
  }}
)

# fix 10 about-02 duplicate ID - use unique
$jobs = $jobs | ForEach-Object {
  if ($_.id -eq '10') {
    $_.files['about-02.jpg'] = 'photo-1550966871-3ed3cdb132d8'
  }
  $_
}

$used = New-Object 'System.Collections.Generic.HashSet[string]'
$log = New-Object System.Collections.Generic.List[string]

foreach ($job in $jobs) {
  $dir = Folder $job.id
  $imgDir = Join-Path $dir.FullName 'images'
  $touched = New-Object System.Collections.Generic.List[string]
  foreach ($kv in $job.files.GetEnumerator()) {
    $file = $kv.Key
    $photoId = $kv.Value
    if (-not $used.Add($photoId)) { throw "duplicate photo id $photoId" }
    $out = Join-Path $imgDir $file
    Write-Host "GET $($job.id)/$file <= $photoId"
    Get-U $photoId $out
    $touched.Add($file)
  }
  if ($job.cont -gt 0) {
    Sync-Cont $dir.FullName ([int]$job.cont)
    for ($i=2; $i -le [int]$job.cont; $i++) { $touched.Add(("about-{0:d2}.jpg" -f $i)) }
  }
  Bump-Paths $job.id ($touched.ToArray())
  $log.Add("ok $($job.id) files=$($touched.Count)")
}

[IO.File]::WriteAllLines((Join-Path $sushi '_photo-wv-batch1-log.txt'), $log)
Write-Host 'BATCH1 DONE'
$log | % { Write-Host $_ }
