# photo-wv-4: remaining oudo sites via Openverse + %TEMP% copies
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$stamp = "photo-wv-4"
$ua = "kuru-portfolio-photo-wv/1.0"
$tmpRoot = Join-Path $env:TEMP ("photo-wv-4-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$log = New-Object System.Collections.Generic.List[string]
$used = New-Object "System.Collections.Generic.HashSet[string]"
Get-ChildItem $sushi -Recurse -Filter "SOURCES-photo-wv.md" -EA SilentlyContinue | % {
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
function Copy-Retry([string]$src,[string]$dest){
  for($a=1;$a -le 12;$a++){
    try { [IO.File]::Copy($src,$dest,$true); return } catch { Start-Sleep -Milliseconds (350*$a) }
  }
  throw "copy-fail $dest"
}
function Get-Urls([string]$q){
  $uri="https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=20"
  $r=Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{"User-Agent"=$ua}
  $list=New-Object System.Collections.Generic.List[string]
  foreach($item in @($r.results)){
    if(-not $item.url){continue}
    if($item.url -match 'wikimedia|\.png'){continue}
    if($item.width -lt 700 -or $item.height -lt 500){continue}
    if(-not $used.Add([string]$item.url)){continue}
    $list.Add([string]$item.url)
    if($list.Count -ge 10){break}
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
  if($t -match '"brushUpPhoto"'){ $t=[regex]::Replace($t,'"brushUpPhoto"\s*:\s*"[^"]*"','"brushUpPhoto":"2026-09-17-photo-wv-4"',1) }
  else { $t=[regex]::Replace($t,'("version"\s*:\s*\d+,)','${1}"brushUpPhoto":"2026-09-17-photo-wv-4",',1) }
  $dt=Join-Path $tmpRoot "draft-$id.json"
  [IO.File]::WriteAllText($dt,$t,$utf8)
  Copy-Retry $dt $path
  $null=$t|ConvertFrom-Json
}
function Fill-Site($spec){
  $id=[string]$spec.id; $cont=[int]$spec.cont
  $dir=Folder $id; $imgDir=Join-Path $dir.FullName "images"
  $touched=New-Object System.Collections.Generic.List[string]
  $sources=New-Object System.Collections.Generic.List[string]
  $sources.Add("# photo-wv-4 — $id"); $sources.Add(""); $sources.Add("| file | query | url |"); $sources.Add("|------|-------|-----|")
  foreach($slot in $spec.slots){
    $file=[string]$slot.file; $got=$false
    foreach($q in @($slot.q)){
      Write-Host "SEARCH $id/$file <= $q"
      try { $urls=@(Get-Urls $q) } catch { Write-Host " search-fail $($_.Exception.Message)"; continue }
      foreach($url in $urls){
        $dl=Join-Path $tmpRoot ("$id-$file".Replace('.','-') + ".jpg")
        try{
          Write-Host "  GET $url"
          Invoke-WebRequest -Uri $url -OutFile $dl -UseBasicParsing -TimeoutSec 60 -Headers @{"User-Agent"=$ua}
          if((Get-Item $dl).Length -lt 15000){throw "tiny"}
          if(-not (Test-Ok $dl)){throw "reject"}
          $dest=Join-Path $imgDir $file
          Copy-Retry $dl $dest
          $touched.Add($file)
          $sources.Add("| $file | $q | $url |")
          $got=$true; break
        } catch {
          Write-Host "  skip $($_.Exception.Message)"
          [void]$used.Remove($url)
        }
      }
      if($got){break}
    }
    if(-not $got){ $log.Add("FAIL $id/$file"); Write-Host "FAIL $id/$file" }
  }
  if($cont -gt 0 -and (Test-Path (Join-Path $imgDir "about-01.jpg"))){
    $bytes=[IO.File]::ReadAllBytes((Join-Path $imgDir "about-01.jpg"))
    Sync-Cont $dir.FullName $cont $bytes
    for($k=2;$k -le $cont;$k++){ $touched.Add(("about-{0:d2}.jpg" -f $k)) }
  }
  if($touched.Count -gt 0){ Bump $id ($touched.ToArray()) }
  [IO.File]::WriteAllLines((Join-Path $dir.FullName "SOURCES-photo-wv.md"), $sources, [Text.UTF8Encoding]::new($false))
  $log.Add("done $id touched=$($touched.Count)")
}

# Remaining / quality-focused oudo sites (grammar untouched)
$jobs=@(
  @{ id="02"; cont=0; slots=@(
    @{file="hero.jpg"; q=@("flower shop storefront","florist shop front flowers")}
    @{file="about-01.jpg"; q=@("florist arranging flowers","flower market stall")}
    @{file="about-02.jpg"; q=@("bouquet wrap paper","cut flowers buckets")}
    @{file="work-01.jpg"; q=@("seasonal flower bouquet","tulips roses display")}
    @{file="work-02.jpg"; q=@("flower shop interior","green plants florist")}
    @{file="work-03.jpg"; q=@("hand holding bouquet","fresh flowers close")}
  )}
  @{ id="07"; cont=0; slots=@(
    @{file="hero.jpg"; q=@("japanese ramen bowl steam","donburi bowl japanese food")}
    @{file="about-01.jpg"; q=@("noodle soup bowl close","soy sauce ramen")}
    @{file="about-02.jpg"; q=@("chopsticks noodles","ramen toppings egg")}
    @{file="work-01.jpg"; q=@("gyoza plate japanese","side dish izakaya")}
    @{file="work-02.jpg"; q=@("hot noodle broth steam","japanese soup bowl")}
    @{file="work-03.jpg"; q=@("noren curtain shop","japanese restaurant entrance")}
  )}
  @{ id="29"; cont=0; slots=@(
    @{file="hero.jpg"; q=@("wrapping flower bouquet hands","florist tying bouquet")}
    @{file="about-01.jpg"; q=@("flower stems on table","florist workspace")}
    @{file="about-02.jpg"; q=@("wrapped bouquet takeaway","brown paper flowers")}
    @{file="work-01.jpg"; q=@("local flower shop counter","small florist shop")}
    @{file="work-02.jpg"; q=@("mixed wildflower bouquet","garden flowers bunch")}
    @{file="work-03.jpg"; q=@("scissors florist ribbon","flower arranging tools")}
  )}
  @{ id="12"; cont=0; slots=@(
    @{file="hero.jpg"; q=@("dog walking leash park","pet dog outdoor walk")}
    @{file="about-01.jpg"; q=@("happy dog portrait","pet care dog")}
    @{file="about-02.jpg"; q=@("cat soft indoor","pet cat home")}
    @{file="work-01.jpg"; q=@("dog grooming brush","pet salon dog")}
    @{file="work-02.jpg"; q=@("dog leash park green","walking dog path")}
    @{file="work-03.jpg"; q=@("pet food bowl cute","dog toys basket")}
  )}
  @{ id="13"; cont=0; slots=@(
    @{file="hero.jpg"; q=@("coworking desk plant","office desk green plant")}
    @{file="about-01.jpg"; q=@("shared office workspace","laptop desk natural light")}
    @{file="about-02.jpg"; q=@("meeting table coworking","open office chairs")}
    @{file="work-01.jpg"; q=@("desk plant leaf close","indoor plant office")}
    @{file="work-02.jpg"; q=@("coffee cup coworking","laptop cafe work")}
    @{file="work-03.jpg"; q=@("bookshelf office calm","quiet work corner")}
  )}
  @{ id="09"; cont=3; slots=@(
    @{file="about-01.jpg"; q=@("yoga mat on wooden floor sun","person stretching wood floor sunlight")}
  )}
)

foreach($job in $jobs){ Fill-Site $job }

# hash check
$map=@{}; $known=@{ "01"=4;"03"=3;"06"=3;"08"=4;"09"=3;"28"=3 }
Get-ChildItem $sushi -Directory | ? { $_.Name -match '^\d{2}-' } | % {
  $id=$_.Name.Substring(0,2); $contN=0; if($known.ContainsKey($id)){$contN=[int]$known[$id]}
  Get-ChildItem (Join-Path $_.FullName 'images') -File -EA SilentlyContinue | ? { $_.Name -match '\.jpe?g$' -and $_.Name -notlike 'color-*' } | % {
    if($contN -gt 0 -and $_.Name -match '^about-0[2-9]'){return}
    $h=(Get-FileHash $_.FullName).Hash
    if(-not $map.ContainsKey($h)){$map[$h]=New-Object System.Collections.Generic.List[string]}
    $map[$h].Add("$id/$($_.Name)")
  }
}
$cross=@($map.GetEnumerator()|?{($_.Value|%{$_.Split('/')[0]}|Select -Unique).Count -gt 1})
Write-Host ("cross_groups="+$cross.Count)
[IO.File]::WriteAllLines((Join-Path $sushi "_photo-wv-batch4-log.txt"), $log)
Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
Write-Host "DONE"
$log | % { Write-Host $_ }
