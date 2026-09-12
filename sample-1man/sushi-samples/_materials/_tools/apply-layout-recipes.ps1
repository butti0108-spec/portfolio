# Re-apply layout recipes with correct growDirs arrays (no nested arrays).
$ErrorActionPreference = "Stop"
$sushi = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function DirsJson([string]$recipe, [int]$n) {
  if ($n -le 1) { return "[]" }
  $list = New-Object System.Collections.Generic.List[string]
  switch ($recipe) {
    "R1" { 1..($n-1) | ForEach-Object { [void]$list.Add("down") } }
    "R2" {
      if ($n -eq 2) { [void]$list.Add("row") }
      elseif ($n -eq 3) { [void]$list.Add("row"); [void]$list.Add("down") }
      else { [void]$list.Add("row"); [void]$list.Add("down"); [void]$list.Add("row") }
    }
    "R3" {
      if ($n -eq 2) { [void]$list.Add("row") }
      elseif ($n -eq 3) { [void]$list.Add("row"); [void]$list.Add("down") }
      else { [void]$list.Add("row"); [void]$list.Add("down"); [void]$list.Add("down") }
    }
    "R4" {
      if ($n -eq 2) { [void]$list.Add("row") }
      elseif ($n -eq 3) { [void]$list.Add("row"); [void]$list.Add("down") }
      else { [void]$list.Add("row"); [void]$list.Add("down"); [void]$list.Add("row") }
    }
    "R5" {
      if ($n -eq 2) { [void]$list.Add("down") }
      elseif ($n -eq 3) { [void]$list.Add("down"); [void]$list.Add("row") }
      else { [void]$list.Add("down"); [void]$list.Add("row"); [void]$list.Add("down") }
    }
    "R6" { 1..($n-1) | ForEach-Object { [void]$list.Add("row") } }
    "R7" { 1..($n-1) | ForEach-Object { [void]$list.Add("down") } }
    "R8" { 1..($n-1) | ForEach-Object { [void]$list.Add("down") } }
  }
  $parts = $list | ForEach-Object { '"' + $_ + '"' }
  return ("[" + ($parts -join ",") + "]")
}

function GapOf([string]$recipe) {
  switch ($recipe) {
    "R1" { return "loose" }
    "R6" { return "tight" }
    "R7" { return "loose" }
    default { return "normal" }
  }
}

$map = @(
  @{ id = "01"; photo = "R7"; works = "R8"; pc = 1; wc = 1 },
  @{ id = "02"; photo = "R4"; works = "R6"; pc = 3; wc = 3 },
  @{ id = "03"; photo = "R3"; works = "R2"; pc = 2; wc = 2 },
  @{ id = "04"; photo = "R2"; works = "R2"; pc = 2; wc = 2 },
  @{ id = "05"; photo = "R7"; works = "R8"; pc = 1; wc = 1 },
  @{ id = "06"; photo = "R6"; works = "R4"; pc = 3; wc = 3 },
  @{ id = "07"; photo = "R5"; works = "R8"; pc = 2; wc = 2 },
  @{ id = "08"; photo = "R1"; works = "R8"; pc = 1; wc = 1 },
  @{ id = "09"; photo = "R4"; works = "R2"; pc = 3; wc = 3 },
  @{ id = "10"; photo = "R7"; works = "R8"; pc = 1; wc = 1 },
  @{ id = "11"; photo = "R2"; works = "R2"; pc = 2; wc = 2 },
  @{ id = "12"; photo = "R3"; works = "R2"; pc = 2; wc = 2 },
  @{ id = "13"; photo = "R6"; works = "R4"; pc = 3; wc = 3 },
  @{ id = "14"; photo = "R4"; works = "R7"; pc = 3; wc = 3 },
  @{ id = "15"; photo = "R2"; works = "R8"; pc = 2; wc = 2 },
  @{ id = "16"; photo = "R1"; works = "R8"; pc = 1; wc = 1 },
  @{ id = "17"; photo = "R3"; works = "R2"; pc = 2; wc = 2 },
  @{ id = "18"; photo = "R5"; works = "R4"; pc = 3; wc = 3 },
  @{ id = "19"; photo = "R2"; works = "R2"; pc = 2; wc = 2 },
  @{ id = "20"; photo = "R6"; works = "R6"; pc = 3; wc = 3 },
  @{ id = "21"; photo = "R7"; works = "R8"; pc = 1; wc = 1 },
  @{ id = "22"; photo = "R6"; works = "R4"; pc = 3; wc = 3 },
  @{ id = "23"; photo = "R2"; works = "R8"; pc = 2; wc = 2 },
  @{ id = "24"; photo = "R2"; works = "R2"; pc = 2; wc = 2 },
  @{ id = "25"; photo = "R7"; works = "R8"; pc = 1; wc = 1 },
  @{ id = "26"; photo = "R4"; works = "R6"; pc = 2; wc = 2 },
  @{ id = "27"; photo = "R5"; works = "R7"; pc = 3; wc = 3 },
  @{ id = "28"; photo = "R5"; works = "R7"; pc = 2; wc = 2 },
  @{ id = "29"; photo = "R7"; works = "R8"; pc = 1; wc = 1 },
  @{ id = "30"; photo = "R7"; works = "R8"; pc = 1; wc = 1 }
)

$ok = 0
foreach ($m in $map) {
  $folder = Get-ChildItem -Path $sushi -Directory | Where-Object { $_.Name -like ($m.id + "-*") } | Select-Object -First 1
  $path = Join-Path $folder.FullName "draft.json"
  $raw = [System.IO.File]::ReadAllText($path, [System.Text.UTF8Encoding]::new($false))

  # Update about-photos / works-list counts in draftCounts via regex-safe replace of known keys
  $raw = [regex]::Replace($raw, '("about-photos"\s*:\s*)\d+', ('${1}' + $m.pc))
  $raw = [regex]::Replace($raw, '("works-list"\s*:\s*)\d+', ('${1}' + $m.wc))

  $photoDirs = DirsJson $m.photo $m.pc
  $worksDirs = DirsJson $m.works $m.wc
  $photoGap = GapOf $m.photo
  $worksGap = GapOf $m.works

  $block = @"
    "itemLayouts": {
        "about-photos": {
            "growDirs": $photoDirs,
            "gap": "$photoGap",
            "recipe": "$($m.photo)"
        },
        "works-list": {
            "growDirs": $worksDirs,
            "gap": "$worksGap",
            "recipe": "$($m.works)"
        }
    },
    "layoutRecipeNote": "photo=$($m.photo) works=$($m.works)"
}
"@

  if ($raw -match '"itemLayouts"') {
    $raw = [regex]::Replace($raw, '(?s),\s*"itemLayouts"\s*:.*$', "")
    $raw = $raw.TrimEnd()
    if ($raw.EndsWith("}")) { $raw = $raw.Substring(0, $raw.Length - 1).TrimEnd().TrimEnd(",") }
    $raw = $raw + ",`r`n" + $block
  } else {
    $raw = $raw.TrimEnd()
    if ($raw.EndsWith("}")) { $raw = $raw.Substring(0, $raw.Length - 1).TrimEnd().TrimEnd(",") }
    $raw = $raw + ",`r`n" + $block
  }

  [System.IO.File]::WriteAllText($path, $raw, [System.Text.UTF8Encoding]::new($false))
  Write-Host ("OK " + $m.id + " photoDirs=" + $photoDirs + " worksDirs=" + $worksDirs)
  $ok++
}
Write-Host ("DONE " + $ok)
