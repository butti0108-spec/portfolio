[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"
$sushi = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $j = Get-Content (Join-Path $_.FullName "draft.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  $p = [int]$j.draftCounts."about-photos"
  $w = [int]$j.draftCounts."works-list"
  $v = [int]$j.draftCounts."hero-values"
  $issues = New-Object System.Collections.Generic.List[string]
  $ht = [string]$j.fields.hero_title
  $br = [string]$j.fields.brand_name
  if ($ht.Length -lt 12 -or $ht -eq $br) { [void]$issues.Add("hero") }
  for ($i=1; $i -le [Math]::Max($v,3); $i++) {
    if ($i -le $v) {
      $t = [string]$j.fields.("value_${i}_title")
      $x = [string]$j.fields.("value_${i}_text")
      if ([string]::IsNullOrWhiteSpace($t) -or $x.Length -lt 20) { [void]$issues.Add("value$i") }
    }
  }
  for ($i=1; $i -le $w; $i++) {
    $t = [string]$j.fields.("work_${i}_title")
    $x = [string]$j.fields.("work_${i}_text")
    if ([string]::IsNullOrWhiteSpace($t) -or $x.Length -lt 12) { [void]$issues.Add("work$i") }
  }
  $lead = [string]$j.fields.about_lead
  if ($lead.Length -lt 40) { [void]$issues.Add("about") }
  $hl1 = [string]$j.fields.hero_lead_1
  if ($hl1.Length -lt 20) { [void]$issues.Add("lead1") }
  if ($issues.Count -gt 0) {
    Write-Host ("{0} :: {1} | hero={2}" -f $_.Name, ($issues -join ","), $ht)
  }
}
