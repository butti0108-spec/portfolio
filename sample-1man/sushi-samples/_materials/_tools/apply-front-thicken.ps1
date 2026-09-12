# Apply front-thicken-data.json onto draft.json fields (UTF-8).
$ErrorActionPreference = "Stop"
$tools = $PSScriptRoot
$sushi = [IO.Path]::GetFullPath((Join-Path $tools "..\.."))
$dataPath = Join-Path $tools "front-thicken-data.json"
$utf8 = New-Object System.Text.UTF8Encoding $false
$data = Get-Content -LiteralPath $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json
$n = 0

function Set-JsonStringField([ref]$raw, [string]$key, [string]$val) {
  $escaped = $val.Replace("\", "\\").Replace('"', '\"')
  $pat = '"' + [regex]::Escape($key) + '"\s*:\s*"(?:\\.|[^"\\])*"'
  $rep = '"' + $key + '":  "' + $escaped + '"'
  if ($raw.Value -match $pat) {
    $raw.Value = [regex]::Replace($raw.Value, $pat, $rep, 1)
    return $true
  }
  return $false
}

$data.PSObject.Properties | ForEach-Object {
  $folder = $_.Name
  $pack = $_.Value
  $path = Join-Path (Join-Path $sushi $folder) "draft.json"
  if (-not (Test-Path -LiteralPath $path)) {
    Write-Host ("MISS " + $folder)
    return
  }
  $raw = [IO.File]::ReadAllText($path, $utf8)
  $j = $raw | ConvertFrom-Json
  $changed = $false
  $pack.PSObject.Properties | ForEach-Object {
    $k = $_.Name
    $v = [string]$_.Value
    if ([string]::IsNullOrWhiteSpace($v)) { return }
    $cur = ""
    if ($j.fields -and $j.fields.PSObject.Properties.Name -contains $k) {
      $cur = [string]$j.fields.$k
    }
    $need = $false
    if ($k -eq "hero_title") {
      $br = [string]$j.fields.brand_name
      if ($cur -eq $br -or $cur.Length -lt 12) { $need = $true }
    } elseif ($k -like "hero_lead_*") {
      if ($cur.Length -lt 28) { $need = $true }
    } elseif ($k -like "work_*") {
      if ([string]::IsNullOrWhiteSpace($cur)) { $need = $true }
    } else {
      $need = $true
    }
    if ($need) {
      if (Set-JsonStringField ([ref]$raw) $k $v) { $changed = $true }
    }
  }
  if ($pack.hero_lead_1 -and $pack.hero_lead_2) {
    $raw = [regex]::Replace($raw, '("hero-leads"\s*:\s*)\d+', '${1}2')
  }
  if ($changed) {
    try {
      $null = $raw | ConvertFrom-Json
      [IO.File]::WriteAllText($path, $raw, $utf8)
      Write-Host ("OK " + $folder)
      $script:n++
    } catch {
      Write-Host ("BAD " + $folder + " :: " + $_.Exception.Message)
    }
  } else {
    Write-Host ("SKIP " + $folder)
  }
}
Write-Host ("patched=$n")
