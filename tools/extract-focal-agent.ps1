$ids = @(
  "8cd4564d-e625-4990-a77d-aedf49eaa38d",
  "e7a0031d-01dc-45b6-bec4-a9ec77ad1df2",
  "45c6638b-005c-4d43-9efa-e5f47860235a"
)
$dir = "C:\Users\masub\.cursor\projects\c-Users-masub-OneDrive\agent-transcripts\a57fda39-e2b2-4262-ba29-6f64a95a9f7b\subagents"
foreach ($id in $ids) {
  $f = Join-Path $dir ($id + ".jsonl")
  Write-Host "==== $id bytes=$((Get-Item $f).Length)"
  Get-Content $f | ForEach-Object {
    if ($_ -match '"01-cafe' -or $_ -match '"11-clinic' -or $_ -match '"21-pet' -or $_ -match '```json') {
      $_ | Out-File -Append -Encoding utf8 (Join-Path $PSScriptRoot ("focal-extract-" + $id.Substring(0,8) + ".txt"))
    }
  }
}
