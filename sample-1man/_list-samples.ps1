$ErrorActionPreference = 'Stop'
Get-ChildItem '.\sample-1man\sushi-samples' -Directory |
  Where-Object { $_.Name -match '^\d{2}-' } |
  Sort-Object Name |
  ForEach-Object { $_.Name }
