# apply-copy-to-draft.ps1
# copy.json の文言を NN/draft.json の fields に反映。counts / extras は meta.json 優先。
param(
  [Parameter(Mandatory = $true)][string]$Folder
)

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
# $PSScriptRoot = .../_materials/_tools → sushi-samples
$sushi = Split-Path $PSScriptRoot -Parent
if ((Split-Path $sushi -Leaf) -eq "_materials") {
  $sushi = Split-Path $sushi -Parent
}
# Fix: _tools is under _materials
$materials = Split-Path $PSScriptRoot -Parent
$sushi = Split-Path $materials -Parent

$copyPath = Join-Path $materials (Join-Path $Folder "copy.json")
$metaPath = Join-Path $materials (Join-Path $Folder "meta.json")
$draftPath = Join-Path $sushi (Join-Path $Folder "draft.json")

if (-not (Test-Path -LiteralPath $copyPath)) { throw "missing copy: $copyPath" }
if (-not (Test-Path -LiteralPath $draftPath)) { throw "missing draft: $draftPath" }

$utf8 = [Text.UTF8Encoding]::new($false)
$copy = [IO.File]::ReadAllText($copyPath, $utf8) | ConvertFrom-Json
$draft = [IO.File]::ReadAllText($draftPath, $utf8) | ConvertFrom-Json

$skip = @("note")
$copy.PSObject.Properties | ForEach-Object {
  if ($skip -contains $_.Name) { return }
  $draft.fields | Add-Member -NotePropertyName $_.Name -NotePropertyValue ([string]$_.Value) -Force
}

if (Test-Path -LiteralPath $metaPath) {
  $meta = [IO.File]::ReadAllText($metaPath, $utf8) | ConvertFrom-Json
  if ($meta.counts) {
    if (-not $draft.draftCounts) { $draft | Add-Member -NotePropertyName draftCounts -NotePropertyValue ([pscustomobject]@{}) -Force }
    $meta.counts.PSObject.Properties | ForEach-Object {
      $draft.draftCounts | Add-Member -NotePropertyName $_.Name -NotePropertyValue ([int]$_.Value) -Force
    }
  }
  if ($meta.extras) {
    if (-not $draft.draftExtras) { $draft | Add-Member -NotePropertyName draftExtras -NotePropertyValue ([pscustomobject]@{}) -Force }
    $meta.extras.PSObject.Properties | ForEach-Object {
      $draft.draftExtras | Add-Member -NotePropertyName $_.Name -NotePropertyValue $_.Value -Force
    }
  }
  if ($meta.fonts) {
    $draft.fonts = $meta.fonts
    if ($meta.fonts.display) { $draft.fields | Add-Member font_display $meta.fonts.display -Force }
    if ($meta.fonts.catch) { $draft.fields | Add-Member font_catch $meta.fonts.catch -Force }
    if ($meta.fonts.body) { $draft.fields | Add-Member font_body $meta.fonts.body -Force }
  }
  if ($meta.layoutPattern) { $draft.layoutPattern = $meta.layoutPattern }
  if ($meta.layoutOrder) { $draft.layoutOrder = $meta.layoutOrder }
  if ($meta.scene) { $draft.scene = $meta.scene }
  if ($meta.colorKey) { $draft.chosenPresetKey = $meta.colorKey }
}

$draft.savedAt = [DateTime]::UtcNow.ToString("o")
$json = $draft | ConvertTo-Json -Depth 30
[IO.File]::WriteAllText($draftPath, $json, $utf8)
Write-Host "applied $Folder -> draft.json"
