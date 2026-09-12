# Force layout A + convert itemLayouts to sizes (L/H). ASCII-only script.
$ErrorActionPreference = "Stop"
$sushi = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Fix-OrphanTrailingH([object]$sizesObj) {
  $sizes = @($sizesObj)
  if ($sizes.Count -eq 0) { return @() }
  $out = New-Object System.Collections.Generic.List[string]
  foreach ($s in $sizes) {
    if ($s -eq "H") { [void]$out.Add("H") } else { [void]$out.Add("L") }
  }
  $pending = 0
  foreach ($sz in $out) {
    if ($sz -eq "L") { $pending = 0 }
    elseif ($pending -eq 1) { $pending = 0 }
    else { $pending = 1 }
  }
  if ($pending -eq 1 -and $out[$out.Count - 1] -eq "H") {
    $out[$out.Count - 1] = "L"
  }
  return @($out.ToArray())
}

function Sizes-Of([string]$pat, [int]$n) {
  if ($n -le 0) { return @() }
  if ($n -eq 1) { return @("L") }
  $list = New-Object System.Collections.Generic.List[string]
  switch ($pat) {
    "S1" {
      1..$n | ForEach-Object { [void]$list.Add("L") }
    }
    "S2" {
      [void]$list.Add("H"); [void]$list.Add("H")
      while ($list.Count -lt $n) { [void]$list.Add("L") }
    }
    "S3" {
      [void]$list.Add("L")
      while ($list.Count -lt $n) { [void]$list.Add("H") }
    }
    "S4" {
      # Prefer half slots; orphan trailing H becomes L
      1..$n | ForEach-Object { [void]$list.Add("H") }
    }
    "S5" {
      # n=3: LHH (LL+H would orphan to LLL). n=4+: LL then HH...
      if ($n -eq 3) {
        [void]$list.Add("L"); [void]$list.Add("H"); [void]$list.Add("H")
      } else {
        [void]$list.Add("L")
        if ($n -ge 2) { [void]$list.Add("L") }
        while ($list.Count -lt $n) { [void]$list.Add("H") }
      }
    }
    "S6" {
      if ($n -eq 2) {
        [void]$list.Add("H"); [void]$list.Add("H")
      } elseif ($n -eq 3) {
        [void]$list.Add("L"); [void]$list.Add("H"); [void]$list.Add("H")
      } else {
        [void]$list.Add("L"); [void]$list.Add("H"); [void]$list.Add("H"); [void]$list.Add("L")
        while ($list.Count -lt $n) { [void]$list.Add("L") }
      }
    }
    default {
      1..$n | ForEach-Object { [void]$list.Add("L") }
    }
  }
  while ($list.Count -lt $n) { [void]$list.Add("L") }
  while ($list.Count -gt $n) { $list.RemoveAt($list.Count - 1) }
  return @(Fix-OrphanTrailingH @($list.ToArray()))
}

function Gap-Of([string]$pat) {
  switch ($pat) {
    "S1" { return "loose" }
    "S4" { return "tight" }
    "S5" { return "loose" }
    default { return "normal" }
  }
}

$map = @(
  @{ id="01"; photo="S6"; works="S4" },
  @{ id="02"; photo="S3"; works="S2" },
  @{ id="03"; photo="S1"; works="S2" },
  @{ id="04"; photo="S2"; works="S1" },
  @{ id="05"; photo="S6"; works="S2" },
  @{ id="06"; photo="S5"; works="S6" },
  @{ id="07"; photo="S3"; works="S5" },
  @{ id="08"; photo="S2"; works="S6" },
  @{ id="09"; photo="S4"; works="S1" },
  @{ id="10"; photo="S2"; works="S3" },
  @{ id="11"; photo="S6"; works="S2" },
  @{ id="12"; photo="S1"; works="S4" },
  @{ id="13"; photo="S2"; works="S5" },
  @{ id="14"; photo="S3"; works="S2" },
  @{ id="15"; photo="S6"; works="S1" },
  @{ id="16"; photo="S2"; works="S3" },
  @{ id="17"; photo="S5"; works="S6" },
  @{ id="18"; photo="S3"; works="S5" },
  @{ id="19"; photo="S6"; works="S2" },
  @{ id="20"; photo="S4"; works="S2" },
  @{ id="21"; photo="S1"; works="S1" },
  @{ id="22"; photo="S3"; works="S6" },
  @{ id="23"; photo="S2"; works="S3" },
  @{ id="24"; photo="S6"; works="S2" },
  @{ id="25"; photo="S5"; works="S5" },
  @{ id="26"; photo="S2"; works="S4" },
  @{ id="27"; photo="S4"; works="S3" },
  @{ id="28"; photo="S1"; works="S6" },
  @{ id="29"; photo="S6"; works="S1" },
  @{ id="30"; photo="S1"; works="S1" }
)

$ok = 0
$dirs = Get-ChildItem -Directory $sushi | Where-Object { $_.Name -match '^\d{2}-' }
foreach ($row in $map) {
  $dir = $dirs | Where-Object { $_.Name.StartsWith($row.id + "-") } | Select-Object -First 1
  if (-not $dir) { Write-Host "MISS $($row.id)"; continue }
  $path = Join-Path $dir.FullName "draft.json"
  $j = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json

  $pc = [int]$j.draftCounts.'about-photos'
  $wc = [int]$j.draftCounts.'works-list'
  if ($pc -lt 1) { $pc = 1 }
  if ($wc -lt 1) { $wc = 1 }

  $ps = @(Sizes-Of $row.photo $pc)
  $ws = @(Sizes-Of $row.works $wc)

  $j.layoutPattern = "a"
  $j.layoutSelected = $true

  $j.itemLayouts = [pscustomobject]@{
    'about-photos' = [pscustomobject]@{
      sizes   = @($ps)
      gap     = (Gap-Of $row.photo)
      sizePat = $row.photo
    }
    'works-list' = [pscustomobject]@{
      sizes   = @($ws)
      gap     = (Gap-Of $row.works)
      sizePat = $row.works
    }
  }
  $j.layoutRecipeNote = ("a photo={0} works={1} sizes=1" -f $row.photo, $row.works)

  $json = $j | ConvertTo-Json -Depth 30
  [System.IO.File]::WriteAllText($path, $json, [System.Text.UTF8Encoding]::new($false))
  $ok++
  Write-Host ("OK {0} a photo={1}[{2}] works={3}[{4}]" -f $row.id, $row.photo, ($ps -join ""), $row.works, ($ws -join ""))
}

Write-Host "DONE $ok / $($map.Count)"
