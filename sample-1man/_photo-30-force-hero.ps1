$ErrorActionPreference='Stop'
$d = Get-ChildItem '.\sample-1man\sushi-samples' -Directory | Where-Object Name -like '30-*' | Select-Object -First 1
$img = Join-Path $d.FullName 'images'
$about = Join-Path $img 'about-01.jpg'
$hero = Join-Path $img 'hero.jpg'
Write-Host ('about bytes=' + (Get-Item $about).Length + ' hash=' + (Get-FileHash $about).Hash.Substring(0,12))
Write-Host ('hero  bytes=' + (Get-Item $hero).Length + ' hash=' + (Get-FileHash $hero).Hash.Substring(0,12))
# about-01 is gallery; force overwrite hero via temp
$tmp = Join-Path $env:TEMP ('30-hero-' + [guid]::NewGuid().ToString('n') + '.jpg')
[IO.File]::Copy($about, $tmp, $true)
for ($i=1; $i -le 15; $i++) {
  try {
    if (Test-Path $hero) { [IO.File]::Delete($hero) }
    [IO.File]::Copy($tmp, $hero, $true)
    break
  } catch { Start-Sleep -Milliseconds (400*$i) }
}
Write-Host ('hero2 bytes=' + (Get-Item $hero).Length + ' hash=' + (Get-FileHash $hero).Hash.Substring(0,12))
Remove-Item $tmp -Force -EA SilentlyContinue
# bump
$path = Join-Path $d.FullName 'draft.json'
$utf8 = [Text.UTF8Encoding]::new($false)
$t = [IO.File]::ReadAllText($path, $utf8)
$val = "sushi-samples/$($d.Name)/images/hero.jpg?v=photo-wv-5f"
$t = [regex]::Replace($t, '"hero_image"\s*:\s*"[^"]*"', ('"hero_image":"'+$val+'"'), 1)
[IO.File]::WriteAllText($path, $t, $utf8)
Write-Host DONE
