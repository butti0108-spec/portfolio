# Cross-site JPEG hash audit + continuous identical-byte check
$ErrorActionPreference = "Stop"
$sushi = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "sushi-samples"
$cont = @{ "01"=4; "03"=3; "06"=3; "08"=4; "09"=3; "28"=3 }
$map = @{}

Get-ChildItem $sushi -Directory | Where-Object { $_.Name -match "^\d{2}-" } | ForEach-Object {
  $id = $_.Name.Substring(0, 2)
  $imgDir = Join-Path $_.FullName "images"
  if (-not (Test-Path $imgDir)) { return }
  Get-ChildItem $imgDir -File | Where-Object { $_.Name -match "\.jpe?g$" -and $_.Name -notlike "color-*" } | ForEach-Object {
    if ($cont.ContainsKey($id) -and $_.Name -match "^about-0[2-9]") { return }
    $h = (Get-FileHash $_.FullName).Hash
    if (-not $map.ContainsKey($h)) { $map[$h] = New-Object System.Collections.Generic.List[string] }
    $map[$h].Add("$id/$($_.Name)")
  }
}

$cross = @($map.GetEnumerator() | Where-Object {
  ($_.Value | ForEach-Object { $_.Split("/")[0] } | Select-Object -Unique).Count -gt 1
})
Write-Host ("cross_groups=" + $cross.Count)
$cross | ForEach-Object { Write-Host ($_.Value -join " | ") }

Write-Host "--- continuous identical check ---"
foreach ($key in @($cont.Keys | Sort-Object)) {
  $dir = Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$key-*" } | Select-Object -First 1
  $a1 = Join-Path $dir.FullName "images\about-01.jpg"
  $h1 = (Get-FileHash $a1).Hash
  $ok = $true
  for ($i = 2; $i -le [int]$cont[$key]; $i++) {
    $p = Join-Path $dir.FullName ("images\about-{0:d2}.jpg" -f $i)
    if (-not (Test-Path $p)) { $ok = $false; Write-Host "$key missing about-$i"; continue }
    if ((Get-FileHash $p).Hash -ne $h1) { $ok = $false; Write-Host ("$key about-{0:d2} DIFFERS" -f $i) }
  }
  if ($ok) { Write-Host "$key cont OK n=$($cont[$key])" }
}
