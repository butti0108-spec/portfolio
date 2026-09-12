# Repair growDirs + break last recipe-pair dupes
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding $false
$sushi = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))

function MakeDirs([string]$recipe,[int]$n){
  $arr = New-Object System.Collections.Generic.List[string]
  if ($n -le 1) { return @() }
  switch ($recipe) {
    "R6" { 1..($n-1)|%{ [void]$arr.Add("row") } }
    "R8" { 1..($n-1)|%{ [void]$arr.Add("down") } }
    "R2" {
      if ($n -eq 2){[void]$arr.Add("row")} elseif ($n -eq 3){[void]$arr.Add("row");[void]$arr.Add("down")} else {[void]$arr.Add("row");[void]$arr.Add("down");[void]$arr.Add("row")}
    }
    "R3" {
      if ($n -eq 2){[void]$arr.Add("row")} elseif ($n -eq 3){[void]$arr.Add("row");[void]$arr.Add("down")} else {[void]$arr.Add("row");[void]$arr.Add("down");[void]$arr.Add("down")}
    }
    "R4" {
      if ($n -eq 2){[void]$arr.Add("row")} elseif ($n -eq 3){[void]$arr.Add("row");[void]$arr.Add("down")} else {[void]$arr.Add("row");[void]$arr.Add("down");[void]$arr.Add("row")}
    }
    "R5" {
      if ($n -eq 2){[void]$arr.Add("down")} elseif ($n -eq 3){[void]$arr.Add("down");[void]$arr.Add("row")} else {[void]$arr.Add("down");[void]$arr.Add("row");[void]$arr.Add("down")}
    }
    default { 1..($n-1)|%{ [void]$arr.Add("down") } }
  }
  return @($arr.ToArray())
}
function GapOf($r){ if ($r -in @("R6","R4","R2","R8")){"tight"} else {"normal"} }

$plan = @{
  "07-bakery-cafe-c" = @{ pr="R8"; wr="R4" }
  "15-ramen-ink-a" = @{ pr="R8"; wr="R2" }
  "20-pet-cafe-b" = @{ pr="R4"; wr="R8" }
  "22-cowork-clinic-b" = @{ pr="R8"; wr="R3" }
  "23-cowork-green-a" = @{ pr="R2"; wr="R8" }
  "24-sweets-sakura-c" = @{ pr="R8"; wr="R5" }
  "27-izakaya-ink-b" = @{ pr="R4"; wr="R8" }
  "18-studio-clinic-c" = @{ pr="R5"; wr="R4" }
}

foreach ($folder in $plan.Keys) {
  $path = Join-Path $sushi (Join-Path $folder "draft.json")
  $j = [IO.File]::ReadAllText($path,$utf8) | ConvertFrom-Json
  $pr = $plan[$folder].pr; $wr = $plan[$folder].wr
  $pc = [int]$j.draftCounts."about-photos"; $wc = [int]$j.draftCounts."works-list"
  $pd = MakeDirs $pr $pc; $wd = MakeDirs $wr $wc
  $j.itemLayouts = [pscustomobject]@{
    "about-photos" = [pscustomobject]@{ growDirs = $pd; gap = (GapOf $pr); recipe = $pr }
    "works-list" = [pscustomobject]@{ growDirs = $wd; gap = (GapOf $wr); recipe = $wr }
  }
  $j.layoutRecipeNote = "photo=$pr works=$wr dense=3 uniq=3"
  [IO.File]::WriteAllText($path, ($j | ConvertTo-Json -Depth 30), $utf8)
  Write-Host ("REPAIR {0} p={1}[{2}] w={3}[{4}]" -f $folder.Substring(0,2), $pr, ($pd -join ","), $wr, ($wd -join ","))
}
