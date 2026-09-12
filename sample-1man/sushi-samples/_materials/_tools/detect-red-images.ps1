# Softer red detection
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$sushi = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$hits = 0
Get-ChildItem $sushi -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name | ForEach-Object {
  $folder = $_.Name
  $imgDir = Join-Path $_.FullName "images"
  if (-not (Test-Path $imgDir)) { return }
  Get-ChildItem $imgDir -File | Where-Object { $_.Extension -match '\.(jpg|jpeg|png)$' } | ForEach-Object {
    $bmp = $null
    try {
      $bmp = [System.Drawing.Bitmap]::FromFile($_.FullName)
      $stepX = [Math]::Max(1, [int]($bmp.Width / 32))
      $stepY = [Math]::Max(1, [int]($bmp.Height / 32))
      [long]$sr=0; [long]$sg=0; [long]$sb=0; [int]$n=0; [int]$redish=0; [int]$hot=0
      for ($y=0; $y -lt $bmp.Height; $y += $stepY) {
        for ($x=0; $x -lt $bmp.Width; $x += $stepX) {
          $c = $bmp.GetPixel($x,$y)
          $sr += $c.R; $sg += $c.G; $sb += $c.B; $n++
          if ($c.R -ge 140 -and ($c.R - $c.G) -ge 40 -and ($c.R - $c.B) -ge 40) { $redish++ }
          if ($c.R -ge 190 -and $c.G -le 90 -and $c.B -le 90) { $hot++ }
        }
      }
      $ar = [int]($sr / $n); $ag = [int]($sg / $n); $ab = [int]($sb / $n)
      $rr = [math]::Round($redish / [double]$n, 3)
      $hr = [math]::Round($hot / [double]$n, 3)
      $flag = ($rr -ge 0.12) -or ($hr -ge 0.06) -or ($ar -ge 140 -and ($ar - $ag) -ge 35 -and ($ar - $ab) -ge 35)
      if ($flag) {
        Write-Output ("RED {0}/{1} avg=({2},{3},{4}) red={5} hot={6}" -f $folder, $_.Name, $ar, $ag, $ab, $rr, $hr)
        $hits++
      }
    } catch {
      Write-Output ("ERR {0}/{1}" -f $folder, $_.Name)
    } finally { if ($bmp) { $bmp.Dispose() } }
  }
}
Write-Output ("DONE hits={0}" -f $hits)
