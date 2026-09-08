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

    if ($pathOnly -eq "/") { $pathOnly = "/sample-1man/index.html" }

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
      $shots = Join-Path $sushiRoot "shots"
      New-Item -ItemType Directory -Force -Path $shots | Out-Null
      $previewPath = Join-Path $dir "preview.png"
      $shotPath = Join-Path $shots ($key + ".png")
      [IO.File]::WriteAllBytes($previewPath, $bodyIn)
      [IO.File]::Copy($previewPath, $shotPath, $true)
      $progress = @{
        lastOk = [int]($key.Substring(0, 2))
        lastKey = $key
        updatedAt = (Get-Date).ToUniversalTime().ToString("o")
        bytes = $bodyIn.Length
      } | ConvertTo-Json -Compress
      [IO.File]::WriteAllText((Join-Path $sushiRoot "_capture-progress.json"), $progress, [Text.UTF8Encoding]::new($false))
      $msg = "{`"ok`":true,`"key`":`"$key`",`"bytes`":$($bodyIn.Length)}"
      Write-Response $stream "200 OK" "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes($msg))
      continue
    }

    $rel = [Uri]::UnescapeDataString($pathOnly.TrimStart("/")).Replace("/", [IO.Path]::DirectorySeparatorChar)
    $file = [IO.Path]::GetFullPath((Join-Path $rootFull $rel))
    if ($method -ne "GET" -and $method -ne "HEAD") {
      Write-Response $stream "405 Method Not Allowed" "text/plain; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes("405"))
    } elseif (-not $file.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
      Write-Response $stream "403 Forbidden" "text/plain; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes("403"))
    } elseif (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
      Write-Response $stream "404 Not Found" "text/plain; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes("404"))
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
      $err = [Text.Encoding]::UTF8.GetBytes(("server-error: " + $_.Exception.Message))
      Write-Response $stream "500 Internal Server Error" "text/plain; charset=utf-8" $err
    } catch {}
  } finally {
    try { $client.Close() } catch {}
  }
}
