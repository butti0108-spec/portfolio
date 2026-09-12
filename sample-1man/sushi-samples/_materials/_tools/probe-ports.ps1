$ports = @(8765, 28931, 8080, 5500)
foreach ($p in $ports) {
  try {
    $r = Invoke-WebRequest -Uri ("http://127.0.0.1:{0}/sample-1man/review-dash/" -f $p) -UseBasicParsing -TimeoutSec 3
    Write-Host ("OK {0} status={1}" -f $p, $r.StatusCode)
  } catch {
    Write-Host ("FAIL {0} {1}" -f $p, $_.Exception.Message)
  }
}
