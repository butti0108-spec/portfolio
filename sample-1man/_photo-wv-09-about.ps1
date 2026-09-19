# 09 about-01 fill via %TEMP% to avoid OneDrive locks
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$ua = "kuru-portfolio-photo-wv/1.0"
$tmpRoot = Join-Path $env:TEMP ("photo-wv-09-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$used = New-Object "System.Collections.Generic.HashSet[string]"
Get-ChildItem $sushi -Recurse -Filter "SOURCES-photo-wv.md" -EA SilentlyContinue | % {
  foreach ($line in Get-Content $_.FullName) {
    if ($line -match 'https?://\S+') { [void]$used.Add($Matches[0].TrimEnd('|',' ')) }
  }
}
function Test-Ok([string]$path) {
  $fs = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $img = [Drawing.Image]::FromStream($fs)
    try {
      $bmp = New-Object Drawing.Bitmap $img
      $w=[int]$bmp.Width; $h=[int]$bmp.Height
      if ($w -lt 500 -or $h -lt 350) { return $false }
      $pts=@(@(2,2),@([int]($w/2),2),@(($w-3),2),@(2,[int]($h/2)),@(($w-3),[int]($h/2)),@(2,($h-3)),@([int]($w/2),($h-3)),@(($w-3),($h-3)),@([int]($w/2),[int]($h/2)))
      $red=0;$gray=0;$u=New-Object "System.Collections.Generic.HashSet[string]"
      foreach($p in $pts){
        $c=$bmp.GetPixel([int]$p[0],[int]$p[1])
        if($c.R -gt 180 -and $c.G -lt 90 -and $c.B -lt 90){$red++}
        $span=[Math]::Max([Math]::Max($c.R,$c.G),$c.B)-[Math]::Min([Math]::Min($c.R,$c.G),$c.B)
        if($span -lt 18){$gray++}
        [void]$u.Add("$($c.R),$($c.G),$($c.B)")
      }
      $bmp.Dispose()
      if($red -ge 5){return $false}
      if($gray -ge 8 -and $u.Count -le 3){return $false}
      return $true
    } finally { $img.Dispose() }
  } finally { $fs.Close() }
}
function Copy-Retry([string]$src, [string]$dest) {
  for ($a=1; $a -le 12; $a++) {
    try {
      [IO.File]::Copy($src, $dest, $true)
      return
    } catch {
      Start-Sleep -Milliseconds (400 * $a)
    }
  }
  throw "copy-fail $dest"
}
$dir = Get-ChildItem $sushi -Directory | ? { $_.Name -like "09-*" } | Select -First 1
$dest1 = Join-Path $dir.FullName "images\about-01.jpg"
$queries = @(
  "sunlight wooden floor interior","bare feet wooden floor sun",
  "meditation cushion room window","stretching indoor morning light",
  "pilates studio window light","calm empty room wood floor sun"
)
$ok=$false
foreach($q in $queries){
  Write-Host "SEARCH $q"
  $uri="https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=20"
  $r=Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{"User-Agent"=$ua}
  foreach($item in @($r.results)){
    if(-not $item.url){continue}
    if($item.url -match 'wikimedia|\.png'){continue}
    if($item.width -lt 700 -or $item.height -lt 500){continue}
    if(-not $used.Add([string]$item.url)){continue}
    $dl = Join-Path $tmpRoot "dl.jpg"
    try{
      Write-Host " GET $($item.url)"
      Invoke-WebRequest -Uri $item.url -OutFile $dl -UseBasicParsing -TimeoutSec 60 -Headers @{"User-Agent"=$ua}
      if((Get-Item $dl).Length -lt 15000){throw "tiny"}
      if(-not (Test-Ok $dl)){throw "reject"}
      Copy-Retry $dl $dest1
      $bytes=[IO.File]::ReadAllBytes($dl)
      foreach($i in 2..3){
        $p=Join-Path $dir.FullName ("images\about-{0:d2}.jpg" -f $i)
        $t=Join-Path $tmpRoot ("about-$i.jpg")
        [IO.File]::WriteAllBytes($t,$bytes)
        Copy-Retry $t $p
      }
      $path=Join-Path $dir.FullName "draft.json"
      $utf8=[Text.UTF8Encoding]::new($false)
      $t=[IO.File]::ReadAllText($path,$utf8)
      $name=$dir.Name
      foreach($pair in @(
        @("about_image_1","about-01.jpg"),
        @("about_image_2","about-02.jpg"),
        @("about_image_3","about-03.jpg")
      )){
        $key=$pair[0]; $f=$pair[1]
        $val="sushi-samples/$name/images/$f`?v=photo-wv-3c"
        $pat='"'+[regex]::Escape($key)+'"\s*:\s*"[^"]*"'
        $rep='"'+$key+'":"'+$val+'"'
        if([regex]::IsMatch($t,$pat)){$t=[regex]::Replace($t,$pat,$rep,1)}
      }
      $t=[regex]::Replace($t,'"brushUpPhoto"\s*:\s*"[^"]*"','"brushUpPhoto":"2026-09-17-photo-wv-3c"',1)
      $dt=Join-Path $tmpRoot "draft.json"
      [IO.File]::WriteAllText($dt,$t,$utf8)
      Copy-Retry $dt $path
      Write-Host "OK 09/about-01"
      $ok=$true; break
    } catch {
      Write-Host " skip $($_.Exception.Message)"
      [void]$used.Remove([string]$item.url)
    }
  }
  if($ok){break}
}
Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
if(-not $ok){ Write-Host "FAIL 09/about-01"; exit 1 }
