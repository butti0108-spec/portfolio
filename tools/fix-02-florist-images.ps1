$ErrorActionPreference = "Stop"
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -ErrorAction SilentlyContinue
# tools/ -> repo root
$repo = Resolve-Path (Join-Path $PSScriptRoot "..")
$base = Join-Path $repo "sample-1man\sushi-samples\02-cafe-split-b\images"
$mat = Join-Path $repo "sample-1man\sushi-samples\_materials\02-cafe-split-b\images"
New-Item -ItemType Directory -Force -Path $base | Out-Null
New-Item -ItemType Directory -Force -Path $mat | Out-Null
Write-Host "base=$base"

$map = [ordered]@{
  "hero.jpg"     = "https://images.unsplash.com/photo-1652285952505-2889737aa850?auto=format&fit=crop&w=1600&q=80"
  "about-01.jpg" = "https://images.unsplash.com/photo-1690899200948-36dba0df9c87?auto=format&fit=crop&w=1600&q=80"
  "about-02.jpg" = "https://images.unsplash.com/photo-1681994963119-82d16372a15f?auto=format&fit=crop&w=1600&q=80"
  "about-03.jpg" = "https://images.unsplash.com/photo-1743077470057-e35132afa40d?auto=format&fit=crop&w=1600&q=80"
  "about-04.jpg" = "https://loremflickr.com/1600/1000/florist,flowers?lock=50011"
  "work-01.jpg"  = "https://loremflickr.com/1600/1000/bouquet,single-flower?lock=50021"
  "work-02.jpg"  = "https://loremflickr.com/1600/1000/flower-arrangement,bouquet?lock=50022"
  "work-03.jpg"  = "https://loremflickr.com/1600/1000/potted-plant,flowers?lock=90203"
}

$work03Fallbacks = @(
  "https://images.unsplash.com/photo-1652285952505-2889737aa850?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1690899200948-36dba0df9c87?auto=format&fit=crop&w=1600&q=80",
  "https://loremflickr.com/1600/1000/potted-plant,cut-flowers?lock=90203",
  "https://loremflickr.com/1600/1000/potted-plant,flowers?lock=90203"
)

function Save-Image([string]$url, [string]$dest) {
  Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 8
  $len = (Get-Item -LiteralPath $dest).Length
  if ($len -lt 8000) { throw "too small $len" }
  return $len
}

foreach ($k in $map.Keys) {
  $dest = Join-Path $base $k
  $urls = @($map[$k])
  if ($k -eq "work-03.jpg") { $urls = $work03Fallbacks }
  $ok = $false
  foreach ($url in $urls) {
    try {
      Write-Host "GET $k"
      $len = Save-Image $url $dest
      Copy-Item -LiteralPath $dest -Destination (Join-Path $mat $k) -Force
      Write-Host "  ok $len"
      $ok = $true
      break
    } catch {
      Write-Host ("  FAIL " + $_.Exception.Message)
    }
  }
  if (-not $ok) { Write-Host "FAILED ALL for $k" }
}
