$ErrorActionPreference = 'Stop'
$sushi = Join-Path $PSScriptRoot 'sushi-samples'
$ids = @('01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','18','19','21','23','26','28','29','30')
$rows = New-Object System.Collections.Generic.List[string]
foreach ($id in $ids) {
  $d = Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -like ($id + '-*') } | Select-Object -First 1
  $t = Get-Content -LiteralPath (Join-Path $d.FullName 'draft.json') -Raw -Encoding UTF8
  $vs = [regex]::Matches($t, 'photo-wv-[a-z0-9]+') | ForEach-Object { $_.Value } | Sort-Object -Unique
  if (-not $vs) { $vs = @('NONE') }
  $src = Test-Path (Join-Path $d.FullName 'SOURCES-photo-wv.md')
  $imgs = @(Get-ChildItem (Join-Path $d.FullName 'images') -File -EA SilentlyContinue | Where-Object { $_.Extension -match 'jpe?g|png' })
  $hero = Join-Path $d.FullName 'images\hero.jpg'
  $hs = if (Test-Path $hero) { (Get-Item $hero).Length } else { 0 }
  $rows.Add(("$id | $($d.Name) | src=$src | v=$($vs -join ',') | nImg=$($imgs.Count) | heroBytes=$hs"))
}
$rows | ForEach-Object { $_ }

# cross-hash among first team (exclude continuous about-02+)
$known = @{ '01'=4; '03'=3; '06'=3; '08'=4; '09'=3; '28'=3 }
$map = @{}
foreach ($id in $ids) {
  $d = Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -like ($id + '-*') } | Select-Object -First 1
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
Write-Output ("cross_groups=" + $cross.Count)
$cross | Select-Object -First 20 | ForEach-Object { Write-Output ("CROSS " + ($_.Value -join ' | ')) }
