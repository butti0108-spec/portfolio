# Fill thin copy-dict cells. Phrases live in copy-dict-fill-holes-data.json (UTF-8).
# This .ps1 stays ASCII-only to avoid PowerShell encoding breakage.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$root = Split-Path -Parent $here
$scenesDir = Join-Path $root "sample-1man\copy-dict\scenes"
$matRoot = Join-Path $root "sample-1man\sushi-samples\_materials"
$dataPath = Join-Path $here "copy-dict-fill-holes-data.json"
$data = Get-Content -LiteralPath $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json

function Get-AxisKw([string]$axis) {
  switch ($axis) {
    "bright" { return "bright" }
    "ease" { return "calm" }
    "clear" { return "refined" }
    "invite" { return "casual" }
    "craft" { return "craft" }
    default { return "warm" }
  }
}

function New-PartObj($id, $text, $axis, $slot, $sections, $kw) {
  return [pscustomobject]@{
    id = $id
    text = $text
    axisIds = @($axis)
    weight = 1
    keywordIds = @($kw)
    slot = $slot
    sectionIds = @($sections)
  }
}

$jpPeriod = [string][char]0x3002
$rxBan = [regex]::new("\u304a\u3082\u3066\u306a\u3057")
$rxContact = [regex]::new("\u9023\u7d61|\u4e88\u7d04|\u30e1\u30fc\u30eb|\u96fb\u8a71|\u304a\u554f\u3044\u5408\u308f\u305b")
$rxWorks = [regex]::new("\u304a\u3059\u3059\u3081|\u5b9a\u756a|\u30bb\u30c3\u30c8|\u30e1\u30cb\u30e5\u30fc|\u4e00\u676f|\u4e00\u54c1")
$rxHype = [regex]::new("\u6700\u9ad8|\u7d76\u5bfe|\u5fc5\u305a|\u5b8c\u74a7")

$totalAdded = 0
$report = [ordered]@{}
$sceneFiles = @(Get-ChildItem -LiteralPath $scenesDir -Filter "*.json" | Where-Object { $_.Name -notlike "_*" })

foreach ($file in $sceneFiles) {
  $scene = $file.BaseName
  $path = $file.FullName
  $doc = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
  $partList = New-Object System.Collections.ArrayList
  foreach ($p in @($doc.parts)) { [void]$partList.Add($p) }
  $idSet = New-Object "System.Collections.Generic.HashSet[string]"
  foreach ($p in $partList) { [void]$idSet.Add([string]$p.id) }
  $textSet = New-Object "System.Collections.Generic.HashSet[string]"
  foreach ($p in $partList) { [void]$textSet.Add([string]$p.text) }
  $addedLocal = 0

  $pending = New-Object System.Collections.ArrayList
  foreach ($row in @($data.sharedBrightMid)) {
    [void]$pending.Add((New-PartObj $row.id $row.text "bright" "mid" @("hero","about","works") $row.kw))
  }
  foreach ($row in @($data.sharedBrightClose)) {
    [void]$pending.Add((New-PartObj $row.id $row.text "bright" "close" @("hero","about","works","contact") $row.kw))
  }
  foreach ($row in @($data.worksFill)) {
    [void]$pending.Add((New-PartObj $row.id $row.text $row.axis $row.slot @("works") (Get-AxisKw $row.axis)))
  }
  foreach ($row in @($data.contactFill)) {
    [void]$pending.Add((New-PartObj $row.id $row.text $row.axis $row.slot @("contact") (Get-AxisKw $row.axis)))
  }

  $flavProp = $data.sceneFlavor.PSObject.Properties[$scene]
  if ($null -ne $flavProp) {
    $flav = $flavProp.Value
    $i = 1
    foreach ($t in @($flav.mid)) {
      [void]$pending.Add((New-PartObj ("{0}_fill_bright_mid_{1}" -f $scene, $i) $t "bright" "mid" @("hero","about","works") "bright"))
      $i++
    }
    $i = 1
    foreach ($t in @($flav.close)) {
      [void]$pending.Add((New-PartObj ("{0}_fill_bright_close_{1}" -f $scene, $i) $t "bright" "close" @("hero","about","works","contact") "bright"))
      $i++
    }
    $i = 1
    foreach ($t in @($flav.worksOpen)) {
      [void]$pending.Add((New-PartObj ("{0}_fill_works_open_{1}" -f $scene, $i) $t "invite" "open" @("works") "menu"))
      $i++
    }
    $i = 1
    foreach ($t in @($flav.contactMid)) {
      [void]$pending.Add((New-PartObj ("{0}_fill_contact_mid_{1}" -f $scene, $i) $t "clear" "mid" @("contact") "access"))
      $i++
    }
  }

  $mats = @(Get-ChildItem -LiteralPath $matRoot -Directory -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -match ("^\d+-" + [regex]::Escape($scene) + "-")
  })
  $harvestN = 0
  foreach ($m in $mats) {
    $copyPath = Join-Path $m.FullName "copy.json"
    if (-not (Test-Path -LiteralPath $copyPath)) { continue }
    $copy = Get-Content -LiteralPath $copyPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $cands = New-Object System.Collections.ArrayList
    foreach ($field in @("works_lead","work_1_text","work_2_text","contact_note_1","hero_lead_1","value_1_text")) {
      $v = [string]$copy.$field
      if (-not $v) { continue }
      $splitRx = "[" + [char]0x3002 + [char]0xFF0E + "\n]"
      foreach ($seg in ($v -split $splitRx)) {
        $s = $seg.Trim()
        if ($s.Length -lt 8 -or $s.Length -gt 42) { continue }
        if ($rxBan.IsMatch($s) -or $rxHype.IsMatch($s)) { continue }
        [void]$cands.Add($s)
      }
    }
    foreach ($s in @($cands | Select-Object -Unique | Select-Object -First 4)) {
      if ($harvestN -ge 6) { break }
      $harvestN++
      $hid = "{0}_harv_{1}" -f $scene, $harvestN
      if ($rxContact.IsMatch($s)) {
        [void]$pending.Add((New-PartObj $hid ($s + $jpPeriod) "clear" "close" @("contact") "first"))
      } elseif ($rxWorks.IsMatch($s)) {
        [void]$pending.Add((New-PartObj $hid $s "invite" "mid" @("works","about") "menu"))
      } else {
        [void]$pending.Add((New-PartObj $hid $s "warm" "mid" @("hero","about") "care"))
      }
    }
  }

  foreach ($part in $pending) {
    if ($idSet.Contains([string]$part.id)) { continue }
    if ($textSet.Contains([string]$part.text)) { continue }
    [void]$partList.Add($part)
    [void]$idSet.Add([string]$part.id)
    [void]$textSet.Add([string]$part.text)
    $addedLocal++
  }

  $doc.parts = @($partList.ToArray())
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($path, ($doc | ConvertTo-Json -Depth 30), $utf8)
  $report[$scene] = $addedLocal
  $totalAdded += $addedLocal
  Write-Output ("{0}: +{1} now={2}" -f $scene, $addedLocal, $partList.Count)
}

Write-Output ("TOTAL_ADDED={0}" -f $totalAdded)
$reportPath = Join-Path $here "copy-dict-fill-holes-report.json"
[System.IO.File]::WriteAllText($reportPath, ($report | ConvertTo-Json), (New-Object System.Text.UTF8Encoding $false))
