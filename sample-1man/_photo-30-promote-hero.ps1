$ErrorActionPreference='Stop'
$d = Get-ChildItem '.\sample-1man\sushi-samples' -Directory | Where-Object Name -like '30-*' | Select-Object -First 1
$src = Join-Path $d.FullName 'images\about-01.jpg'
$dst = Join-Path $d.FullName 'images\hero.jpg'
[IO.File]::Copy($src, $dst, $true)
Write-Host '30 hero <= about-01'
# bump draft hero cache
$path = Join-Path $d.FullName 'draft.json'
$utf8 = [Text.UTF8Encoding]::new($false)
$t = [IO.File]::ReadAllText($path, $utf8)
$val = "sushi-samples/$($d.Name)/images/hero.jpg?v=photo-wv-5e"
$t = [regex]::Replace($t, '"hero_image"\s*:\s*"[^"]*"', ('"hero_image":"'+$val+'"'), 1)
[IO.File]::WriteAllText($path, $t, $utf8)
Write-Host 'draft bumped'
