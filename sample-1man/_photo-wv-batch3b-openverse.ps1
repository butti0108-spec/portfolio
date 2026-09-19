# photo-wv-3b: Openverse thematic downloads (commercial-friendly licenses)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$stamp = "photo-wv-3b"
$ua = "kuru-portfolio-photo-wv/1.0 (local sample build)"
$log = New-Object System.Collections.Generic.List[string]
$usedUrls = New-Object "System.Collections.Generic.HashSet[string]"

function Folder([string]$id) {
  Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
}

function Test-NotRedBanner([string]$path) {
  $img = [Drawing.Image]::FromFile((Resolve-Path $path))
  try {
    $bmp = New-Object Drawing.Bitmap $img
    $w = [int]$bmp.Width; $h = [int]$bmp.Height
    $coords = @(
      @(2,2), @([int]($w/2),2), @(($w-3),2),
      @(2,[int]($h/2)), @(($w-3),[int]($h/2)),
      @(2,($h-3)), @([int]($w/2),($h-3)), @(($w-3),($h-3))
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

function Save-Safe([string]$src, [string]$dest) {
  $tmp = "$dest.tmp.jpg"
  [IO.File]::Copy($src, $tmp, $true)
  # retry copy for OneDrive locks
  for ($a = 1; $a -le 6; $a++) {
    try {
      [IO.File]::Copy($tmp, $dest, $true)
      Remove-Item $tmp -Force -EA SilentlyContinue
      return
    } catch {
      Start-Sleep -Milliseconds (250 * $a)
    }
  }
  throw "locked $dest"
}

function Get-OpenverseUrls([string]$query, [int]$need) {
  $uri = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($query))&license_type=commercial&page_size=20"
  $r = Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{ "User-Agent" = $ua }
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($item in @($r.results)) {
    if (-not $item.url) { continue }
    if ($item.width -lt 600 -or $item.height -lt 400) { continue }
    if (-not $usedUrls.Add([string]$item.url)) { continue }
    $list.Add([string]$item.url)
    if ($list.Count -ge $need) { break }
  }
  return $list
}

function Download-Url([string]$url, [string]$outPath) {
  $tmp = "$outPath.dl.jpg"
  Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 60 -Headers @{ "User-Agent" = $ua }
  if ((Get-Item $tmp).Length -lt 12000) { Remove-Item $tmp -Force -EA SilentlyContinue; throw "tiny" }
  if (-not (Test-NotRedBanner $tmp)) { Remove-Item $tmp -Force -EA SilentlyContinue; throw "red-banner" }
  Save-Safe $tmp $outPath
  Remove-Item $tmp -Force -EA SilentlyContinue
}

function Sync-Cont([string]$folderPath, [int]$n) {
  $src = Join-Path $folderPath "images\about-01.jpg"
  $bytes = [IO.File]::ReadAllBytes($src)
  for ($i = 2; $i -le $n; $i++) {
    $dest = Join-Path $folderPath ("images\about-{0:d2}.jpg" -f $i)
    $tmp = "$dest.tmp.bin"
    [IO.File]::WriteAllBytes($tmp, $bytes)
    Save-Safe $tmp $dest
    Remove-Item $tmp -Force -EA SilentlyContinue
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
    $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-17-photo-wv-3b"', 1)
  } else {
    $t = [regex]::Replace($t, '("version"\s*:\s*\d+,)', '${1}"brushUpPhoto":"2026-09-17-photo-wv-3b",', 1)
  }
  $tmp = "$path.tmp"
  [IO.File]::WriteAllText($tmp, $t, $utf8)
  Save-Safe $tmp $path
  Remove-Item $tmp -Force -EA SilentlyContinue
  $null = $t | ConvertFrom-Json
}

function Fill-Site($spec) {
  $id = [string]$spec.id
  $cont = [int]$spec.cont
  $dir = Folder $id
  $imgDir = Join-Path $dir.FullName "images"
  $touched = New-Object System.Collections.Generic.List[string]
  $sources = New-Object System.Collections.Generic.List[string]
  $sources.Add("# photo-wv-3b sources — $id ($($dir.Name))")
  $sources.Add("")
  $sources.Add("Openverse commercial-friendly. Grammar/colors/copy unchanged.")
  $sources.Add("")
  $sources.Add("| file | query | url |")
  $sources.Add("|------|-------|-----|")

  foreach ($slot in $spec.slots) {
    $file = [string]$slot.file
    $queries = @($slot.q)
    $got = $false
    foreach ($q in $queries) {
      Write-Host "SEARCH $id/$file <= $q"
      try {
        $urls = @(Get-OpenverseUrls $q 8)
      } catch {
        Write-Host "  search fail: $($_.Exception.Message)"
        continue
      }
      foreach ($url in $urls) {
        try {
          Write-Host "  GET $url"
          Download-Url $url (Join-Path $imgDir $file)
          $touched.Add($file)
          $sources.Add("| $file | $q | $url |")
          $got = $true
          break
        } catch {
          Write-Host "  skip: $($_.Exception.Message)"
          [void]$usedUrls.Remove($url)
        }
      }
      if ($got) { break }
    }
    if (-not $got) { $log.Add("FAIL $id/$file") ; Write-Host "FAIL $id/$file" }
  }

  if ($cont -gt 0 -and (Test-Path (Join-Path $imgDir "about-01.jpg"))) {
    Sync-Cont $dir.FullName $cont
    for ($k = 2; $k -le $cont; $k++) { $touched.Add(("about-{0:d2}.jpg" -f $k)) }
  }
  if ($touched.Count -gt 0) { Bump $id ($touched.ToArray()) }
  $srcPath = Join-Path $dir.FullName "SOURCES-photo-wv.md"
  [IO.File]::WriteAllLines($srcPath, $sources, [Text.UTF8Encoding]::new($false))
  $log.Add("done $id touched=$($touched.Count)")
}

# Jobs: priority worldview fixes first
$jobs = @(
  @{ id="16"; cont=0; slots=@(
    @{ file="hero.jpg"; q=@("hair salon interior","beauty salon chair mirror") }
    @{ file="about-01.jpg"; q=@("flower bouquet vase","seasonal flower arrangement") }
    @{ file="about-02.jpg"; q=@("hairdresser cutting hair","hair styling scissors") }
    @{ file="about-03.jpg"; q=@("flowers on table cafe","small flower vase interior") }
    @{ file="work-01.jpg"; q=@("mini bouquet gift","hand holding flowers") }
    @{ file="work-02.jpg"; q=@("hair coloring salon","hair wash sink salon") }
    @{ file="work-03.jpg"; q=@("flower and hair","pink flowers soft") }
  )}
  @{ id="10"; cont=0; slots=@(
    @{ file="hero.jpg"; q=@("japanese paper lantern night","red chochin lantern") }
    @{ file="about-01.jpg"; q=@("izakaya counter japan","japanese bar counter night") }
    @{ file="about-02.jpg"; q=@("yakitori grill","skewers grill japanese") }
    @{ file="about-03.jpg"; q=@("sake bottles izakaya","japanese sake cup") }
    @{ file="work-01.jpg"; q=@("japanese street food night","alley restaurant japan") }
    @{ file="work-02.jpg"; q=@("grilled fish japanese","izakaya food plate") }
    @{ file="work-03.jpg"; q=@("beer glass bar night","japanese pub drink") }
  )}
  @{ id="04"; cont=0; slots=@(
    @{ file="work-01.jpg"; q=@("white salon interior bright","minimalist hair salon") }
    @{ file="work-02.jpg"; q=@("hair washing salon basin","shampoo salon") }
    @{ file="work-03.jpg"; q=@("hair scissors comb white","salon tools clean") }
  )}
  @{ id="09"; cont=3; slots=@(
    @{ file="hero.jpg"; q=@("yoga mat sunlight floor","yoga studio window light") }
    @{ file="about-01.jpg"; q=@("person yoga pose sunlit room","yoga sunlight wooden floor") }
    @{ file="work-01.jpg"; q=@("meditation cushion sunlight","yoga stretch indoor") }
    @{ file="work-02.jpg"; q=@("bare feet yoga floor","yoga class soft light") }
    @{ file="work-03.jpg"; q=@("yoga studio empty bright","calm yoga room") }
  )}
  @{ id="28"; cont=3; slots=@(
    @{ file="hero.jpg"; q=@("green leaves sunlight forest","leaf canopy light") }
    @{ file="about-01.jpg"; q=@("fern leaves close up","green foliage soft") }
    @{ file="work-01.jpg"; q=@("bamboo leaves green","forest path green") }
    @{ file="work-02.jpg"; q=@("moss green nature calm","leaf shadow light") }
    @{ file="work-03.jpg"; q=@("tree leaves breeze","green plants indoor") }
  )}
  @{ id="15"; cont=0; slots=@(
    @{ file="about-02.jpg"; q=@("fresh bread morning bakery","bakery shelves bread") }
    @{ file="work-03.jpg"; q=@("pastry bag takeaway bakery","bread in paper bag") }
  )}
  @{ id="06"; cont=3; slots=@(
    @{ file="work-03.jpg"; q=@("bakery display case bread","bread behind glass case") }
  )}
  @{ id="21"; cont=0; slots=@(
    @{ file="work-01.jpg"; q=@("coffee cup window green plants","cafe latte greenery") }
  )}
)

foreach ($job in $jobs) { Fill-Site $job }

# resync continuous not touched about in this pass
foreach ($pair in @(@{id="01";n=4},@{id="03";n=3},@{id="08";n=4})) {
  Sync-Cont (Folder $pair.id).FullName ([int]$pair.n)
  Write-Host "resync $($pair.id)"
}

# cross hash
$map = @{}
$known = @{ "01"=4; "03"=3; "06"=3; "08"=4; "09"=3; "28"=3 }
Get-ChildItem $sushi -Directory | Where-Object { $_.Name -match "^\d{2}-" } | ForEach-Object {
  $id = $_.Name.Substring(0,2)
  $contN = 0; if ($known.ContainsKey($id)) { $contN = [int]$known[$id] }
  Get-ChildItem (Join-Path $_.FullName "images") -File -EA SilentlyContinue |
    Where-Object { $_.Name -match "\.jpe?g$" -and $_.Name -notlike "color-*" } |
    ForEach-Object {
      if ($contN -gt 0 -and $_.Name -match "^about-0[2-9]") { return }
      $h = (Get-FileHash $_.FullName).Hash
      if (-not $map.ContainsKey($h)) { $map[$h] = New-Object System.Collections.Generic.List[string] }
      $map[$h].Add("$id/$($_.Name)")
    }
}
$cross = @($map.GetEnumerator() | Where-Object { ($_.Value | ForEach-Object { $_.Split("/")[0] } | Select-Object -Unique).Count -gt 1 })
Write-Host ("cross_groups=" + $cross.Count)
$cross | Select-Object -First 8 | ForEach-Object { Write-Host ($_.Value -join " | ") }

[IO.File]::WriteAllLines((Join-Path $sushi "_photo-wv-batch3b-log.txt"), $log)
Write-Host "DONE"
$log | ForEach-Object { Write-Host $_ }
