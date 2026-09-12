# TcpListener static server (no HttpListener URL ACL). Serves portfolio root.
# POST /sample-1man/sushi-samples/__capture-save?key=01-cafe-warm-a  (raw PNG body)
$ErrorActionPreference = "Stop"
$sampleRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $sampleRoot
$port = if ($env:SAMPLE1MAN_PORT) { [int]$env:SAMPLE1MAN_PORT } else { 8765 }
$rootFull = [IO.Path]::GetFullPath($root)
$sushiRoot = [IO.Path]::GetFullPath((Join-Path $sampleRoot "sushi-samples"))

$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "tcp static http://127.0.0.1:$port/sample-1man/index.html"

function Get-ContentType([string]$ext) {
  switch ($ext.ToLowerInvariant()) {
    ".css" { return "text/css; charset=utf-8" }
    ".js" { return "application/javascript; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".svg" { return "image/svg+xml; charset=utf-8" }
    ".png" { return "image/png" }
    ".jpg" { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".webp" { return "image/webp" }
    ".html" { return "text/html; charset=utf-8" }
    ".woff" { return "font/woff" }
    ".woff2" { return "font/woff2" }
    default { return "application/octet-stream" }
  }
}

function Read-Headers([IO.Stream]$stream) {
  $ms = New-Object IO.MemoryStream
  $prev = -1
  while ($true) {
    $b = $stream.ReadByte()
    if ($b -lt 0) { break }
    $ms.WriteByte([byte]$b)
    if ($prev -eq 13 -and $b -eq 10) {
      $arr = $ms.ToArray()
      if ($arr.Length -ge 4 -and $arr[$arr.Length-4] -eq 13 -and $arr[$arr.Length-3] -eq 10) { break }
    }
    $prev = $b
  }
  return [Text.Encoding]::ASCII.GetString($ms.ToArray())
}

function Write-Response([IO.Stream]$stream, [string]$status, [string]$ctype, [byte[]]$body) {
  if ($null -eq $body) { $body = [byte[]]::new(0) }
  $header = "HTTP/1.1 $status`r`nContent-Type: $ctype`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n"
  $hb = [Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($hb, 0, $hb.Length)
  if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $rawHead = Read-Headers $stream
    if ([string]::IsNullOrEmpty($rawHead)) { continue }
    $lines = $rawHead -split "`r`n"
    $reqLine = $lines[0]
    $parts = $reqLine.Split(" ")
    $method = $parts[0]
    $rawPath = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
    $qIdx = $rawPath.IndexOf("?")
    $pathOnly = if ($qIdx -ge 0) { $rawPath.Substring(0, $qIdx) } else { $rawPath }
    $query = if ($qIdx -ge 0) { $rawPath.Substring($qIdx + 1) } else { "" }
    $contentLength = 0
    foreach ($line in $lines) {
      if ($line -like "Content-Length:*") {
        $contentLength = [int]($line.Substring(15).Trim())
      }
    }
    $bodyIn = [byte[]]::new(0)
    if ($contentLength -gt 0) {
      $bodyIn = New-Object byte[] $contentLength
      $read = 0
      while ($read -lt $contentLength) {
        $n = $stream.Read($bodyIn, $read, $contentLength - $read)
        if ($n -le 0) { break }
        $read += $n
      }
    }

    # Normalize trailing slash for API routes before rewriting dirs to index.html
    if ($pathOnly.EndsWith("/") -and $pathOnly.Length -gt 1) {
      $trimPath = $pathOnly.TrimEnd("/")
      if ($trimPath -like "*/__capture-save" -or $trimPath -like "*/__review-decision") {
        $pathOnly = $trimPath
      }
    }

    if ($pathOnly -eq "/") { $pathOnly = "/sample-1man/index.html" }
    if ($pathOnly.EndsWith("/")) { $pathOnly = $pathOnly + "index.html" }

    if ($method -eq "OPTIONS") {
      Write-Response $stream "204 No Content" "text/plain" ([byte[]]::new(0))
      continue
    }

    if ($method -eq "POST" -and $pathOnly -eq "/sample-1man/sushi-samples/__capture-save") {
      $key = $null
      foreach ($pair in ($query -split "&")) {
        if ($pair -like "key=*") { $key = [Uri]::UnescapeDataString($pair.Substring(4)) }
      }
      if ([string]::IsNullOrWhiteSpace($key) -or $key -match '[\\/:\*\?\"<>\|]' -or $key.Contains("..")) {
        Write-Response $stream "400 Bad Request" "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes('{"ok":false,"reason":"bad-key"}'))
        continue
      }
      $dir = Join-Path $sushiRoot $key
      if (-not (Test-Path -LiteralPath $dir -PathType Container)) {
        Write-Response $stream "404 Not Found" "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes('{"ok":false,"reason":"missing-dir"}'))
        continue
      }
      $previewPath = Join-Path $dir "preview.png"
      [IO.File]::WriteAllBytes($previewPath, $bodyIn)
      $salesPack = Join-Path $sushiRoot ("_sales\packs\" + $key)
      New-Item -ItemType Directory -Force -Path $salesPack | Out-Null
      [IO.File]::Copy($previewPath, (Join-Path $salesPack "preview.png"), $true)
      $msg = "{`"ok`":true,`"key`":`"$key`",`"bytes`":$($bodyIn.Length)}"
      Write-Response $stream "200 OK" "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes($msg))
      continue
    }

    if ($method -eq "POST" -and $pathOnly -eq "/sample-1man/sushi-samples/__review-decision") {
      $key = $null
      $action = $null
      foreach ($pair in ($query -split "&")) {
        if ($pair -like "key=*") { $key = [Uri]::UnescapeDataString($pair.Substring(4)) }
        if ($pair -like "action=*") { $action = [Uri]::UnescapeDataString($pair.Substring(7)) }
      }
      if ([string]::IsNullOrWhiteSpace($key) -or $key -match '[\\/:\*\?\"<>\|]' -or $key.Contains("..")) {
        Write-Response $stream "400 Bad Request" "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes('{"ok":false,"reason":"bad-key"}'))
        continue
      }
      if ($action -ne "approve" -and $action -ne "reject") {
        Write-Response $stream "400 Bad Request" "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes('{"ok":false,"reason":"bad-action"}'))
        continue
      }

      $payload = $null
      $severity = "drop"
      $reasons = @()
      $reasonLabels = @()
      $note = ""
      if ($bodyIn.Length -gt 0) {
        try {
          $payload = ([Text.Encoding]::UTF8.GetString($bodyIn) | ConvertFrom-Json)
          if ($payload.severity) { $severity = [string]$payload.severity }
          if ($payload.note) { $note = [string]$payload.note }
          if ($payload.reasons) { $reasons = @($payload.reasons | ForEach-Object { [string]$_ }) }
          if ($payload.reasonLabels) { $reasonLabels = @($payload.reasonLabels | ForEach-Object { [string]$_ }) }
        } catch {
          $payload = $null
        }
      }
      if ($severity -ne "fix") { $severity = "drop" }

      # STATUS labels via UTF-8 bytes (PS5 source encoding safe)
      $stateApprove = [Text.Encoding]::UTF8.GetString([byte[]](0xE5,0x96,0xB6,0xE6,0xA5,0xAD,0xE6,0xA0,0xBC,0xE7,0xB4,0x8D)) # eigyou-kakunou
      $stateFix = [Text.Encoding]::UTF8.GetString([byte[]](0xE8,0xA6,0x81,0xE4,0xBF,0xAE,0xE6,0xAD,0xA3)) # you-shuusei
      $stateNg = "NG"
      if ($action -eq "approve") {
        $state = $stateApprove
      } elseif ($severity -eq "fix") {
        $state = $stateFix
      } else {
        $state = $stateNg
      }

      $memoParts = @()
      if ($reasonLabels.Count -gt 0) { $memoParts += ($reasonLabels -join "/") }
      elseif ($reasons.Count -gt 0) { $memoParts += ($reasons -join "/") }
      if (-not [string]::IsNullOrWhiteSpace($note)) { $memoParts += $note }
      $memo = ($memoParts -join " | ").Replace("|", "/").Replace("`r", " ").Replace("`n", " ").Trim()
      if ($memo.Length -gt 120) { $memo = $memo.Substring(0, 120) }

      $statusPath = Join-Path $sushiRoot "_materials\STATUS.md"
      $statusNote = "ok"
      if (Test-Path -LiteralPath $statusPath) {
        try {
          $utf8 = [Text.UTF8Encoding]::new($false)
          $text = [IO.File]::ReadAllText($statusPath, $utf8)
          $pattern = '(?m)^(\|\s*\d+\s*\|\s*' + [regex]::Escape($key) + '\s*\|\s*[^|]*\|)\s*[^|]*\s*\|\s*[^|]*(\s*\|?\s*)$'
          $replacement = '${1} ' + $state + ' | ' + $memo + ' |'
          $replaced = [regex]::Replace($text, $pattern, $replacement, 1)
          if ($replaced -eq $text) {
            # fallback: state column only
            $pattern2 = '(?m)^(\|\s*\d+\s*\|\s*' + [regex]::Escape($key) + '\s*\|\s*[^|]*\|)\s*[^|]*(\s*\|.*)$'
            $replaced = [regex]::Replace($text, $pattern2, ('${1} ' + $state + ' ${2}'), 1)
            if ($replaced -eq $text) { $statusNote = "row-not-found" }
          }
          if ($statusNote -ne "row-not-found") {
            $written = $false
            for ($attempt = 1; $attempt -le 5; $attempt++) {
              try {
                [IO.File]::WriteAllText($statusPath, $replaced, $utf8)
                $written = $true
                break
              } catch {
                Start-Sleep -Milliseconds (120 * $attempt)
              }
            }
            if (-not $written) { $statusNote = "status-write-locked" }
          }
        } catch {
          $statusNote = "status-write-failed"
        }
      } else {
        $statusNote = "status-missing"
      }

      # NOTES.md append (UTF-8 from client labels)
      try {
        $notesDir = Join-Path $sushiRoot ("_materials\" + $key)
        if (Test-Path -LiteralPath $notesDir -PathType Container) {
          $notesPath = Join-Path $notesDir "NOTES.md"
          $utf8n = [Text.UTF8Encoding]::new($false)
          $stamp = [DateTime]::Now.ToString("yyyy-MM-dd HH:mm")
          $kind = if ($action -eq "approve") { "approve" } elseif ($severity -eq "fix") { "fix" } else { "drop" }
          $line = "- [$stamp] $kind"
          if ($reasonLabels.Count -gt 0) { $line += " / " + ($reasonLabels -join ", ") }
          if (-not [string]::IsNullOrWhiteSpace($note)) { $line += " / note: " + $note.Replace("`r", " ").Replace("`n", " ") }
          $line += "`n"
          if (-not (Test-Path -LiteralPath $notesPath)) {
            $header = "# Review notes - $key`n`n"
            [IO.File]::WriteAllText($notesPath, $header + $line, $utf8n)
          } else {
            [IO.File]::AppendAllText($notesPath, $line, $utf8n)
          }
        }
      } catch {}

      # Only hard-drop deletes saved PNGs. fix keeps them for rework.
      if ($action -eq "reject" -and $severity -eq "drop") {
        $salesPng = Join-Path $sushiRoot ("_sales\packs\" + $key + "\preview.png")
        if (Test-Path -LiteralPath $salesPng) { Remove-Item -LiteralPath $salesPng -Force -ErrorAction SilentlyContinue }
        $samplePng = Join-Path $sushiRoot ($key + "\preview.png")
        if (Test-Path -LiteralPath $samplePng) { Remove-Item -LiteralPath $samplePng -Force -ErrorAction SilentlyContinue }
      }

      $msg = "{`"ok`":true,`"key`":`"$key`",`"action`":`"$action`",`"severity`":`"$severity`",`"status`":`"$statusNote`"}"
      Write-Response $stream "200 OK" "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes($msg))
      continue
    }

    $rel = [Uri]::UnescapeDataString($pathOnly.TrimStart("/")).Replace("/", [IO.Path]::DirectorySeparatorChar)
    $file = [IO.Path]::GetFullPath((Join-Path $rootFull $rel))
    if ($method -ne "GET" -and $method -ne "HEAD") {
      $safePath = $pathOnly.Replace('"', '')
      $body405 = "{`"ok`":false,`"reason`":`"method-not-allowed`",`"path`":`"$safePath`"}"
      Write-Response $stream "405 Method Not Allowed" "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes($body405))
    } elseif (-not $file.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
      Write-Response $stream "403 Forbidden" "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes("{`"ok`":false,`"reason`":`"forbidden`"}"))
    } elseif (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
      $safePath = $pathOnly.Replace('"', '')
      $body404 = "{`"ok`":false,`"reason`":`"not-found`",`"path`":`"$safePath`"}"
      Write-Response $stream "404 Not Found" "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes($body404))
    } else {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ctype = Get-ContentType ([IO.Path]::GetExtension($file))
      if ($method -eq "HEAD") {
        Write-Response $stream "200 OK" $ctype ([byte[]]::new(0))
      } else {
        Write-Response $stream "200 OK" $ctype $bytes
      }
    }
  } catch {
    try {
      $safe = ($_.Exception.Message -replace '[\r\n"]', ' ').Trim()
      if ($safe.Length -gt 180) { $safe = $safe.Substring(0, 180) }
      $errJson = "{`"ok`":false,`"reason`":`"server-error`",`"detail`":`"$safe`"}"
      Write-Response $stream "500 Internal Server Error" "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes($errJson))
    } catch {}
  } finally {
    try { $client.Close() } catch {}
  }
}
