# photo-wv-5b: retry failed slots with broader queries + page2
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$stamp = "photo-wv-5b"
$ua = "kuru-portfolio-photo-wv/1.0"
$tmpRoot = Join-Path $env:TEMP ("photo-wv-5b-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$log = New-Object System.Collections.Generic.List[string]
$used = New-Object "System.Collections.Generic.HashSet[string]"
Get-ChildItem $sushi -Recurse -Filter "SOURCES-photo-wv.md" -EA SilentlyContinue | ForEach-Object {
  foreach ($line in Get-Content $_.FullName -EA SilentlyContinue) {
    if ($line -match 'https?://\S+') { [void]$used.Add($Matches[0].TrimEnd('|',' ')) }
  }
}

function Folder([string]$id) {
  Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
}
function Test-Ok([string]$path) {
  $fs = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $img = [Drawing.Image]::FromStream($fs)
    try {
      $bmp = New-Object Drawing.Bitmap $img
      $w = [int]$bmp.Width; $h = [int]$bmp.Height
      if ($w -lt 480 -or $h -lt 320) { return $false }
      $pts = @(@(2,2),@([int]($w/2),2),@(($w-3),2),@(2,[int]($h/2)),@(($w-3),[int]($h/2)),@(2,($h-3)),@([int]($w/2),($h-3)),@(($w-3),($h-3)),@([int]($w/2),[int]($h/2)))
      $red = 0; $gray = 0; $u = New-Object "System.Collections.Generic.HashSet[string]"
      foreach ($p in $pts) {
        $c = $bmp.GetPixel([int]$p[0], [int]$p[1])
        if ($c.R -gt 180 -and $c.G -lt 90 -and $c.B -lt 90) { $red++ }
        $span = [Math]::Max([Math]::Max($c.R,$c.G),$c.B) - [Math]::Min([Math]::Min($c.R,$c.G),$c.B)
        if ($span -lt 18) { $gray++ }
        [void]$u.Add("$($c.R),$($c.G),$($c.B)")
      }
      $bmp.Dispose()
      if ($red -ge 5) { return $false }
      if ($gray -ge 8 -and $u.Count -le 3) { return $false }
      return $true
    } finally { $img.Dispose() }
  } finally { $fs.Close() }
}
function Copy-Retry([string]$src,[string]$dest) {
  for ($a = 1; $a -le 12; $a++) {
    try { [IO.File]::Copy($src, $dest, $true); return } catch { Start-Sleep -Milliseconds (350 * $a) }
  }
  throw "copy-fail $dest"
}
function Get-Urls([string]$q, [int]$page) {
  $uri = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=20&page=$page"
  $r = Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{ "User-Agent" = $ua }
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($item in @($r.results)) {
    if (-not $item.url) { continue }
    if ($item.url -match 'wikimedia|\.png') { continue }
    if ($item.width -lt 600 -or $item.height -lt 400) { continue }
    if (-not $used.Add([string]$item.url)) { continue }
    $list.Add([string]$item.url)
    if ($list.Count -ge 15) { break }
  }
  return $list
}
function Sync-Cont([string]$folderPath,[int]$n,[byte[]]$bytes) {
  for ($i = 2; $i -le $n; $i++) {
    $p = Join-Path $folderPath ("images\about-{0:d2}.jpg" -f $i)
    $t = Join-Path $tmpRoot ("sync-$i.jpg")
    [IO.File]::WriteAllBytes($t, $bytes)
    Copy-Retry $t $p
  }
}
function Bump([string]$id,[string[]]$files) {
  $dir = Folder $id
  $path = Join-Path $dir.FullName "draft.json"
  $utf8 = [Text.UTF8Encoding]::new($false)
  $t = [IO.File]::ReadAllText($path, $utf8)
  $name = $dir.Name
  $map = @{
    "hero.jpg"="hero_image";"about-01.jpg"="about_image_1";"about-02.jpg"="about_image_2"
    "about-03.jpg"="about_image_3";"about-04.jpg"="about_image_4"
    "work-01.jpg"="work_1_image";"work-02.jpg"="work_2_image";"work-03.jpg"="work_3_image"
  }
  foreach ($f in $files) {
    if (-not $map.ContainsKey($f)) { continue }
    $key = $map[$f]; $val = "sushi-samples/$name/images/$f`?v=$stamp"
    $pat = '"' + [regex]::Escape($key) + '"\s*:\s*"[^"]*"'
    $rep = '"' + $key + '":"' + $val + '"'
    if ([regex]::IsMatch($t, $pat)) { $t = [regex]::Replace($t, $pat, $rep, 1) }
  }
  if ($t -match '"brushUpPhoto"') {
    $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-18-photo-wv-5b"', 1)
  }
  $dt = Join-Path $tmpRoot "draft-$id.json"
  [IO.File]::WriteAllText($dt, $t, $utf8)
  Copy-Retry $dt $path
}
function Append-Source([string]$id,[string]$file,[string]$q,[string]$url) {
  $dir = Folder $id
  $p = Join-Path $dir.FullName "SOURCES-photo-wv.md"
  $line = "| $file | $q | $url |"
  if (Test-Path $p) {
    Add-Content -LiteralPath $p -Value $line -Encoding UTF8
  } else {
    @(
      "# photo-wv-5b — $id", "",
      "| file | query | url |", "|------|-------|-----|",
      $line
    ) | Set-Content -LiteralPath $p -Encoding UTF8
  }
}
function Fill-Site($spec) {
  $id = [string]$spec.id; $cont = [int]$spec.cont
  $dir = Folder $id; $imgDir = Join-Path $dir.FullName "images"
  $touched = New-Object System.Collections.Generic.List[string]
  foreach ($slot in $spec.slots) {
    $file = [string]$slot.file; $got = $false
    foreach ($q in @($slot.q)) {
      foreach ($page in @(1, 2)) {
        Write-Host "SEARCH $id/$file <= $q p$page"
        try { $urls = @(Get-Urls $q $page) } catch { Write-Host " search-fail $($_.Exception.Message)"; continue }
        foreach ($url in $urls) {
          $dl = Join-Path $tmpRoot ("$id-$file".Replace('.','-') + ".jpg")
          try {
            Write-Host "  GET $url"
            Invoke-WebRequest -Uri $url -OutFile $dl -UseBasicParsing -TimeoutSec 60 -Headers @{ "User-Agent" = $ua }
            if ((Get-Item $dl).Length -lt 12000) { throw "tiny" }
            if (-not (Test-Ok $dl)) { throw "reject" }
            Copy-Retry $dl (Join-Path $imgDir $file)
            $touched.Add($file)
            Append-Source $id $file $q $url
            $got = $true; break
          } catch {
            Write-Host "  skip $($_.Exception.Message)"
            [void]$used.Remove($url)
          }
        }
        if ($got) { break }
      }
      if ($got) { break }
    }
    if (-not $got) { $log.Add("FAIL $id/$file"); Write-Host "FAIL $id/$file" }
  }
  if ($cont -gt 0 -and (Test-Path (Join-Path $imgDir "about-01.jpg")) -and ($touched -contains "about-01.jpg" -or $spec.forceSync)) {
    $bytes = [IO.File]::ReadAllBytes((Join-Path $imgDir "about-01.jpg"))
    Sync-Cont $dir.FullName $cont $bytes
    for ($k = 2; $k -le $cont; $k++) { $touched.Add(("about-{0:d2}.jpg" -f $k)) }
  }
  if ($touched.Count -gt 0) { Bump $id ($touched.ToArray()) }
  $log.Add("done $id touched=$($touched.Count)")
}

$jobs = @(
  @{ id="30"; cont=0; forceSync=$false; slots=@(
    @{file="hero.jpg"; q=@("museum gallery painting wall","art museum interior frames","gallery exhibition room","oil painting museum wall","picture gallery lighting")}
  )}
  @{ id="09"; cont=3; forceSync=$true; slots=@(
    @{file="about-01.jpg"; q=@("yoga pose indoor morning","yoga practice studio floor","yoga meditation room","person doing yoga indoors","fitness yoga room light")}
    @{file="work-01.jpg"; q=@("yoga mat rolled up","exercise mat indoor","yoga equipment floor","foam roller yoga studio","stretching mat gym floor")}
    @{file="work-03.jpg"; q=@("indoor plant bright room","houseplant window light","green plant studio room","potted plant sunny room","fern indoor natural light")}
  )}
  @{ id="01"; cont=0; forceSync=$false; slots=@(
    @{file="work-03.jpg"; q=@("coffee shop chairs","cafe seating window","empty cafe tables","coffee house interior chairs","cafe wooden chairs")}
  )}
  @{ id="04"; cont=0; forceSync=$false; slots=@(
    @{file="hero.jpg"; q=@("hair salon interior","beauty salon chairs mirrors","hairdressing salon room","barber salon bright interior","salon styling chairs")}
    @{file="about-01.jpg"; q=@("salon chair mirror","hairdresser station","beauty salon interior bright","styling chair salon","hair salon workstation")}
    @{file="about-02.jpg"; q=@("hairdresser cutting hair","hair stylist at work","haircut in salon","stylist comb scissors","salon haircut session")}
    @{file="work-03.jpg"; q=@("hair scissors comb","salon tools closeup","hair brush scissors","barber tools tray","hairdressing scissors")}
  )}
  @{ id="23"; cont=0; forceSync=$false; slots=@(
    @{file="work-03.jpg"; q=@("office coffee machine","kitchen office coffee","workplace coffee break","office pantry coffee","shared kitchen office")}
  )}
)

foreach ($job in $jobs) { Fill-Site $job }

$first = @('01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','18','19','21','23','26','28','29','30')
$known = @{ "01"=4;"03"=3;"06"=3;"08"=4;"09"=3;"28"=3 }
$map = @{}
foreach ($id in $first) {
  $d = Folder $id
  $contN = 0; if ($known.ContainsKey($id)) { $contN = [int]$known[$id] }
  Get-ChildItem (Join-Path $d.FullName 'images') -File -EA SilentlyContinue |
    Where-Object { $_.Name -match '\.jpe?g$' -and $_.Name -notlike 'color-*' } |
    ForEach-Object {
      if ($contN -gt 0 -and $_.Name -match '^about-0[2-9]') { return }
      $h = (Get-FileHash $_.FullName).Hash
      if (-not $map.ContainsKey($h)) { $map[$h] = New-Object System.Collections.Generic.List[string] }
      $map[$h].Add("$id/$($_.Name)")
    }
}
$cross = @($map.GetEnumerator() | Where-Object { ($_.Value | ForEach-Object { $_.Split('/')[0] } | Select-Object -Unique).Count -gt 1 })
Write-Host ("cross_groups=" + $cross.Count)
foreach ($c in $cross) { $log.Add("CROSS " + ($c.Value -join ' | ')); Write-Host ("CROSS " + ($c.Value -join ' | ')) }
[IO.File]::WriteAllLines((Join-Path $sushi "_photo-wv-batch5b-log.txt"), $log)
Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
Write-Host "DONE"
$log | ForEach-Object { Write-Host $_ }
