$ErrorActionPreference = "Stop"
$Tools = $PSScriptRoot
$Root = Resolve-Path (Join-Path $Tools "..\sample-1man\sushi-samples")
$PlansPath = Join-Path $Tools "meaning-bu-2026-09-15-plans.json"
$All = @("hero","values","photos","works","accordions","hours","access","address","contact")

$plansObj = Get-Content -LiteralPath $PlansPath -Raw -Encoding UTF8 | ConvertFrom-Json
$utf8 = New-Object System.Text.UTF8Encoding $false

function Get-Prop($obj, $name) {
  return $obj.PSObject.Properties[$name].Value
}

function Ensure-NoteProperty($obj, $name, $value) {
  if ($obj.PSObject.Properties[$name]) {
    $obj.$name = $value
  } else {
    $obj | Add-Member -NotePropertyName $name -NotePropertyValue $value -Force
  }
}

function Remove-NoteProperty($obj, $name) {
  if ($obj.PSObject.Properties[$name]) {
    $obj.PSObject.Properties.Remove($name)
  }
}

foreach ($prop in $plansObj.PSObject.Properties | Sort-Object Name) {
  $p = $prop.Value
  $folder = [string](Get-Prop $p "folder")
  $file = Join-Path $Root (Join-Path $folder "draft.json")
  $draft = Get-Content -LiteralPath $file -Raw -Encoding UTF8 | ConvertFrom-Json

  $blockOff = New-Object PSObject
  foreach ($id in @(Get-Prop $p "blockOff")) {
    $blockOff | Add-Member -NotePropertyName $id -NotePropertyValue $true -Force
  }

  $extras = New-Object PSObject
  $extras | Add-Member hours $true -Force
  $extras | Add-Member access $true -Force
  $extras | Add-Member address $true -Force
  $extrasOff = @($(Get-Prop $p "extrasOff"))
  $order = @($(Get-Prop $p "order"))
  foreach ($id in $extrasOff) {
    if ($id) { $extras.$id = $false }
  }
  foreach ($id in @("hours","access","address")) {
    if ($extrasOff -contains $id) { continue }
    if ($order -contains $id) { $extras.$id = $true }
  }

  $fullOrder = New-Object System.Collections.Generic.List[string]
  foreach ($id in $order) { [void]$fullOrder.Add([string]$id) }
  foreach ($id in $All) {
    if (-not $fullOrder.Contains($id)) { [void]$fullOrder.Add($id) }
  }

  Ensure-NoteProperty $draft "layoutOrder" @($fullOrder)
  Ensure-NoteProperty $draft "layoutBlockOff" $blockOff
  Ensure-NoteProperty $draft "draftExtras" $extras
  Ensure-NoteProperty $draft "brushUpMeaning" "2026-09-15-v01"
  Ensure-NoteProperty $draft "structureFace" ([string](Get-Prop $p "face"))
  Ensure-NoteProperty $draft "structureInvite" ([string](Get-Prop $p "invite"))
  Ensure-NoteProperty $draft "structureMemory" ([string](Get-Prop $p "memory"))
  Ensure-NoteProperty $draft "structureAbsent" @($(Get-Prop $p "absent"))
  if (-not $draft.PSObject.Properties["brushUpStructure"]) {
    Ensure-NoteProperty $draft "brushUpStructure" "2026-09-14-v01"
  }

  $heroOff = $false
  if ($p.PSObject.Properties["heroImageOff"] -and [bool](Get-Prop $p "heroImageOff")) { $heroOff = $true }
  if ($heroOff) {
    Ensure-NoteProperty $draft "heroImageOff" $true
    Ensure-NoteProperty $draft "heroTextOnPhoto" $true
    if ($draft.imagePaths -and $draft.imagePaths.PSObject.Properties["hero_image"]) {
      $draft.imagePaths.PSObject.Properties.Remove("hero_image")
    }
  } else {
    Remove-NoteProperty $draft "heroImageOff"
  }

  $json = $draft | ConvertTo-Json -Depth 40
  [System.IO.File]::WriteAllText($file, $json + "`n", $utf8)
  Write-Host "patched $folder"
}

Write-Host "done"
