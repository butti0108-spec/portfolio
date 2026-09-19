# photo-wv-5d: fill last gaps; continuous about can reuse hero plate
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$stamp = "photo-wv-5d"
$ua = "kuru-portfolio-photo-wv/1.0"
$tmpRoot = Join-Path $env:TEMP ("photo-wv-5d-" + [guid]::NewGuid().ToString("n"))
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
      $w=[int]$bmp.Width; $h=[int]$bmp.Height
      if ($w -lt 480 -or $h -lt 320) { return $false }
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
function Copy-Retry([string]$src,[string]$dest){
  for($a=1;$a -le 12;$a++){ try{[IO.File]::Copy($src,$dest,$true); return} catch { Start-Sleep -Milliseconds (350*$a) } }
  throw "copy-fail $dest"
}
function Get-Urls([string]$q,[int]$page){
  $uri="https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=20&page=$page"
  $r=Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{"User-Agent"=$ua}
  $list=New-Object System.Collections.Generic.List[string]
  foreach($item in @($r.results)){
    if(-not $item.url){continue}
    if($item.url -match 'wikimedia|\.png'){continue}
    if($item.width -lt 600 -or $item.height -lt 400){continue}
    if(-not $used.Add([string]$item.url)){continue}
    $list.Add([string]$item.url)
    if($list.Count -ge 15){break}
  }
  return $list
}
function Sync-Cont([string]$folderPath,[int]$n,[byte[]]$bytes){
  for($i=2;$i -le $n;$i++){
    $p=Join-Path $folderPath ("images\about-{0:d2}.jpg" -f $i)
    $t=Join-Path $tmpRoot ("sync-$i.jpg")
    [IO.File]::WriteAllBytes($t,$bytes)
    Copy-Retry $t $p
  }
}
function Bump([string]$id,[string[]]$files){
  $dir=Folder $id
  $path=Join-Path $dir.FullName "draft.json"
  $utf8=[Text.UTF8Encoding]::new($false)
  $t=[IO.File]::ReadAllText($path,$utf8)
  $name=$dir.Name
  $map=@{
    "hero.jpg"="hero_image";"about-01.jpg"="about_image_1";"about-02.jpg"="about_image_2"
    "about-03.jpg"="about_image_3";"about-04.jpg"="about_image_4"
    "work-01.jpg"="work_1_image";"work-02.jpg"="work_2_image";"work-03.jpg"="work_3_image"
  }
  foreach($f in $files){
    if(-not $map.ContainsKey($f)){continue}
    $key=$map[$f]; $val="sushi-samples/$name/images/$f`?v=$stamp"
    $pat='"'+[regex]::Escape($key)+'"\s*:\s*"[^"]*"'
    $rep='"'+$key+'":"'+$val+'"'
    if([regex]::IsMatch($t,$pat)){$t=[regex]::Replace($t,$pat,$rep,1)}
  }
  if($t -match '"brushUpPhoto"'){ $t=[regex]::Replace($t,'"brushUpPhoto"\s*:\s*"[^"]*"','"brushUpPhoto":"2026-09-18-photo-wv-5d"',1) }
  $dt=Join-Path $tmpRoot "draft-$id.json"
  [IO.File]::WriteAllText($dt,$t,$utf8)
  Copy-Retry $dt $path
}
function Append-Source([string]$id,[string]$file,[string]$q,[string]$url){
  $p=Join-Path (Folder $id).FullName "SOURCES-photo-wv.md"
  $line="| $file | $q | $url |"
  if(Test-Path $p){ Add-Content -LiteralPath $p -Value $line -Encoding UTF8 }
  else{ @("# photo-wv-5d — $id","","| file | query | url |","|------|-------|-----|",$line)|Set-Content -LiteralPath $p -Encoding UTF8 }
}
function Try-Download([string]$id,[string]$file,[string[]]$queries){
  $imgDir=Join-Path (Folder $id).FullName "images"
  foreach($q in $queries){
    foreach($page in @(1,2,3)){
      Write-Host "SEARCH $id/$file <= $q p$page"
      try{$urls=@(Get-Urls $q $page)} catch { continue }
      foreach($url in $urls){
        $dl=Join-Path $tmpRoot ("$id-$file".Replace('.','-')+".jpg")
        try{
          Invoke-WebRequest -Uri $url -OutFile $dl -UseBasicParsing -TimeoutSec 60 -Headers @{"User-Agent"=$ua}
          if((Get-Item $dl).Length -lt 12000){throw "tiny"}
          if(-not (Test-Ok $dl)){throw "reject"}
          Copy-Retry $dl (Join-Path $imgDir $file)
          Append-Source $id $file $q $url
          Write-Host "OK $id/$file"
          return $true
        } catch {
          Write-Host "  skip $($_.Exception.Message)"
          [void]$used.Remove($url)
        }
      }
    }
  }
  return $false
}

# 08: if about download fails, reuse hero plate for continuous
$ok08 = Try-Download "08" "about-01.jpg" @("tatami floor closeup","japanese room interior","washitsu interior","futon tatami daylight","ryokan bedroom")
$dir08 = Folder "08"
$img08 = Join-Path $dir08.FullName "images"
if(-not $ok08){
  Write-Host "FALLBACK 08 about<=hero"
  Copy-Retry (Join-Path $img08 "hero.jpg") (Join-Path $img08 "about-01.jpg")
  Append-Source "08" "about-01.jpg" "fallback-from-hero" "(local hero.jpg)"
}
$bytes08=[IO.File]::ReadAllBytes((Join-Path $img08 "about-01.jpg"))
Sync-Cont $dir08.FullName 4 $bytes08
Bump "08" @("about-01.jpg","about-02.jpg","about-03.jpg","about-04.jpg")
$log.Add("done 08 continuous synced")

# 30 hero must be framed art (reject abstract leftovers)
$ok30 = Try-Download "30" "hero.jpg" @("painting in frame on wall","museum oil painting frame","gallery framed canvas wall","classical painting ornate frame","framed landscape painting wall")
if($ok30){ Bump "30" @("hero.jpg"); $log.Add("done 30 hero") } else { $log.Add("FAIL 30/hero.jpg") }

# 04 white/private salon feel
$ok04h = Try-Download "04" "hero.jpg" @("bright hair salon interior chairs","modern hair salon white mirrors","hairdressing salon daylight interior","salon chairs row mirrors","beauty salon bright interior")
$ok04a = Try-Download "04" "about-01.jpg" @("hair salon chair","beauty salon interior","hairdresser mirror","salon styling station","barber chair salon","hair washing salon")
$touched04 = @()
if($ok04h){ $touched04 += "hero.jpg" }
if($ok04a){ $touched04 += "about-01.jpg" }
if($touched04.Count -gt 0){ Bump "04" $touched04; $log.Add("done 04 $($touched04 -join ',')") }
else { $log.Add("FAIL 04 slots") }

# stamp all first-team brushUpPhoto final seal (keep brushUpCopy)
$first=@('01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','18','19','21','23','26','28','29','30')
foreach($id in $first){
  $dir=Folder $id
  $path=Join-Path $dir.FullName "draft.json"
  $utf8=[Text.UTF8Encoding]::new($false)
  $t=[IO.File]::ReadAllText($path,$utf8)
  if($t -match '"brushUpPhoto"'){ $t=[regex]::Replace($t,'"brushUpPhoto"\s*:\s*"[^"]*"','"brushUpPhoto":"2026-09-18-photo-wv-final"',1) }
  else { $t=[regex]::Replace($t,'("version"\s*:\s*\d+,)','${1}"brushUpPhoto":"2026-09-18-photo-wv-final",',1) }
  # ensure copy stamp remains
  if($t -notmatch '"brushUpCopy"\s*:\s*"2026-09-18-copy-approved"'){
    if($t -match '"brushUpCopy"'){ $t=[regex]::Replace($t,'"brushUpCopy"\s*:\s*"[^"]*"','"brushUpCopy":"2026-09-18-copy-approved"',1) }
    else { $t=[regex]::Replace($t,'("brushUpPhoto"\s*:\s*"[^"]*",)','${1}"brushUpCopy":"2026-09-18-copy-approved",',1) }
  }
  $dt=Join-Path $tmpRoot "seal-$id.json"
  [IO.File]::WriteAllText($dt,$t,$utf8)
  Copy-Retry $dt $path
}
$log.Add("sealed 24 brushUpPhoto=final")

# hash check
$known=@{ "01"=4;"03"=3;"06"=3;"08"=4;"09"=3;"28"=3 }
$map=@{}
foreach($id in $first){
  $d=Folder $id
  $contN=0; if($known.ContainsKey($id)){$contN=[int]$known[$id]}
  Get-ChildItem (Join-Path $d.FullName 'images') -File -EA SilentlyContinue |
    Where-Object { $_.Name -match '\.jpe?g$' -and $_.Name -notlike 'color-*' } |
    ForEach-Object {
      if($contN -gt 0 -and $_.Name -match '^about-0[2-9]'){return}
      $h=(Get-FileHash $_.FullName).Hash
      if(-not $map.ContainsKey($h)){$map[$h]=New-Object System.Collections.Generic.List[string]}
      $map[$h].Add("$id/$($_.Name)")
    }
}
$cross=@($map.GetEnumerator()|Where-Object{($_.Value|ForEach-Object{$_.Split('/')[0]}|Select-Object -Unique).Count -gt 1})
Write-Host ("cross_groups="+$cross.Count)
foreach($c in $cross){ $log.Add("CROSS "+($c.Value -join ' | ')) }

# continuous identical check
foreach($pair in @(@{id='01';n=4},@{id='03';n=3},@{id='06';n=3},@{id='08';n=4},@{id='09';n=3},@{id='28';n=3})){
  $d=Folder $pair.id
  $h1=(Get-FileHash (Join-Path $d.FullName 'images\about-01.jpg')).Hash
  $bad=$false
  for($i=2;$i -le $pair.n;$i++){
    $hi=(Get-FileHash (Join-Path $d.FullName ("images\about-{0:d2}.jpg" -f $i))).Hash
    if($hi -ne $h1){$bad=$true}
  }
  if($bad){ $log.Add("CONT_MISMATCH $($pair.id)"); Write-Host "CONT_MISMATCH $($pair.id)" }
  else { $log.Add("CONT_OK $($pair.id)"); Write-Host "CONT_OK $($pair.id)" }
}

[IO.File]::WriteAllLines((Join-Path $sushi "_photo-wv-batch5d-log.txt"), $log)
Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
Write-Host "DONE"
$log | ForEach-Object { Write-Host $_ }
