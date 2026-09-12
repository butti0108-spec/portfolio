# Sync densify into meta + B/C layout pairing (ASCII-only; JP via JSON if needed later)
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding $false
$tools = $PSScriptRoot
$sushi = [IO.Path]::GetFullPath((Join-Path $tools "..\.."))
$materials = [IO.Path]::GetFullPath((Join-Path $tools ".."))
$pad = Get-Content -LiteralPath (Join-Path $tools "densify-pair-copy.json") -Raw -Encoding UTF8 | ConvertFrom-Json

$orderBC = @("hero","values","photos","works","hours","address","accordions","contact")
$orderA = @("hero","values","photos","works","accordions","hours","access","address","contact")

function Json-Save($obj, $path) {
  $json = $obj | ConvertTo-Json -Depth 30
  [IO.File]::WriteAllText($path, $json, $utf8)
}

function Ensure-Member($obj, $name, $val) {
  $obj | Add-Member -NotePropertyName $name -NotePropertyValue $val -Force
}

Get-ChildItem -LiteralPath $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $folder = $_.Name
  $draftPath = Join-Path $_.FullName "draft.json"
  $metaPath = Join-Path $materials (Join-Path $folder "meta.json")
  if (-not (Test-Path $draftPath)) { return }
  $j = [IO.File]::ReadAllText($draftPath, $utf8) | ConvertFrom-Json
  $lp = [string]$j.layoutPattern
  if ([string]::IsNullOrWhiteSpace($lp)) { $lp = "a" }

  if (-not $j.draftExtras) { Ensure-Member $j "draftExtras" ([pscustomobject]@{}) }
  Ensure-Member $j.draftExtras "hours" $true
  Ensure-Member $j.draftExtras "address" $true

  $f = $j.fields
  $accessTxt = ""; try { $accessTxt = [string]$f.access_text } catch {}
  $addrTxt = ""; try { $addrTxt = [string]$f.address_text } catch {}
  $hoursTxt = ""; try { $hoursTxt = [string]$f.hours_text } catch {}

  if ($lp -eq "b" -or $lp -eq "c") {
    Ensure-Member $j.draftExtras "access" $false
    if (-not [string]::IsNullOrWhiteSpace($accessTxt)) {
      $needle = $accessTxt.Substring(0, [Math]::Min(10, $accessTxt.Length))
      if ($addrTxt -notlike ("*" + $needle + "*")) {
        Ensure-Member $f "address_text" (($addrTxt.Trim() + " / " + $accessTxt.Trim()).Trim())
        $addrTxt = [string]$f.address_text
      }
    }
    if ($hoursTxt.Length -lt 40) {
      Ensure-Member $f "hours_text" (($hoursTxt.Trim() + $pad.hours_pad).Trim())
    }
    if ($addrTxt.Length -lt 40) {
      Ensure-Member $f "address_text" (($addrTxt.Trim() + $pad.addr_pad).Trim())
    }
    Ensure-Member $f "contact_note_1" $pad.contact_note_1
    Ensure-Member $f "contact_note_2" $pad.contact_note_2
    # Keep accordion count modest so half-column height matches contact
    if ([int]$j.draftCounts."about-accordions" -gt 1) {
      $j.draftCounts."about-accordions" = 1
    }
    Ensure-Member $j "layoutOrder" $orderBC
  } else {
    Ensure-Member $j.draftExtras "access" $true
    if ([string]::IsNullOrWhiteSpace($accessTxt)) {
      Ensure-Member $f "access_text" $pad.access_default
    }
    if ($hoursTxt.Length -lt 35) {
      Ensure-Member $f "hours_text" (($hoursTxt.Trim() + $pad.hours_pad_a).Trim())
    }
    Ensure-Member $j "layoutOrder" $orderA
  }

  $pc = [int]$j.draftCounts."about-photos"
  $wc = [int]$j.draftCounts."works-list"
  if ($pc -lt 3) { $pc = 3; $j.draftCounts."about-photos" = 3 }
  if ($wc -lt 3) { $wc = 3; $j.draftCounts."works-list" = 3 }

  $slots = New-Object System.Collections.Generic.List[string]
  [void]$slots.Add("hero.jpg")
  for ($i = 1; $i -le $pc; $i++) { [void]$slots.Add(("about-{0:d2}.jpg" -f $i)) }
  for ($i = 1; $i -le $wc; $i++) { [void]$slots.Add(("work-{0:d2}.jpg" -f $i)) }

  $ip = @{}
  $ip["hero_image"] = ("sushi-samples/{0}/images/hero.jpg?v=dense2" -f $folder)
  for ($i = 1; $i -le $pc; $i++) {
    $ip[("about_image_{0}" -f $i)] = ("sushi-samples/{0}/images/about-{1:d2}.jpg?v=dense2" -f $folder, $i)
  }
  for ($i = 1; $i -le $wc; $i++) {
    $ip[("work_{0}_image" -f $i)] = ("sushi-samples/{0}/images/work-{1:d2}.jpg?v=dense2" -f $folder, $i)
  }
  Ensure-Member $j "imagePaths" ([pscustomobject]$ip)

  $pr = ""; try { $pr = [string]$j.itemLayouts."about-photos".recipe } catch {}
  $wr = ""; try { $wr = [string]$j.itemLayouts."works-list".recipe } catch {}
  Ensure-Member $j "layoutRecipeNote" ("photo={0} works={1} dense=2 pair=1" -f $pr, $wr)

  Json-Save $j $draftPath

  if (Test-Path $metaPath) {
    $m = [IO.File]::ReadAllText($metaPath, $utf8) | ConvertFrom-Json
    Ensure-Member $m "layoutPattern" $lp
    Ensure-Member $m "layoutOrder" @($j.layoutOrder)
    Ensure-Member $m "counts" ([pscustomobject]@{
      "hero-leads" = [int]$j.draftCounts."hero-leads"
      "hero-values" = [int]$j.draftCounts."hero-values"
      "about-accordions" = [int]$j.draftCounts."about-accordions"
      "about-photos" = $pc
      "works-list" = $wc
    })
    Ensure-Member $m "extras" ([pscustomobject]@{
      hours = [bool]$j.draftExtras.hours
      access = [bool]$j.draftExtras.access
      address = [bool]$j.draftExtras.address
    })
    Ensure-Member $m "imageSlots" @($slots)
    Json-Save $m $metaPath
  }

  Write-Host ("OK {0} L={1} p={2} w={3} access={4}" -f $folder.Substring(0,2), $lp, $pc, $wc, $j.draftExtras.access)
}

Write-Host "DONE pair-sync"
