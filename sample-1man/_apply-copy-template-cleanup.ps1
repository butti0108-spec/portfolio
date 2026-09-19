# Apply template-cleanup patches from UTF-8 JSON (ASCII-only script body)
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path ".").Path
$sushi = Join-Path $repo "sample-1man\sushi-samples"
$patchPath = Join-Path $repo "sample-1man\_copy-template-cleanup-patches.json"
$utf8 = New-Object System.Text.UTF8Encoding $false
$patch = [IO.File]::ReadAllText($patchPath, $utf8) | ConvertFrom-Json
$accessClean = [string]$patch.access_clean
$log = New-Object System.Collections.Generic.List[string]

function Set-Field([ref]$text, [string]$key, [string]$val) {
  $pat = '"' + [regex]::Escape($key) + '"\s*:\s*"[^"]*"'
  if (-not [regex]::IsMatch($text.Value, $pat)) {
    throw "missing key $key"
  }
  $esc = $val.Replace('\', '\\').Replace('"', '\"')
  $rep = '"' + $key + '": "' + $esc + '"'
  $text.Value = [regex]::Replace($text.Value, $pat, $rep, 1)
}

function Clean-AddressAccess([ref]$text) {
  # address_text: keep only part before " / " + access phrase if present
  $m = [regex]::Match($text.Value, '"address_text"\s*:\s*"([^"]*)"')
  if ($m.Success) {
    $addr = $m.Groups[1].Value
    if ($addr -match ' / ') {
      $addr2 = ($addr -split ' / ')[0].Trim()
      Set-Field $text "address_text" $addr2
    }
  }
  Set-Field $text "access_text" $accessClean
}

foreach ($prop in $patch.sites.PSObject.Properties) {
  $id = $prop.Name
  $site = $prop.Value
  $dir = Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like ($id + "-*") } | Select-Object -First 1
  if (-not $dir) { throw "missing $id" }
  $path = Join-Path $dir.FullName "draft.json"
  $t = [IO.File]::ReadAllText($path, $utf8)
  $touched = New-Object System.Collections.Generic.List[string]

  if ($site.clean_address_access -eq $true) {
    Clean-AddressAccess ([ref]$t)
    $touched.Add("address/access")
  }

  foreach ($k in @("value_3_title","value_3_text","work_3_title","work_3_text","hours_text","contact_note_1","contact_note_2")) {
    if ($null -ne $site.PSObject.Properties[$k] -and $null -ne $site.$k -and [string]$site.$k -ne "") {
      Set-Field ([ref]$t) $k ([string]$site.$k)
      $touched.Add($k)
    }
  }

  # bump brush stamp without breaking JSON
  if ($t -match '"brushUpPhoto"') {
    $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-18-copy-template-cleanup"', 1)
  } else {
    $t = [regex]::Replace($t, '("version"\s*:\s*\d+,)', '${1}"brushUpPhoto":"2026-09-18-copy-template-cleanup",', 1)
  }

  $null = $t | ConvertFrom-Json
  $tmp = Join-Path $env:TEMP ("draft-" + $id + ".json")
  [IO.File]::WriteAllText($tmp, $t, $utf8)
  for ($a = 1; $a -le 10; $a++) {
    try {
      [IO.File]::Copy($tmp, $path, $true)
      break
    } catch {
      if ($a -eq 10) { throw }
      Start-Sleep -Milliseconds (300 * $a)
    }
  }
  Remove-Item $tmp -Force -EA SilentlyContinue
  $log.Add("OK $id " + ($touched -join ","))
  Write-Host ("OK $id " + ($touched -join ","))
}

# verify leftovers in first-team only
$ids = @("01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","18","19","21","23","26","28","29","30")
$bad = New-Object System.Collections.Generic.List[string]
$air = [string]$patch.verify.air_combo
$visit = [string]$patch.verify.short_visit
$hoursDup = [string]$patch.verify.hours_dup
foreach ($id in $ids) {
  $dir = Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like ($id + "-*") } | Select-Object -First 1
  $raw = [IO.File]::ReadAllText((Join-Path $dir.FullName "draft.json"), $utf8)
  if ($raw -match 'Address:') { $bad.Add("$id Address:") }
  if ($air -and $raw.Contains($air)) { $bad.Add("$id air-combo") }
  if ($visit -and $raw.Contains($visit)) { $bad.Add("$id short-visit-shop") }
  if ($hoursDup -and $raw.Contains($hoursDup)) { $bad.Add("$id hours-dup") }
}
Write-Host ("bad_count=" + $bad.Count)
$bad | ForEach-Object { Write-Host $_ }
[IO.File]::WriteAllLines((Join-Path $sushi "_copy-template-cleanup-log.txt"), $log, $utf8)
Write-Host "DONE"
