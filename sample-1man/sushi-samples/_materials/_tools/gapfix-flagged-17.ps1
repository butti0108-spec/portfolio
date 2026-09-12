# Fill section gaps on flagged B/C samples (ASCII only)
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding $false
$tools = $PSScriptRoot
$sushi = [IO.Path]::GetFullPath((Join-Path $tools "..\.."))
$materials = [IO.Path]::GetFullPath((Join-Path $tools ".."))
$pad = Get-Content -LiteralPath (Join-Path $tools "densify-pair-copy.json") -Raw -Encoding UTF8 | ConvertFrom-Json

function Ensure-Member($o,$n,$v){ $o | Add-Member -NotePropertyName $n -NotePropertyValue $v -Force }
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

$flag = @(
  "02-cafe-split-b","03-cafe-mix-ink-c","05-salon-sakura-b","06-bakery-brick-a","07-bakery-cafe-c",
  "10-clinic-green-a","11-clinic-clinic-b","13-florist-green-c","15-ramen-ink-a","16-yoga-green-a",
  "18-studio-clinic-c","19-studio-ink-a","20-pet-cafe-b","22-cowork-clinic-b","23-cowork-green-a",
  "24-sweets-sakura-c","27-izakaya-ink-b"
)

$recipeFix = @{
  "02-cafe-split-b" = @{ pr="R5"; wr="R2" }
  "03-cafe-mix-ink-c" = @{ pr="R8"; wr="R2" }
  "05-salon-sakura-b" = @{ pr="R3"; wr="R2" }
  "06-bakery-brick-a" = @{ pr="R5"; wr="R2" }
  "07-bakery-cafe-c" = @{ pr="R5"; wr="R4" }
  "10-clinic-green-a" = @{ pr="R2"; wr="R5" }
  "11-clinic-clinic-b" = @{ pr="R5"; wr="R2" }
  "13-florist-green-c" = @{ pr="R3"; wr="R2" }
  "15-ramen-ink-a" = @{ pr="R5"; wr="R2" }
  "16-yoga-green-a" = @{ pr="R2"; wr="R5" }
  "18-studio-clinic-c" = @{ pr="R5"; wr="R4" }
  "19-studio-ink-a" = @{ pr="R5"; wr="R3" }
  "20-pet-cafe-b" = @{ pr="R4"; wr="R2" }
  "22-cowork-clinic-b" = @{ pr="R5"; wr="R3" }
  "23-cowork-green-a" = @{ pr="R2"; wr="R5" }
  "24-sweets-sakura-c" = @{ pr="R5"; wr="R2" }
  "27-izakaya-ink-b" = @{ pr="R4"; wr="R5" }
}

$orderB = @("hero","values","photos","works","hours","access","accordions","contact")
$orderC = @("hero","photos","works","values","accordions","hours","access","contact")
$sep = " / "

foreach ($folder in $flag) {
  $path = Join-Path $sushi (Join-Path $folder "draft.json")
  if (-not (Test-Path $path)) { Write-Host "MISS $folder"; continue }
  $j = [IO.File]::ReadAllText($path, $utf8) | ConvertFrom-Json
  $lp = [string]$j.layoutPattern
  $f = $j.fields

  if (-not $j.draftExtras) { Ensure-Member $j "draftExtras" ([pscustomobject]@{}) }
  Ensure-Member $j.draftExtras "hours" $true
  Ensure-Member $j.draftExtras "access" $true
  Ensure-Member $j.draftExtras "address" $false

  $addr = ""; try { $addr = [string]$f.address_text } catch {}
  $acc = ""; try { $acc = [string]$f.access_text } catch {}
  if ([string]::IsNullOrWhiteSpace($acc)) { $acc = [string]$pad.access_default }
  $mergedAcc = $acc.Trim()
  if (-not [string]::IsNullOrWhiteSpace($addr)) {
    $needle = $addr.Substring(0, [Math]::Min(8, $addr.Length))
    if ($mergedAcc -notlike ("*" + $needle + "*")) {
      $mergedAcc = ($mergedAcc + $sep + "Address: " + $addr.Trim()).Trim()
    }
  }
  if ($mergedAcc.Length -lt 50) {
    $mergedAcc = ($mergedAcc + $sep + [string]$pad.addr_pad).Trim()
  }
  Ensure-Member $f "access_text" $mergedAcc

  $hours = ""; try { $hours = [string]$f.hours_text } catch {}
  if ($hours.Length -lt 45) {
    Ensure-Member $f "hours_text" (($hours.Trim() + [string]$pad.hours_pad).Trim())
  }
  Ensure-Member $f "contact_note_1" ([string]$pad.contact_note_1)
  Ensure-Member $f "contact_note_2" ([string]$pad.contact_note_2)

  if ($lp -eq "c") { Ensure-Member $j "layoutOrder" $orderC }
  else { Ensure-Member $j "layoutOrder" $orderB }

  $pc = [int]$j.draftCounts."about-photos"
  $wc = [int]$j.draftCounts."works-list"
  if ($pc -lt 3) { $pc = 3; $j.draftCounts."about-photos" = 3 }
  if ($wc -lt 3) { $wc = 3; $j.draftCounts."works-list" = 3 }
  if (($lp -eq "b" -or $lp -eq "c") -and [int]$j.draftCounts."about-accordions" -gt 1) {
    $j.draftCounts."about-accordions" = 1
  }

  $pr = [string]$j.itemLayouts."about-photos".recipe
  $wr = [string]$j.itemLayouts."works-list".recipe
  if ($recipeFix.ContainsKey($folder)) {
    $pr = $recipeFix[$folder].pr
    $wr = $recipeFix[$folder].wr
  }
  $pd = MakeDirs $pr $pc
  $wd = MakeDirs $wr $wc
  Ensure-Member $j "itemLayouts" ([pscustomobject]@{
    "about-photos" = [pscustomobject]@{ growDirs = $pd; gap = (GapOf $pr); recipe = $pr }
    "works-list" = [pscustomobject]@{ growDirs = $wd; gap = (GapOf $wr); recipe = $wr }
  })
  Ensure-Member $j "layoutRecipeNote" ("photo={0} works={1} dense=4 gapfix=1" -f $pr, $wr)

  $ip = @{}
  $ip["hero_image"] = ("sushi-samples/{0}/images/hero.jpg?v=dense4" -f $folder)
  for ($i=1; $i -le $pc; $i++) { $ip[("about_image_{0}" -f $i)] = ("sushi-samples/{0}/images/about-{1:d2}.jpg?v=dense4" -f $folder, $i) }
  for ($i=1; $i -le $wc; $i++) { $ip[("work_{0}_image" -f $i)] = ("sushi-samples/{0}/images/work-{1:d2}.jpg?v=dense4" -f $folder, $i) }
  Ensure-Member $j "imagePaths" ([pscustomobject]$ip)

  [IO.File]::WriteAllText($path, ($j | ConvertTo-Json -Depth 30), $utf8)

  $metaPath = Join-Path $materials (Join-Path $folder "meta.json")
  if (Test-Path $metaPath) {
    $m = [IO.File]::ReadAllText($metaPath, $utf8) | ConvertFrom-Json
    Ensure-Member $m "layoutOrder" @($j.layoutOrder)
    Ensure-Member $m "extras" ([pscustomobject]@{ hours = $true; access = $true; address = $false })
    Ensure-Member $m "counts" ([pscustomobject]@{
      "hero-leads" = [int]$j.draftCounts."hero-leads"
      "hero-values" = [int]$j.draftCounts."hero-values"
      "about-accordions" = [int]$j.draftCounts."about-accordions"
      "about-photos" = $pc
      "works-list" = $wc
    })
    [IO.File]::WriteAllText($metaPath, ($m | ConvertTo-Json -Depth 30), $utf8)
  }

  Write-Host ("OK {0} L={1} p={2}/{3} w={4}/{5}" -f $folder.Substring(0,2), $lp, $pc, $pr, $wc, $wr)
}
Write-Host "DONE gapfix-17"
