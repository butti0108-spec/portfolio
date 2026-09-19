$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..")
$img = Join-Path $repo "sample-1man\sushi-samples\01-cafe-warm-a\images"
$mat = Join-Path $repo "sample-1man\sushi-samples\_materials\01-cafe-warm-a\images"
New-Item -ItemType Directory -Force -Path $img,$mat | Out-Null

# Verified Unsplash download short-IDs / direct photo URLs (cafe/coffee)
$map = [ordered]@{
  "hero.jpg"     = "https://unsplash.com/photos/_yJXuiFdsPo/download?force=true&w=1600"
  "about-01.jpg" = "https://images.unsplash.com/photo-1752756992329-961db6366376?auto=format&fit=crop&w=1600&q=80"
  "about-02.jpg" = "https://loremflickr.com/1600/1000/coffee,latte?lock=10102"
  "about-03.jpg" = "https://loremflickr.com/1600/1000/croissant,cafe?lock=10103"
  "work-01.jpg"  = "https://loremflickr.com/1600/1000/coffee,cup?lock=10111"
  "work-02.jpg"  = "https://loremflickr.com/1600/1000/latte,art?lock=10112"
  "work-03.jpg"  = "https://loremflickr.com/1600/1000/cafe,interior?lock=10113"
}

foreach ($k in $map.Keys) {
  $dest = Join-Path $img $k
  Write-Host "GET $k"
  Invoke-WebRequest -Uri $map[$k] -OutFile $dest -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 8
  $len = (Get-Item $dest).Length
  if ($len -lt 8000) { throw "small $k" }
  Copy-Item $dest (Join-Path $mat $k) -Force
  Write-Host "  ok $len"
}
