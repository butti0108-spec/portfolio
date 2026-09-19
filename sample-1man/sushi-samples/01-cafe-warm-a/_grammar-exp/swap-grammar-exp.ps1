# Swap 01 grammar-exp draft onto live draft.json
# Usage: .\swap-grammar-exp.ps1 E3
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("E0", "E3", "E4", "E5", "E6")]
  [string]$Which
)
$ErrorActionPreference = "Stop"
$sample = Split-Path -Parent $MyInvocation.MyCommand.Path
$exp = Join-Path $sample "_grammar-exp"
$map = @{
  E0 = "E0-baseline-draft.json"
  E3 = "E3-curtain-draft.json"
  E4 = "E4-diptych-draft.json"
  E5 = "E5-color-slit-draft.json"
  E6 = "E6-approach-draft.json"
}
$src = Join-Path $exp $map[$Which]
$dst = Join-Path $sample "draft.json"
$tmp = Join-Path $sample "draft.json.tmp"
if (-not (Test-Path $src)) { throw "missing $src" }
Copy-Item -Force $src $tmp
Move-Item -Force $tmp $dst
Write-Host "live draft.json <= $($map[$Which])"
Write-Host "Reload the maker page to see it."
