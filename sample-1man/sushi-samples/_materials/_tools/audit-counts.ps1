$ErrorActionPreference = "Stop"
$sushi = "sample-1man\sushi-samples"
Get-ChildItem -Path $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | ForEach-Object {
  $dir = $_
  $imgs = @(Get-ChildItem (Join-Path $dir.FullName "images") -File -ErrorAction SilentlyContinue)
  $json = Get-Content (Join-Path $dir.FullName "draft.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  $pc = $json.draftCounts."about-photos"
  $wc = $json.draftCounts."works-list"
  $hi = $json.draftColors.heroInk
  Write-Output ("{0} p={1} w={2} files={3} heroInk={4} note={5}" -f $dir.Name, $pc, $wc, $imgs.Count, $hi, $json.layoutRecipeNote)
}
