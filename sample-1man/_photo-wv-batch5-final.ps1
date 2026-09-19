# photo-wv-5: final worldview fill for remaining first-team gaps
# Keep grammar / color-insert / continuous Sync-Cont / brushUpCopy
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$stamp = "photo-wv-5"
$ua = "kuru-portfolio-photo-wv/1.0"
$tmpRoot = Join-Path $env:TEMP ("photo-wv-5-" + [guid]::NewGuid().ToString("n"))
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
      if ($w -lt 500 -or $h -lt 350) { return $false }
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
function Get-Urls([string]$q) {
  $uri = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=20"
  $r = Invoke-RestMethod -Uri $uri -TimeoutSec 45 -Headers @{ "User-Agent" = $ua }
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($item in @($r.results)) {
    if (-not $item.url) { continue }
    if ($item.url -match 'wikimedia|\.png') { continue }
    if ($item.width -lt 700 -or $item.height -lt 500) { continue }
    if (-not $used.Add([string]$item.url)) { continue }
    $list.Add([string]$item.url)
    if ($list.Count -ge 12) { break }
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
    $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-18-photo-wv-5"', 1)
  } else {
    $t = [regex]::Replace($t, '("version"\s*:\s*\d+,)', '${1}"brushUpPhoto":"2026-09-18-photo-wv-5",', 1)
  }
  $dt = Join-Path $tmpRoot "draft-$id.json"
  [IO.File]::WriteAllText($dt, $t, $utf8)
  Copy-Retry $dt $path
  $null = $t | ConvertFrom-Json
}
function Fill-Site($spec) {
  $id = [string]$spec.id; $cont = [int]$spec.cont
  $dir = Folder $id; $imgDir = Join-Path $dir.FullName "images"
  $touched = New-Object System.Collections.Generic.List[string]
  $sources = New-Object System.Collections.Generic.List[string]
  $sources.Add("# photo-wv-5 — $id"); $sources.Add("")
  $sources.Add("| file | query | url |"); $sources.Add("|------|-------|-----|")
  foreach ($slot in $spec.slots) {
    $file = [string]$slot.file; $got = $false
    foreach ($q in @($slot.q)) {
      Write-Host "SEARCH $id/$file <= $q"
      try { $urls = @(Get-Urls $q) } catch { Write-Host " search-fail $($_.Exception.Message)"; continue }
      foreach ($url in $urls) {
        $dl = Join-Path $tmpRoot ("$id-$file".Replace('.','-') + ".jpg")
        try {
          Write-Host "  GET $url"
          Invoke-WebRequest -Uri $url -OutFile $dl -UseBasicParsing -TimeoutSec 60 -Headers @{ "User-Agent" = $ua }
          if ((Get-Item $dl).Length -lt 15000) { throw "tiny" }
          if (-not (Test-Ok $dl)) { throw "reject" }
          $dest = Join-Path $imgDir $file
          Copy-Retry $dl $dest
          $touched.Add($file)
          $sources.Add("| $file | $q | $url |")
          $got = $true; break
        } catch {
          Write-Host "  skip $($_.Exception.Message)"
          [void]$used.Remove($url)
        }
      }
      if ($got) { break }
    }
    if (-not $got) { $log.Add("FAIL $id/$file"); Write-Host "FAIL $id/$file" }
  }
  if ($cont -gt 0 -and (Test-Path (Join-Path $imgDir "about-01.jpg"))) {
    $bytes = [IO.File]::ReadAllBytes((Join-Path $imgDir "about-01.jpg"))
    Sync-Cont $dir.FullName $cont $bytes
    for ($k = 2; $k -le $cont; $k++) { $touched.Add(("about-{0:d2}.jpg" -f $k)) }
  }
  if ($touched.Count -gt 0) { Bump $id ($touched.ToArray()) }
  [IO.File]::WriteAllLines((Join-Path $dir.FullName "SOURCES-photo-wv.md"), $sources, [Text.UTF8Encoding]::new($false))
  $log.Add("done $id touched=$($touched.Count)")
}

# Remove leftover tmp from earlier 09 attempt
$d09 = Folder "09"
if ($d09) {
  Get-ChildItem (Join-Path $d09.FullName "images") -Filter "*.tmp.bin" -EA SilentlyContinue | Remove-Item -Force -EA SilentlyContinue
}

$jobs = @(
  @{ id="05"; cont=0; slots=@(
    @{file="hero.jpg"; q=@("pastel macarons soft light","patisserie pastry display pastel","cream cake afternoon cafe")}
    @{file="about-01.jpg"; q=@("confectionery display case","bakery sweets pastel pink cream","dessert counter soft light")}
    @{file="about-02.jpg"; q=@("handmade cookies pastel","macaron tower soft colors","cupcake pastel bakery")}
    @{file="work-01.jpg"; q=@("slice of cake cream","fruit tart pastel","shortcake japanese cafe")}
    @{file="work-02.jpg"; q=@("packaged sweets gift box","pastry box ribbon soft","dessert takeaway box")}
    @{file="work-03.jpg"; q=@("tea and pastry afternoon","latte and cake soft light","cafe dessert plate")}
  )}
  @{ id="14"; cont=0; slots=@(
    @{file="hero.jpg"; q=@("white wall art gallery minimal","contemporary gallery white cube","museum white wall painting")}
    @{file="about-01.jpg"; q=@("framed paintings white gallery","art exhibition white wall","minimal gallery interior")}
    @{file="about-02.jpg"; q=@("gallery hallway white walls","art museum empty white room","white cube gallery space")}
    @{file="about-03.jpg"; q=@("sculpture white gallery room","modern art white wall","gallery pedestal artwork")}
    @{file="work-01.jpg"; q=@("abstract painting framed wall","canvas on white wall","gallery artwork close")}
    @{file="work-02.jpg"; q=@("photo print white gallery","framed photograph exhibition","gallery hanging system")}
    @{file="work-03.jpg"; q=@("gallery visitor white room","art gallery natural light","minimal art space")}
  )}
  @{ id="18"; cont=0; slots=@(
    @{file="hero.jpg"; q=@("photography studio white backdrop","photo studio softbox seamless white","empty photo studio white cyclorama")}
    @{file="about-01.jpg"; q=@("portrait studio soft light","photo studio softbox portrait setup","white seamless photography studio")}
    @{file="about-02.jpg"; q=@("camera tripod studio white","photography lighting softbox","studio flash soft light")}
    @{file="about-03.jpg"; q=@("minimal portrait white background","studio portrait soft light","clean portrait photography")}
    @{file="work-01.jpg"; q=@("family portrait studio white","studio portrait soft light people","portrait photography studio")}
    @{file="work-02.jpg"; q=@("professional headshot studio","business portrait white backdrop","studio portrait soft")}
    @{file="work-03.jpg"; q=@("studio backdrop white paper","photography paper roll white","empty seamless backdrop")}
  )}
  @{ id="26"; cont=0; slots=@(
    @{file="hero.jpg"; q=@("black and white monochrome portrait studio","high contrast monochrome photography","ink black white portrait")}
    @{file="about-01.jpg"; q=@("monochrome still life photography","black white photography studio","high contrast black white")}
    @{file="about-02.jpg"; q=@("black white film photography darkroom","monochrome camera photography","bw photography equipment")}
    @{file="work-01.jpg"; q=@("monochrome portrait face light shadow","black white portrait contrast","studio bw portrait")}
    @{file="work-02.jpg"; q=@("black white architecture shadow","monochrome geometric light shadow","bw light shadow")}
    @{file="work-03.jpg"; q=@("monochrome still life objects","black white minimal still life","bw photography still")}
  )}
  @{ id="30"; cont=0; slots=@(
    @{file="hero.jpg"; q=@("art gallery picture frame spot light","framed painting gallery dim light","gallery frame warm spotlight")}
    @{file="about-01.jpg"; q=@("framed art on dark wall gallery","picture frame museum lighting","oil painting framed gallery")}
    @{file="about-02.jpg"; q=@("small art gallery evening light","gallery corridor framed works","art frames on wall lit")}
    @{file="work-01.jpg"; q=@("ornate picture frame close","gilded frame artwork detail","frame and canvas closeup")}
    @{file="work-02.jpg"; q=@("gallery wall hanging lights","track lighting art gallery","spotlight on painting")}
    @{file="work-03.jpg"; q=@("quiet gallery room evening","small exhibition room frames","intimate art gallery space")}
  )}
  @{ id="09"; cont=3; slots=@(
    @{file="hero.jpg"; q=@("yoga studio wooden floor sunlight","yoga mat sunlight window floor","empty yoga room morning light")}
    @{file="about-01.jpg"; q=@("yoga class natural light floor","person yoga stretch wood floor sun","yoga breathing studio light")}
    @{file="work-01.jpg"; q=@("yoga mats rolled studio","yoga props blocks straps calm","meditation cushion studio")}
    @{file="work-02.jpg"; q=@("sunlight on wooden floor indoor","window light hardwood floor","morning light floor boards")}
    @{file="work-03.jpg"; q=@("calm yoga studio plants","yoga room plants natural light","peaceful exercise studio")}
  )}
  @{ id="08"; cont=4; slots=@(
    @{file="hero.jpg"; q=@("japanese ryokan guest room tatami","inn room shoji window sunlight","tatami room morning light")}
    @{file="about-01.jpg"; q=@("ryokan room window light futon","japanese guest room sunlight","shoji screen morning light")}
    @{file="work-01.jpg"; q=@("japanese breakfast tray ryokan","traditional japanese meal tray","ryokan breakfast set")}
    @{file="work-02.jpg"; q=@("ryokan garden view window","japanese garden from room","inn courtyard greenery")}
    @{file="work-03.jpg"; q=@("futon bedding japanese room","tatami futon neatly made","japanese inn bedding")}
  )}
  @{ id="01"; cont=4; slots=@(
    @{file="hero.jpg"; q=@("cafe morning sunlight wooden interior","coffee cup wood table morning light","cafe window seat sunlight")}
    @{file="about-01.jpg"; q=@("dappled sunlight through trees cafe","cafe wood interior morning light","coffee shop natural light wood")}
    @{file="work-01.jpg"; q=@("latte art wooden table morning","coffee cup saucer cafe","pour over coffee morning")}
    @{file="work-02.jpg"; q=@("pastry and coffee cafe table","croissant coffee morning cafe","cafe breakfast plate")}
    @{file="work-03.jpg"; q=@("empty cafe chairs morning light","quiet coffee shop interior wood","cafe booth window light")}
  )}
  @{ id="03"; cont=3; slots=@(
    @{file="hero.jpg"; q=@("dark cocktail bar counter night","whiskey glass ice bar counter","moody bar glass reflection")}
    @{file="about-01.jpg"; q=@("cocktail glass ice close dark","bar counter bottles night","dim lit cocktail bar")}
    @{file="work-01.jpg"; q=@("neat whiskey pour bar","cocktail being stirred bar","bartender hands cocktail dark")}
    @{file="work-02.jpg"; q=@("bar stools empty night","dark wood bar interior","speakeasy bar counter")}
    @{file="work-03.jpg"; q=@("ice cubes cocktail glass","crystal glass bar drink","gin tonic ice close")}
  )}
  @{ id="04"; cont=0; slots=@(
    @{file="hero.jpg"; q=@("bright white hair salon interior","modern hair salon white light","hair salon mirror white room")}
    @{file="about-01.jpg"; q=@("hair salon chair white interior","salon mirror station bright","quiet hair salon white walls")}
    @{file="about-02.jpg"; q=@("hair stylist cutting white salon","haircut consultation salon bright","salon scissors comb white")}
    @{file="work-01.jpg"; q=@("healthy hair texture close soft light","shiny hair closeup salon","hair strands soft light")}
    @{file="work-02.jpg"; q=@("salon wash basin white clean","hair washing sink salon","shampoo bowl salon white")}
    @{file="work-03.jpg"; q=@("hair salon tools tidy white","comb scissors brush salon","clean salon tools tray")}
  )}
  @{ id="23"; cont=0; slots=@(
    @{file="hero.jpg"; q=@("coworking shared desk people","open office communal table laptop","coworking space wooden table")}
    @{file="about-01.jpg"; q=@("shared workspace natural light","coworking desks side by side","collaborative office table")}
    @{file="about-02.jpg"; q=@("laptop coffee coworking desk","people working shared table","open plan office calm")}
    @{file="work-01.jpg"; q=@("meeting booth coworking","small meeting table office","coworking lounge chairs")}
    @{file="work-02.jpg"; q=@("wooden desk laptop notebook","work desk natural light plant","shared desk setup")}
    @{file="work-03.jpg"; q=@("coworking kitchenette coffee","office coffee corner shared","break area coworking")}
  )}
)

foreach ($job in $jobs) { Fill-Site $job }

# hash check first-team only
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
foreach ($c in $cross) { Write-Host ("CROSS " + ($c.Value -join ' | ')); $log.Add("CROSS " + ($c.Value -join ' | ')) }

[IO.File]::WriteAllLines((Join-Path $sushi "_photo-wv-batch5-log.txt"), $log)
Remove-Item $tmpRoot -Recurse -Force -EA SilentlyContinue
Write-Host "DONE"
$log | ForEach-Object { Write-Host $_ }
