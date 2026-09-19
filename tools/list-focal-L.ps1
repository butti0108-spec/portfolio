$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot "..\sample-1man\sushi-samples" | Resolve-Path
$rows = @()
Get-ChildItem $root -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $folder = $_.Name
  $draft = Get-Content (Join-Path $_.FullName "draft.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($id in @("about-photos", "works-list")) {
    $lay = $draft.itemLayouts.$id
    if (-not $lay) { continue }
    $sizes = @($lay.sizes)
    for ($i = 0; $i -lt $sizes.Count; $i++) {
      if ([string]$sizes[$i] -ne "L") { continue }
      $n = $i + 1
      $key = if ($id -eq "about-photos") { "about_image_$n" } else { "work_${n}_image" }
      $rel = $null
      if ($draft.imagePaths -and $draft.imagePaths.PSObject.Properties[$key]) {
        $rel = [string]$draft.imagePaths.$key
      }
      $rows += [pscustomobject]@{
        folder = $folder
        block = $id
        index = $i
        key = $key
        path = $rel
      }
    }
  }
}
$rows | ConvertTo-Csv -NoTypeInformation | Set-Content -Encoding UTF8 (Join-Path $PSScriptRoot "focal-L-inventory.csv")
Write-Host ("L count=" + $rows.Count)
$rows | Select-Object -First 20 | Format-Table -AutoSize
