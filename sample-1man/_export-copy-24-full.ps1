# ASCII-only. Writes UTF-8 full-text markdown for 24 sample fields.
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path ".").Path
$sushi = Join-Path $repo "sample-1man\sushi-samples"
$ids = @("01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","18","19","21","23","26","28","29","30")
$utf8 = New-Object System.Text.UTF8Encoding $false
$nl = "`r`n"
$emptyMark = ([string]::Join("", @([char]0xFF08, [char]0x7A7A, [char]0xFF09)))

$keys = @(
  "brand_name","hero_title","hero_lead_1","hero_lead_2","hero_lead_3",
  "value_1_title","value_1_text","value_2_title","value_2_text","value_3_title","value_3_text",
  "about_section_name","about_heading","about_name","about_lead",
  "acc_1_title","acc_1_body","acc_2_title","acc_2_body",
  "works_section_name","works_heading","works_lead",
  "work_1_title","work_1_text","work_2_title","work_2_text","work_3_title","work_3_text",
  "hours_text","address_text","access_text",
  "contact_section_name","contact_label","contact_email","contact_note_1","contact_note_2"
)

$label = @{
  brand_name = "brand_name"
  hero_title = "hero_title"
  hero_lead_1 = "hero_lead_1"
  hero_lead_2 = "hero_lead_2"
  hero_lead_3 = "hero_lead_3"
  value_1_title = "value_1_title"
  value_1_text = "value_1_text"
  value_2_title = "value_2_title"
  value_2_text = "value_2_text"
  value_3_title = "value_3_title"
  value_3_text = "value_3_text"
  about_section_name = "about_section_name"
  about_heading = "about_heading"
  about_name = "about_name"
  about_lead = "about_lead"
  acc_1_title = "acc_1_title"
  acc_1_body = "acc_1_body"
  acc_2_title = "acc_2_title"
  acc_2_body = "acc_2_body"
  works_section_name = "works_section_name"
  works_heading = "works_heading"
  works_lead = "works_lead"
  work_1_title = "work_1_title"
  work_1_text = "work_1_text"
  work_2_title = "work_2_title"
  work_2_text = "work_2_text"
  work_3_title = "work_3_title"
  work_3_text = "work_3_text"
  hours_text = "hours_text"
  address_text = "address_text"
  access_text = "access_text"
  contact_section_name = "contact_section_name"
  contact_label = "contact_label"
  contact_email = "contact_email"
  contact_note_1 = "contact_note_1"
  contact_note_2 = "contact_note_2"
}

$index = New-Object System.Collections.Generic.List[string]
$parts = New-Object System.Collections.Generic.List[string]

foreach ($id in $ids) {
  $dir = Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like ($id + "-*") } | Select-Object -First 1
  if (-not $dir) { throw "missing $id" }
  $raw = [IO.File]::ReadAllText((Join-Path $dir.FullName "draft.json"), $utf8)
  $j = $raw | ConvertFrom-Json
  $f = $j.fields
  $brand = [string]$f.brand_name
  $index.Add("| $id | $brand | ``$($dir.Name)`` |")

  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("")
  $lines.Add("---")
  $lines.Add("")
  $lines.Add("## $id  $brand")
  $lines.Add("")
  $lines.Add("- folder: ``$($dir.Name)``")
  $lines.Add("- scene: $($j.scene)")
  $lines.Add("- heroTextOnPhoto: $($j.heroTextOnPhoto)")
  if ($null -ne $j.PSObject.Properties["heroImageOff"] -and $null -ne $j.heroImageOff) {
    $lines.Add("- heroImageOff: $($j.heroImageOff)")
  }
  if ($j.layoutBlockOff) {
    $lines.Add("- layoutBlockOff: " + ((@($j.layoutBlockOff) -join ", ")))
  }
  if ($j.draftExtras) {
    $ex = @()
    foreach ($p in $j.draftExtras.PSObject.Properties) { $ex += "$($p.Name)=$($p.Value)" }
    $lines.Add("- draftExtras: " + ($ex -join ", "))
  }
  $lines.Add("")
  foreach ($k in $keys) {
    $v = [string]$f.$k
    if ([string]::IsNullOrWhiteSpace($v)) { $v = $emptyMark }
    $lines.Add("### $($label[$k])")
    $lines.Add("")
    $lines.Add($v)
    $lines.Add("")
  }
  $parts.Add(($lines -join $nl))
}

$asciiHeader = @(
  "# FULLTEXT_TITLE",
  "",
  "- date: 2026-09-18",
  "- from: kuru -> auditor",
  "- scope: first-team 24 / draft.json fields / verbatim / no omission",
  "- out of scope: deleted 17/20/22/24/25/27, UI chrome, copy-seed packs, fonts",
  "- empty: marked",
  "- note: meaning-subtraction may hide blocks while fields remain",
  "- source: sample-1man/sushi-samples/*/draft.json",
  "",
  "## Field key map",
  "",
  "| key | meaning |",
  "|-----|---------|",
  "| brand_name | shop name |",
  "| hero_title | catch |",
  "| hero_lead_* | lead |",
  "| value_* | values title/body |",
  "| about_* | about |",
  "| acc_* | accordion |",
  "| works_* / work_* | menu |",
  "| hours/address/access | hours/address/access |",
  "| contact_* | contact |",
  "",
  "## Index",
  "",
  "| No | brand | folder |",
  "|----|-------|--------|"
) -join $nl

$footer = @(
  "",
  "## Audit checklist",
  "",
  "- [ ] catch/lead vs worldview one-liner",
  "- [ ] boilerplate (distance / specialty / contact-access)",
  "- [ ] leftover fields on absent blocks",
  ""
) -join $nl

$body = $asciiHeader + $nl + ($index -join $nl) + $nl + $nl + "## Full text" + $nl + ($parts -join $nl) + $footer

# Replace title with Japanese via char codes
$jpTitle = "# " + ([string]::Join("", @(
  [char]0x898B, [char]0x672C, [char]0x32, [char]0x34, [char]0x30B7, [char]0x30C3, [char]0x30C8, [char]0x30FB,
  [char]0x63B2, [char]0x8F09, [char]0x6587, [char]0x8A00, [char]0x20, [char]0x5168, [char]0x6587, [char]0x4E00, [char]0x89A7,
  [char]0xFF08, [char]0x76E3, [char]0x67FB, [char]0x63D0, [char]0x51FA, [char]0xFF09
)))
# Simpler fixed title:
$jpTitle = "# " + [char]0x898B + [char]0x672C + "24" + [char]0x30FB + [char]0x63B2 + [char]0x8F09 + [char]0x6587 + [char]0x8A00 + " " + [char]0x5168 + [char]0x6587 + [char]0x4E00 + [char]0x89A7 + [char]0xFF08 + [char]0x76E3 + [char]0x67FB + [char]0x63D0 + [char]0x51FA + [char]0xFF09
$body = $body.Replace("# FULLTEXT_TITLE", $jpTitle)

$outDir = Get-ChildItem (Join-Path $repo "docs") -Directory | Where-Object {
  @(Get-ChildItem $_.FullName -Filter "2026-09-17-*.md" -File -EA SilentlyContinue).Count -gt 3
} | Select-Object -First 1
if (-not $outDir) { throw "docs in-progress folder not found" }
$outName = "2026-09-18-sample24-copy-fulltext-audit.md"
$outPath = Join-Path $outDir.FullName $outName
[IO.File]::WriteAllText($outPath, $body, $utf8)
Write-Host "WROTE $outPath"
Write-Host ("chars=" + $body.Length)
