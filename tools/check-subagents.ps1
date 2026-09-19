$dir = "C:\Users\masub\.cursor\projects\c-Users-masub-OneDrive\agent-transcripts\a57fda39-e2b2-4262-ba29-6f64a95a9f7b\subagents"
Get-ChildItem $dir -Filter *.jsonl | ForEach-Object {
  Write-Host ("FILE " + $_.Name + " bytes=" + $_.Length)
  $lines = Get-Content $_.FullName -Tail 3
  foreach ($line in $lines) {
    if ($line -match '"type":"result"' -or $line -match 'focal' -or $line -match '"01-cafe') {
      Write-Host $line.Substring(0, [Math]::Min(500, $line.Length))
    }
  }
}
