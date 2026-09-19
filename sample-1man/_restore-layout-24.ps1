# Restore FIRST_TEAM 24 layoutOrder + absences from 意味引き算 Ver0.1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sushi = Join-Path $root "sushi-samples"
$stamp = "2026-09-15-v01"
$utf8 = [Text.UTF8Encoding]::new($false)

$FIRST = @("01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","18","19","21","23","26","28","29","30")

# 並び骨 + 欠席（意味引き算表）。01は王道厚め（表に矢印なし）
$PLAN = @{
  "01" = @{
    Order = @("hero","values","photos","works","hours","access","address","accordions","contact")
    Off = @()
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "02" = @{
    Order = @("photos","works","hero","hours","access","address","contact")
    Off = @("values","accordions")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "03" = @{
    Order = @("hero","contact","photos","works","values","hours","accordions")
    Off = @()
    ExtrasOff = @("access","address")
    HeroImageOff = $false
  }
  "04" = @{
    Order = @("hours","contact","hero","values","works","access","address","accordions")
    Off = @("photos")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "05" = @{
    Order = @("hero","values","photos","works","hours","access","contact","address")
    Off = @("accordions")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "06" = @{
    Order = @("works","photos","hero","hours","access","contact","address")
    Off = @("values","accordions")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "07" = @{
    Order = @("hero","works","photos","values","hours","contact")
    Off = @("accordions")
    ExtrasOff = @("access","address")
    HeroImageOff = $false
  }
  "08" = @{
    Order = @("photos","works","contact","hours","access","address","hero")
    Off = @("values","accordions")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "09" = @{
    Order = @("photos","values","hours","contact","hero","access","address","accordions")
    Off = @("works")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "10" = @{
    Order = @("works","photos","hero","hours","access","contact","address")
    Off = @("values","accordions")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "11" = @{
    Order = @("hours","access","contact","hero","values","accordions","address")
    Off = @("photos","works")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "12" = @{
    Order = @("hero","contact","works","values","accordions")
    Off = @("photos")
    ExtrasOff = @("hours","access","address")
    HeroImageOff = $false
  }
  "13" = @{
    Order = @("values","works","photos","contact","hours","access","address","accordions")
    Off = @("hero")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "14" = @{
    Order = @("works","photos","access","address","hero")
    Off = @("contact","values","accordions")
    ExtrasOff = @("hours")
    HeroImageOff = $false
  }
  "15" = @{
    Order = @("hero","values","photos","works","hours","access","contact","address")
    Off = @("accordions")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "16" = @{
    Order = @("hours","contact","hero","values","works","access","address","accordions")
    Off = @("photos")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "18" = @{
    Order = @("works","photos","contact","hours","access","address")
    Off = @("hero","values","accordions")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "19" = @{
    Order = @("works","photos","hero","hours","access","contact","address")
    Off = @("values","accordions")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "21" = @{
    Order = @("hero","values","photos","works","hours","access","address","contact")
    Off = @()
    ExtrasOff = @()
    HeroImageOff = $true
  }
  "23" = @{
    Order = @("values","photos","works","hero","hours","access","contact","address")
    Off = @()
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "26" = @{
    Order = @("works","photos","access","address","hero")
    Off = @("contact","values","accordions")
    ExtrasOff = @("hours")
    HeroImageOff = $false
  }
  "28" = @{
    Order = @("photos","works","values","hours","access","address")
    Off = @("contact","hero","accordions")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "29" = @{
    Order = @("access","hours","contact","photos","works","hero","address")
    Off = @("values","accordions")
    ExtrasOff = @()
    HeroImageOff = $false
  }
  "30" = @{
    Order = @("works","photos","accordions","hero","values","address","contact","access")
    Off = @()
    ExtrasOff = @("hours")
    HeroImageOff = $false
  }
}

function Folder([string]$id) {
  Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
}

function Set-JsonProp([ref]$obj, [string]$name, $value) {
  if ($obj.Value.PSObject.Properties.Name -contains $name) {
    $obj.Value.$name = $value
  } else {
    $obj.Value | Add-Member -NotePropertyName $name -NotePropertyValue $value -Force
  }
}

$report = New-Object System.Collections.Generic.List[string]
$report.Add("id`tfolder`tfirst`toff`textrasOff`theroImgOff")

foreach ($id in $FIRST) {
  if (-not $PLAN.ContainsKey($id)) { throw "no plan $id" }
  $dir = Folder $id
  if (-not $dir) { throw "no folder $id" }
  $path = Join-Path $dir.FullName "draft.json"
  $raw = [IO.File]::ReadAllText($path, $utf8)
  $j = $raw | ConvertFrom-Json

  $p = $PLAN[$id]
  $order = [string[]]$p.Order

  # layoutBlockOff: only listed offs as true; clear others by replacing object
  $off = [ordered]@{}
  foreach ($k in @($p.Off)) { $off[$k] = $true }

  # draftExtras: hours/access/address on unless in ExtrasOff
  $ex = [ordered]@{ hours = $true; access = $true; address = $true }
  foreach ($k in @($p.ExtrasOff)) { $ex[$k] = $false }
  # If order doesn't include an extra, keep off
  foreach ($k in @("hours","access","address")) {
    if ($order -notcontains $k) { $ex[$k] = $false }
  }

  $j.layoutOrder = $order
  Set-JsonProp ([ref]$j) "layoutBlockOff" ([pscustomobject]$off)
  Set-JsonProp ([ref]$j) "draftExtras" ([pscustomobject]$ex)
  Set-JsonProp ([ref]$j) "heroImageOff" ([bool]$p.HeroImageOff)
  Set-JsonProp ([ref]$j) "brushUpMeaning" $stamp
  Set-JsonProp ([ref]$j) "brushUpStructure" "2026-09-14-v01"

  # Ensure layoutSelected / pattern A
  Set-JsonProp ([ref]$j) "layoutPattern" "a"
  Set-JsonProp ([ref]$j) "layoutSelected" $true

  $out = $j | ConvertTo-Json -Depth 40 -Compress
  # PowerShell ConvertTo-Json can mangle some unicode; re-read via Newtonsoft-less path:
  # Use ConvertTo-Json Depth without Compress for readability? Prefer keep UTF8.
  $pretty = $j | ConvertTo-Json -Depth 40
  [IO.File]::WriteAllText($path, $pretty, $utf8)

  $report.Add("$id`t$($dir.Name)`t$($order[0])`t$($p.Off -join ',')`t$($p.ExtrasOff -join ',')`t$($p.HeroImageOff)")
  Write-Host ("OK $id first=$($order[0]) off=$($p.Off -join ',')")
}

$repPath = Join-Path $root "_layout-restore-24-report.tsv"
[IO.File]::WriteAllText($repPath, ($report -join "`n"), $utf8)
Write-Host "wrote $repPath"
