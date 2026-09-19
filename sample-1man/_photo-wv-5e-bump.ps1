# bump cache-bust + alternate 04 about if same as hero
$ErrorActionPreference='Stop'
$sushi = Join-Path $PSScriptRoot 'sushi-samples'
$tmp = Join-Path $env:TEMP ('photo-bump-' + [guid]::NewGuid().ToString('n'))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
function Folder([string]$id){ Get-ChildItem $sushi -Directory | Where-Object Name -like ($id+'-*') | Select-Object -First 1 }
function Copy-Retry($s,$d){ for($i=1;$i -le 10;$i++){ try{[IO.File]::Copy($s,$d,$true);return}catch{Start-Sleep -Milliseconds (300*$i)} }; throw 'copy' }
function Bump([string]$id,[string[]]$files,[string]$stamp){
  $dir=Folder $id; $path=Join-Path $dir.FullName 'draft.json'
  $utf8=[Text.UTF8Encoding]::new($false)
  $t=[IO.File]::ReadAllText($path,$utf8); $name=$dir.Name
  $map=@{
    'hero.jpg'='hero_image';'about-01.jpg'='about_image_1';'about-02.jpg'='about_image_2'
    'about-03.jpg'='about_image_3';'work-01.jpg'='work_1_image';'work-02.jpg'='work_2_image';'work-03.jpg'='work_3_image'
  }
  foreach($f in $files){
    if(-not $map.ContainsKey($f)){continue}
    $key=$map[$f]; $val="sushi-samples/$name/images/$f`?v=$stamp"
    $pat='"'+[regex]::Escape($key)+'"\s*:\s*"[^"]*"'
    $rep='"'+$key+'":"'+$val+'"'
    if([regex]::IsMatch($t,$pat)){$t=[regex]::Replace($t,$pat,$rep,1)}
  }
  $t=[regex]::Replace($t,'"brushUpPhoto"\s*:\s*"[^"]*"','"brushUpPhoto":"2026-09-18-photo-wv-final"',1)
  $dt=Join-Path $tmp "d-$id.json"; [IO.File]::WriteAllText($dt,$t,$utf8); Copy-Retry $dt $path
}

# if 04 hero==about, copy work-02 (salon basins) to about-01 as distinct quieter plate
$d04=Folder '04'
$h=(Get-FileHash (Join-Path $d04.FullName 'images\hero.jpg')).Hash
$a=(Get-FileHash (Join-Path $d04.FullName 'images\about-01.jpg')).Hash
if($h -eq $a){
  Write-Host '04 hero==about -> about from work-02'
  Copy-Retry (Join-Path $d04.FullName 'images\work-02.jpg') (Join-Path $d04.FullName 'images\about-01.jpg')
}
Bump '04' @('hero.jpg','about-01.jpg') 'photo-wv-5e'
Bump '30' @('hero.jpg') 'photo-wv-5e'

# final hash audit
$ids=@('01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','18','19','21','23','26','28','29','30')
$known=@{ '01'=4;'03'=3;'06'=3;'08'=4;'09'=3;'28'=3 }
$map=@{}
foreach($id in $ids){
  $d=Folder $id; $contN=0; if($known.ContainsKey($id)){$contN=[int]$known[$id]}
  Get-ChildItem (Join-Path $d.FullName 'images') -File -EA SilentlyContinue |
    Where-Object { $_.Name -match '\.jpe?g$' -and $_.Name -notlike 'color-*' } |
    ForEach-Object {
      if($contN -gt 0 -and $_.Name -match '^about-0[2-9]'){return}
      $hh=(Get-FileHash $_.FullName).Hash
      if(-not $map.ContainsKey($hh)){$map[$hh]=New-Object System.Collections.Generic.List[string]}
      $map[$hh].Add("$id/$($_.Name)")
    }
}
$cross=@($map.GetEnumerator()|Where-Object{($_.Value|%{$_.Split('/')[0]}|Select -Unique).Count -gt 1})
Write-Host ("cross_groups="+$cross.Count)
foreach($c in $cross){ Write-Host ("CROSS "+($c.Value -join ' | ')) }
Remove-Item $tmp -Recurse -Force -EA SilentlyContinue
Write-Host DONE
