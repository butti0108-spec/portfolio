# photo-wv-3c: fix failed/non-photo slots
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$stamp = "photo-wv-3c"
$ua = "kuru-portfolio-photo-wv/1.0 (local sample build)"
$usedUrls = New-Object "System.Collections.Generic.HashSet[string]"

# seed used urls from existing SOURCES-photo-wv.md
Get-ChildItem $sushi -Recurse -Filter "SOURCES-photo-wv.md" | ForEach-Object {
  foreach ($line in Get-Content $_.FullName) {
    if ($line -match 'https?://\S+') { [void]$usedUrls.Add($Matches[0].TrimEnd('|',' ')) }
  }
}

function Folder([string]$id) {
  Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
}

function Test-PhotoOk([string]$path) {
  $img = [Drawing.Image]::FromFile((Resolve-Path $path))
  try {
    $bmp = New-Object Drawing.Bitmap $img
    $w = [int]$bmp.Width; $h = [int]$bmp.Height
    if ($w -lt 500 -or $h -lt 350) { $bmp.Dispose(); return $false }
    $coords = @(
      @(2,2), @([int]($w/2),2), @(($w-3),2),
      @(2,[int]($h/2)), @(($w-3),[int]($h/2)),
      @(2,($h-3)), @([int]($w/2),($h-3)), @(($w-3),($h-3)),
      @([int]($w/2),[int]($h/2))
    )
    $redish = 0; $grayish = 0; $uniq = New-Object "System.Collections.Generic.HashSet[string]"
    foreach ($p in $coords) {
      $c = $bmp.GetPixel([int]$p[0], [int]$p[1])
      if ($c.R -gt 180 -and $c.G -lt 90 -and $c.B -lt 90) { $redish++ }
      $span = [Math]::Max([Math]::Max($c.R,$c.G),$c.B) - [Math]::Min([Math]::Min($c.R,$c.G),$c.B)
      if ($span -lt 18) { $grayish++ }
      [void]$uniq.Add("$($c.R),$($c.G),$($c.B)")
    }
    $bmp.Dispose()
    if ($redish -ge 5) { return $false }
    # reject near-monochrome line art / flat graphics (all sample points gray + few unique colors)
    if ($grayish -ge 8 -and $uniq.Count -le 3) { return $false }
    return $true
  } finally { $img.Dispose() }
}

function Save-Safe([string]$src, [string]$dest) {
  $tmp = "$dest.tmp.bin"
  [IO.File]::Copy($src, $tmp, $true)
  for ($a = 1; $a -le 8; $a++) {
    try {
      [IO.File]::Copy($tmp, $dest, $true)
      Remove-Item $tmp -Force -EA SilentlyContinue
      return
    } catch { Start-Sleep -Milliseconds (300 * $a) }
  }
  throw "locked $dest"
}

function Get-Urls([string]$query, [int]$need) {
  $uri = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($query))&license_type=commercial&page_size=20"
  $r = Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{ "User-Agent" = $ua }
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($item in @($r.results)) {
    if (-not $item.url) { continue }
    if ($item.url -match 'wikimedia\.org') { continue } # 429 prone
    if ($item.url -match '\.png(\?|$)') { continue }    # often graphics
    if ($item.width -lt 700 -or $item.height -lt 500) { continue }
    if (-not $usedUrls.Add([string]$item.url)) { continue }
    $list.Add([string]$item.url)
    if ($list.Count -ge $need) { break }
  }
  return $list
}

function Download-Url([string]$url, [string]$outPath) {
  $tmp = "$outPath.dl.jpg"
  Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 60 -Headers @{ "User-Agent" = $ua }
  if ((Get-Item $tmp).Length -lt 15000) { Remove-Item $tmp -Force -EA SilentlyContinue; throw "tiny" }
  if (-not (Test-PhotoOk $tmp)) { Remove-Item $tmp -Force -EA SilentlyContinue; throw "not-photo-or-red" }
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
  $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-17-photo-wv-3c"', 1)
  $tmp = "$path.tmp"
  [IO.File]::WriteAllText($tmp, $t, $utf8)
  Save-Safe $tmp $path
  Remove-Item $tmp -Force -EA SilentlyContinue
  $null = $t | ConvertFrom-Json
}

function Fill($id, $file, $queries, $cont) {
  $dir = Folder $id
  $dest = Join-Path $dir.FullName "images\$file"
  foreach ($q in $queries) {
    Write-Host "SEARCH $id/$file <= $q"
    $urls = @(Get-Urls $q 10)
    foreach ($url in $urls) {
      try {
        Write-Host "  GET $url"
        Download-Url $url $dest
        if ($cont -gt 0 -and $file -eq "about-01.jpg") { Sync-Cont $dir.FullName $cont }
        $touched = @($file)
        if ($cont -gt 0 -and $file -eq "about-01.jpg") {
          for ($k=2; $k -le $cont; $k++) { $touched += ("about-{0:d2}.jpg" -f $k) }
        }
        Bump $id $touched
        Write-Host "OK $id/$file"
        return $true
      } catch {
        Write-Host "  skip: $($_.Exception.Message)"
        [void]$usedUrls.Remove($url)
      }
    }
  }
  Write-Host "FAIL $id/$file"
  return $false
}

Fill "16" "about-01.jpg" @("color photo flower bouquet","roses peony bouquet photograph","fresh flowers vase photo") 0 | Out-Null
Fill "04" "work-01.jpg" @("bright hair salon interior photo","modern beauty salon chairs") 0 | Out-Null
Fill "09" "about-01.jpg" @("yoga pose indoor sunlight photo","woman yoga wooden floor sun") 3 | Out-Null
Fill "09" "work-02.jpg" @("yoga class soft light photo","group yoga studio") 0 | Out-Null
# improve 10 hero toward japanese alley lantern if possible
Fill "10" "hero.jpg" @("tokyo alley red lantern night","japan izakaya street lantern") 0 | Out-Null

& (Join-Path $root "_photo-hash-audit.ps1")
Write-Host "DONE 3c"
