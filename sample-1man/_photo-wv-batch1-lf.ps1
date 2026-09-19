# Worldview photo pass via loremflickr unique locks (same pattern as SOURCES.md).
# Unique lock per file globally. Continuous sites: fill about-01 then sync bytes.
$ErrorActionPreference = "Stop"
$sushi = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "sushi-samples"
$stamp = "photo-wv-1"
$log = New-Object System.Collections.Generic.List[string]

function Folder([string]$id) {
  Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
}

function Get-LF([string]$tags, [int]$lock, [string]$outPath) {
  $url = "https://loremflickr.com/1600/1200/$tags/all?lock=$lock"
  $tmp = "$outPath.tmp.jpg"
  Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 60
  if ((Get-Item $tmp).Length -lt 5000) { throw "tiny $lock" }
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
    $key = $map[$f]
    $val = "sushi-samples/$name/images/$f`?v=$stamp"
    $pat = '"' + [regex]::Escape($key) + '"\s*:\s*"[^"]*"'
    $rep = '"' + $key + '":"' + $val + '"'
    if ([regex]::IsMatch($t, $pat)) { $t = [regex]::Replace($t, $pat, $rep, 1) }
  }
  if ($t -match '"brushUpPhoto"') {
    $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-17-photo-wv-1"', 1)
  } else {
    $t = [regex]::Replace($t, '("version"\s*:\s*\d+,)', '${1}"brushUpPhoto":"2026-09-17-photo-wv-1",', 1)
  }
  $tmp = "$path.tmp"
  [IO.File]::WriteAllText($tmp, $t, $utf8)
  [IO.File]::Copy($tmp, $path, $true)
  Remove-Item $tmp -Force -EA SilentlyContinue
  $null = $t | ConvertFrom-Json
}

# id -> tags, lockBase, slots, contN (0=none)
$specs = @(
  @{ id='04'; tags='hairsalon,hairdresser,salon'; base=71040; slots=@('hero.jpg','about-01.jpg','about-02.jpg','about-03.jpg','work-01.jpg','work-02.jpg','work-03.jpg'); cont=0 }
  @{ id='16'; tags='flowers,hairdresser,bouquet'; base=71050; slots=@('hero.jpg','about-01.jpg','about-02.jpg','about-03.jpg','work-01.jpg','work-02.jpg','work-03.jpg'); cont=0 }
  @{ id='06'; tags='bakery,bread,pastry'; base=71060; slots=@('hero.jpg','about-01.jpg','work-01.jpg','work-02.jpg','work-03.jpg'); cont=3 }
  @{ id='15'; tags='bakery,croissant,breakfast'; base=71070; slots=@('hero.jpg','about-01.jpg','about-02.jpg','about-03.jpg','work-01.jpg','work-02.jpg','work-03.jpg'); cont=0 }
  @{ id='19'; tags='ramen,noodles,japanesefood'; base=71080; slots=@('hero.jpg','about-01.jpg','about-02.jpg','about-03.jpg','work-01.jpg','work-02.jpg','work-03.jpg'); cont=0 }
  @{ id='10'; tags='izakaya,japanese,restaurant'; base=71090; slots=@('hero.jpg','about-01.jpg','about-02.jpg','about-03.jpg','work-01.jpg','work-02.jpg','work-03.jpg'); cont=0 }
  @{ id='11'; tags='clinic,waitingroom,hospital'; base=71100; slots=@('hero.jpg','about-01.jpg','about-02.jpg','about-03.jpg','work-01.jpg','work-02.jpg','work-03.jpg'); cont=0 }
  @{ id='21'; tags='cafe,coffee,window'; base=71110; slots=@('hero.jpg','about-01.jpg','about-02.jpg','about-03.jpg','work-01.jpg','work-02.jpg','work-03.jpg'); cont=0 }
)

$lockUsed = New-Object 'System.Collections.Generic.HashSet[int]'

foreach ($s in $specs) {
  $dir = Folder $s.id
  $imgDir = Join-Path $dir.FullName 'images'
  $touched = New-Object System.Collections.Generic.List[string]
  $i = 0
  foreach ($file in $s.slots) {
    $lock = [int]$s.base + $i
    if (-not $lockUsed.Add($lock)) { throw "lock clash $lock" }
    Write-Host "GET $($s.id)/$file lock=$lock tags=$($s.tags)"
    Get-LF $s.tags $lock (Join-Path $imgDir $file)
    $touched.Add($file)
    $i++
  }
  if ([int]$s.cont -gt 0) {
    Sync-Cont $dir.FullName ([int]$s.cont)
    for ($k=2; $k -le [int]$s.cont; $k++) { $touched.Add(("about-{0:d2}.jpg" -f $k)) }
  }
  Bump $s.id ($touched.ToArray())
  $log.Add("ok $($s.id)")
}

# verify no cross-site hash among these ids (ignore continuous within)
$first = $specs | ForEach-Object { $_.id }
$map = @{}
foreach ($id in $first) {
  $dir = Folder $id
  Get-ChildItem (Join-Path $dir.FullName 'images') -File | Where-Object { $_.Name -match '\.jpe?g$' -and $_.Name -notlike 'color-*' } | ForEach-Object {
    # skip about-02+ if continuous identical
    $h = (Get-FileHash $_.FullName).Hash
    if (-not $map.ContainsKey($h)) { $map[$h] = New-Object System.Collections.Generic.List[string] }
    $map[$h].Add("$id/$($_.Name)")
  }
}
$cross = $map.GetEnumerator() | Where-Object {
  $sites = ($_.Value | ForEach-Object { $_.Split('/')[0] } | Select-Object -Unique)
  $sites.Count -gt 1
}
if ($cross) {
  Write-Host 'CROSS HASH FOUND:'
  $cross | ForEach-Object { Write-Host ($_.Value -join ' | ') }
} else {
  Write-Host 'No cross-site exact hash among batch'
}

[IO.File]::WriteAllLines((Join-Path $sushi '_photo-wv-batch1-log.txt'), $log)
Write-Host 'DONE'
$log | % { Write-Host $_ }
