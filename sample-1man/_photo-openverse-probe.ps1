$ErrorActionPreference = "Stop"
$queries = @(
  "hair salon interior white",
  "flower bouquet arrangement",
  "hairdresser cutting hair",
  "japanese izakaya lantern",
  "yakitori grill night",
  "ramen bowl steam",
  "bakery bread display case",
  "yoga studio floor sunlight",
  "green leaves forest light",
  "cafe window greenery coffee"
)
foreach ($q in $queries) {
  Write-Host "=== $q ==="
  $uri = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($q))&license_type=commercial&page_size=4"
  try {
    $r = Invoke-RestMethod -Uri $uri -TimeoutSec 40 -Headers @{ "User-Agent" = "kuru-portfolio-photo-wv/1.0" }
    foreach ($item in @($r.results | Select-Object -First 4)) {
      Write-Host ("- " + $item.id + " | " + $item.width + "x" + $item.height)
      Write-Host ("  " + $item.url)
    }
  } catch {
    Write-Host ("FAIL: " + $_.Exception.Message)
  }
}
