# Quick fix remaining recipe-pair collisions + hot-red check
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding $false
$tools = $PSScriptRoot
$sushi = [IO.Path]::GetFullPath((Join-Path $tools "..\.."))
Add-Type -AssemblyName System.Drawing

function Ensure-Member($obj,$n,$v){ $obj | Add-Member -NotePropertyName $n -NotePropertyValue $v -Force }
function MakeDirs([string]$recipe,[int]$n){
  $arr = New-Object System.Collections.Generic.List[string]
  if ($n -le 1) { return ,@() }
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
  return ,$arr.ToArray()
}
function GapOf($r){ if ($r -in @("R6","R4","R2","R8")){"tight"} else {"normal"} }

$fixes = @{
  "27-izakaya-ink-b" = @{ pr="R4"; wr="R8" }
  "22-cowork-clinic-b" = @{ pr="R8"; wr="R3" }
  "23-cowork-green-a" = @{ pr="R2"; wr="R8" }
  "24-sweets-sakura-c" = @{ pr="R8"; wr="R5" }
}

foreach ($folder in $fixes.Keys) {
  $path = Join-Path $sushi (Join-Path $folder "draft.json")
  $j = [IO.File]::ReadAllText($path,$utf8) | ConvertFrom-Json
  $pr = $fixes[$folder].pr; $wr = $fixes[$folder].wr
  $pc = [int]$j.draftCounts."about-photos"; $wc = [int]$j.draftCounts."works-list"
  Ensure-Member $j "itemLayouts" ([pscustomobject]@{
    "about-photos" = [pscustomobject]@{ growDirs = @(MakeDirs $pr $pc); gap = (GapOf $pr); recipe = $pr }
    "works-list" = [pscustomobject]@{ growDirs = @(MakeDirs $wr $wc); gap = (GapOf $wr); recipe = $wr }
  })
  Ensure-Member $j "layoutRecipeNote" ("photo={0} works={1} dense=3 uniq=2" -f $pr,$wr)
  [IO.File]::WriteAllText($path, ($j | ConvertTo-Json -Depth 30), $utf8)
  Write-Host ("FIX {0} -> {1}/{2}" -f $folder.Substring(0,2), $pr, $wr)
}

$hits=0
Get-ChildItem $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | ForEach-Object {
  $folder=$_.Name
  Get-ChildItem (Join-Path $_.FullName 'images') -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -match '\.(jpg|jpeg|png)$' } | ForEach-Object {
    $bmp=$null
    try {
      $bmp=[Drawing.Bitmap]::FromFile($_.FullName)
      $sx=[Math]::Max(1,[int]($bmp.Width/28)); $sy=[Math]::Max(1,[int]($bmp.Height/28))
      $n=0; $hot=0
      for($y=0;$y -lt $bmp.Height;$y+=$sy){ for($x=0;$x -lt $bmp.Width;$x+=$sx){
        $c=$bmp.GetPixel($x,$y); $n++; if($c.R -ge 185 -and $c.G -le 95 -and $c.B -le 95){ $hot++ }
      }}
      if(($hot/[double]$n) -ge 0.35){ Write-Output ("HOT $folder/$($_.Name)"); $hits++ }
    } catch {} finally { if($bmp){ $bmp.Dispose() } }
  }
}
Write-Output ("hot_hits=$hits")
