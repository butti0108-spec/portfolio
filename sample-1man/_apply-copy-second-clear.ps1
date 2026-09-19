# Apply clear second-audit residual fixes (ASCII-only script)
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path ".").Path
$sushi = Join-Path $repo "sample-1man\sushi-samples"
$utf8 = New-Object System.Text.UTF8Encoding $false
$patchPath = Join-Path $repo "sample-1man\_copy-second-audit-clear-fixes.json"
$patch = [IO.File]::ReadAllText($patchPath, $utf8) | ConvertFrom-Json
$ids = @("01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","18","19","21","23","26","28","29","30")

function Set-Field([ref]$text, [string]$key, [string]$val) {
  $pat = '"' + [regex]::Escape($key) + '"\s*:\s*"[^"]*"'
  if (-not [regex]::IsMatch($text.Value, $pat)) { throw "missing $key in draft" }
  $esc = $val.Replace('\', '\\').Replace('"', '\"')
  $rep = '"' + $key + '": "' + $esc + '"'
  $text.Value = [regex]::Replace($text.Value, $pat, $rep, 1)
}

function Save-Draft([string]$path, [string]$t) {
  $null = $t | ConvertFrom-Json
  $tmp = Join-Path $env:TEMP ("draft-fix-" + [guid]::NewGuid().ToString("n") + ".json")
  [IO.File]::WriteAllText($tmp, $t, $utf8)
  for ($a = 1; $a -le 10; $a++) {
    try { [IO.File]::Copy($tmp, $path, $true); break }
    catch { if ($a -eq 10) { throw }; Start-Sleep -Milliseconds (300 * $a) }
  }
  Remove-Item $tmp -Force -EA SilentlyContinue
}

foreach ($id in $ids) {
  $dir = Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like ($id + "-*") } | Select-Object -First 1
  $path = Join-Path $dir.FullName "draft.json"
  $t = [IO.File]::ReadAllText($path, $utf8)
  $changed = $false

  $m = [regex]::Match($t, '"address_text"\s*:\s*"([^"]*)"')
  if ($m.Success -and $m.Groups[1].Value -match ' / ') {
    $addr2 = ($m.Groups[1].Value -split ' / ')[0].Trim()
    Set-Field ([ref]$t) "address_text" $addr2
    $changed = $true
    Write-Host "strip-address $id"
  }

  if ($null -ne $patch.sites.PSObject.Properties[$id]) {
    $site = $patch.sites.$id
    foreach ($k in @("hours_text","address_text","access_text","contact_note_1","contact_note_2")) {
      if ($null -ne $site.PSObject.Properties[$k] -and [string]$site.$k -ne "") {
        Set-Field ([ref]$t) $k ([string]$site.$k)
        $changed = $true
        Write-Host "patch $id $k"
      }
    }
  }

  if ($changed) {
    if ($t -match '"brushUpPhoto"') {
      $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":"2026-09-18-copy-second-clear"', 1)
    }
    Save-Draft $path $t
  }
}

Write-Host "DONE apply"
