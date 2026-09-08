$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding $false
$src = Get-Content -LiteralPath (Join-Path $Root "samples-source.json") -Encoding UTF8 -Raw | ConvertFrom-Json
$L = Get-Content -LiteralPath (Join-Path $Root "gen-labels.json") -Encoding UTF8 -Raw | ConvertFrom-Json

function Get-Fonts([string]$mood) {
  switch ($mood) {
    "gothic" { return @{ display = "Zen Kaku Gothic New"; catch = "Zen Kaku Gothic New"; body = "Noto Sans JP" } }
    "softGothic" { return @{ display = "Sawarabi Gothic"; catch = "Sawarabi Gothic"; body = "Zen Kaku Gothic New" } }
    "round" { return @{ display = "Zen Maru Gothic"; catch = "Kiwi Maru"; body = "M PLUS Rounded 1c" } }
    "bold" { return @{ display = "Dela Gothic One"; catch = "Dela Gothic One"; body = "Zen Kaku Gothic New" } }
    "brush" { return @{ display = "Yuji Syuku"; catch = "Yuji Syuku"; body = "Sawarabi Gothic" } }
    default { return @{ display = "Shippori Mincho"; catch = "Shippori Mincho"; body = "Zen Kaku Gothic New" } }
  }
}

function Get-Preset([string]$key) {
  switch ($key) {
    "green" {
      return @{
        pageBg = "#e8f2e6"; pageBgSoft = "#d2e6ce"; heroInk = "#111111"; bodyInk = "#212121"; bodyMuted = "#555555"
        chromeBg = "#1f3d18"; chromeInk = "#f4fff6"; accent = "#3d8a48"; cardBg = "#ffffff"; valuesBg = "#ffffff"
        contactBg = "#2d6a36"; contactInk = "#f4fff6"
      }
    }
    "clinic" {
      return @{
        pageBg = "#ffffff"; pageBgSoft = "#f3f6f8"; heroInk = "#1a4d8c"; bodyInk = "#212121"; bodyMuted = "#555555"
        chromeBg = "#1a4d8c"; chromeInk = "#ffffff"; accent = "#1a4d8c"; cardBg = "#ffffff"; valuesBg = "#ffffff"
        contactBg = "#1a4d8c"; contactInk = "#ffffff"
      }
    }
    "ink" {
      return @{
        pageBg = "#2e3333"; pageBgSoft = "#3a4040"; heroInk = "#ffffff"; bodyInk = "#f5f5f5"; bodyMuted = "#c8c8c8"
        chromeBg = "#111111"; chromeInk = "#f5f5f5"; accent = "#c9a227"; cardBg = "#1f2424"; valuesBg = "#1f2424"
        contactBg = "#111111"; contactInk = "#f5f5f5"
      }
    }
    "brick" {
      return @{
        pageBg = "#fff6ee"; pageBgSoft = "#ffe4cc"; heroInk = "#8a3a10"; bodyInk = "#3a2418"; bodyMuted = "#6a4a38"
        chromeBg = "#e07020"; chromeInk = "#fff8f0"; accent = "#f08a28"; cardBg = "#ffffff"; valuesBg = "#fffaf5"
        contactBg = "#d46818"; contactInk = "#fff8f0"
      }
    }
    "sakura" {
      return @{
        pageBg = "#fdf5f6"; pageBgSoft = "#f5e4e8"; heroInk = "#5c2434"; bodyInk = "#3d2228"; bodyMuted = "#6a454d"
        chromeBg = "#8f4a5a"; chromeInk = "#fff8fa"; accent = "#c95d7a"; cardBg = "#ffffff"; valuesBg = "#ffffff"
        contactBg = "#8f4a5a"; contactInk = "#fff8fa"
      }
    }
    default {
      return @{
        pageBg = "#f5efe4"; pageBgSoft = "#ebe1d0"; heroInk = "#fff6e8"; bodyInk = "#3e2723"; bodyMuted = "#6a5340"
        chromeBg = "#5c4033"; chromeInk = "#fff6e8"; accent = "#c45c26"; cardBg = "#fff8ee"; valuesBg = "#fff8ee"
        contactBg = "#5c4033"; contactInk = "#fff6e8"
      }
    }
  }
}

function Esc([string]$s) {
  if ($null -eq $s) { return "" }
  return $s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace('"', "&quot;")
}

function Clip([string]$s, [int]$n) {
  if ($null -eq $s) { return "" }
  if ($s.Length -le $n) { return $s }
  return $s.Substring(0, $n)
}

function FontCss([string]$mood) {
  switch ($mood) {
    "gothic" { return "Zen Kaku Gothic New, sans-serif" }
    "softGothic" { return "Sawarabi Gothic, sans-serif" }
    "round" { return "Zen Maru Gothic, sans-serif" }
    "bold" { return "Dela Gothic One, sans-serif" }
    "brush" { return "Yuji Syuku, serif" }
    default { return "Shippori Mincho, serif" }
  }
}

$manifestSamples = New-Object System.Collections.Generic.List[object]
$copySeeds = New-Object System.Collections.Generic.List[object]
$now = (Get-Date).ToUniversalTime().ToString("o")
$layoutOrder = @("hero", "values", "accordions", "photos", "works", "hours", "access", "address", "contact")

foreach ($row in $src) {
  $folder = [string]$row.id + "-" + [string]$row.key
  $dir = Join-Path $Root $folder
  New-Item -ItemType Directory -Force -Path $dir | Out-Null

  $colors = Get-Preset ([string]$row.colorKey)
  $fonts = Get-Fonts ([string]$row.fontMood)
  $brand = [string]$row.brand
  $hero = [string]$row.hero
  $hero2 = [string]$row.hero2
  $about = [string]$row.about
  $scene = [string]$row.scene
  $layout = [string]$row.layout
  $fontFamily = FontCss ([string]$row.fontMood)

  $draftObj = [ordered]@{
    version             = 16
    sushiSampleId       = [string]$row.id
    sushiSampleKey      = [string]$row.key
    blurb               = [string]$row.blurb
    scene               = $scene
    savedAt             = $now
    uiMode              = "self"
    sitePurpose         = "shop"
    siteColorMode       = "detail"
    layoutPattern       = $layout
    layoutOrder         = $layoutOrder
    layoutSelected      = $true
    layoutSchema        = 2
    intakeDone          = $true
    entryBranch         = "sample"
    hubEntrySource      = "sample"
    easyFlowActive      = $false
    presetChosen        = $true
    chosenPresetKey     = [string]$row.colorKey
    draftColors         = $colors
    draftCounts         = [ordered]@{ "hero-leads" = 2; "hero-values" = 2; "about-accordions" = 1; "about-photos" = 1; "works-list" = 2 }
    guidedImageUnlocked = $true
    guidedTextUnlocked  = $true
    fonts               = $fonts
    fields              = [ordered]@{
      brand_name           = $brand
      hero_title           = $brand
      hero_lead_1          = (Clip $hero 40)
      hero_lead_2          = (Clip $hero2 40)
      value_1_title        = [string]$row.value1t
      value_1_text         = (Clip ([string]$row.value1x) 40)
      value_2_title        = [string]$row.value2t
      value_2_text         = (Clip ([string]$row.value2x) 40)
      about_section_name   = [string]$L.shop
      about_heading        = ($brand + [string]$L.aboutSuffix)
      about_name           = $brand
      about_lead           = (Clip $about 200)
      acc_1_title          = [string]$L.focus
      acc_1_body           = (Clip $about 120)
      works_section_name   = [string]$L.menu
      works_heading        = [string]$L.recommend
      works_lead           = (Clip $hero2 80)
      work_1_title         = [string]$row.work1t
      work_1_text          = (Clip ([string]$row.work1x) 80)
      work_2_title         = [string]$row.work2t
      work_2_text          = (Clip ([string]$row.work2x) 80)
      hours_text           = [string]$row.hours
      address_text         = [string]$row.address
      contact_section_name = [string]$L.contact
      contact_label        = [string]$L.contact
      contact_note_1       = (Clip ([string]$row.contact) 40)
      contact_note_2       = (Clip ([string]$row.hours) 40)
      font_display         = $fonts.display
      font_catch           = $fonts.catch
      font_body            = $fonts.body
    }
    confirmed = [ordered]@{
      purpose = $true; layout = $true; guide = $true; "global-preset" = $true
      "logo-text" = $true; "hero-text" = $true; "values-text" = $true
      "about-text" = $true; "works-text" = $true; "contact-text" = $true
      "hours-text" = $true; "address-text" = $true; "site-fonts" = $true
    }
    draftExtras = [ordered]@{ hours = $true; access = $false; address = $true }
  }
  [System.IO.File]::WriteAllText((Join-Path $dir "draft.json"), ($draftObj | ConvertTo-Json -Depth 10), $utf8)

  $heroFill = $colors.chromeBg
  $heroText = $colors.heroInk
  if ($layout -eq "a") {
    $block1 = '  <rect x="24" y="300" width="592" height="64" fill="' + $colors.valuesBg + '" stroke="' + $colors.accent + '" stroke-width="2"/>'
    $block1 += "`n" + '  <text x="40" y="340" fill="' + $colors.bodyInk + '" font-size="14" font-family="' + $fontFamily + '">' + (Esc ([string]$row.value1t + " / " + [string]$row.value1x)) + '</text>'
    $block2 = '  <rect x="24" y="376" width="592" height="64" fill="' + $colors.cardBg + '" stroke="' + $colors.accent + '" stroke-width="2"/>'
    $block2 += "`n" + '  <text x="40" y="416" fill="' + $colors.bodyInk + '" font-size="14" font-family="' + $fontFamily + '">' + (Esc ([string]$row.work1t)) + '</text>'
    $photoY = 456
  }
  elseif ($layout -eq "b") {
    $block1 = '  <rect x="24" y="300" width="286" height="140" fill="' + $colors.valuesBg + '" stroke="' + $colors.accent + '" stroke-width="2"/>'
    $block1 += "`n" + '  <text x="40" y="370" fill="' + $colors.bodyInk + '" font-size="14" font-family="' + $fontFamily + '">' + (Esc ([string]$row.value1t)) + '</text>'
    $block2 = '  <rect x="330" y="300" width="286" height="140" fill="' + $colors.cardBg + '" stroke="' + $colors.accent + '" stroke-width="2"/>'
    $block2 += "`n" + '  <text x="346" y="370" fill="' + $colors.bodyInk + '" font-size="14" font-family="' + $fontFamily + '">' + (Esc ([string]$row.work1t)) + '</text>'
    $photoY = 456
  }
  else {
    $block1 = '  <rect x="24" y="300" width="286" height="100" fill="' + $colors.valuesBg + '" stroke="' + $colors.accent + '" stroke-width="2"/>'
    $block1 += "`n" + '  <text x="40" y="355" fill="' + $colors.bodyInk + '" font-size="14" font-family="' + $fontFamily + '">' + (Esc ([string]$row.value1t)) + '</text>'
    $block2 = '  <rect x="330" y="300" width="286" height="100" fill="' + $colors.cardBg + '" stroke="' + $colors.accent + '" stroke-width="2"/>'
    $block2 += "`n" + '  <text x="346" y="355" fill="' + $colors.bodyInk + '" font-size="14" font-family="' + $fontFamily + '">' + (Esc ([string]$row.work1t)) + '</text>'
    $photoY = 416
  }

  $aboutShort = Clip $about 36
  $svg = @(
    '<?xml version="1.0" encoding="UTF-8"?>'
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800">'
    ('  <rect width="640" height="800" fill="' + $colors.pageBg + '"/>')
    ('  <rect x="0" y="0" width="640" height="52" fill="' + $colors.chromeBg + '"/>')
    ('  <text x="24" y="34" fill="' + $colors.chromeInk + '" font-size="18" font-family="' + $fontFamily + '">' + (Esc $brand) + '</text>')
    ('  <rect x="24" y="72" width="592" height="200" fill="' + $heroFill + '"/>')
    ('  <text x="40" y="150" fill="' + $heroText + '" font-size="28" font-weight="700" font-family="' + $fontFamily + '">' + (Esc (Clip $hero 18)) + '</text>')
    ('  <text x="40" y="190" fill="' + $heroText + '" font-size="15" font-family="' + $fontFamily + '" opacity="0.9">' + (Esc (Clip $hero2 28)) + '</text>')
    ('  <text x="40" y="250" fill="' + $heroText + '" font-size="12" opacity="0.75">' + (Esc ([string]$L.photoWorld + $scene)) + '</text>')
    $block1
    $block2
    ('  <rect x="24" y="' + $photoY + '" width="592" height="100" fill="' + $colors.pageBgSoft + '"/>')
    ('  <text x="40" y="' + ($photoY + 40) + '" fill="' + $colors.bodyInk + '" font-size="14" font-family="' + $fontFamily + '">' + (Esc $aboutShort) + '</text>')
    ('  <text x="40" y="' + ($photoY + 70) + '" fill="' + $colors.bodyMuted + '" font-size="12">' + (Esc (Clip ([string]$row.hours) 36)) + '</text>')
    ('  <rect x="24" y="620" width="592" height="110" fill="' + $colors.contactBg + '"/>')
    ('  <text x="40" y="665" fill="' + $colors.contactInk + '" font-size="18" font-family="' + $fontFamily + '">' + (Esc ([string]$L.contact)) + '</text>')
    ('  <text x="40" y="698" fill="' + $colors.contactInk + '" font-size="13" opacity="0.9">' + (Esc (Clip ([string]$row.contact) 32)) + '</text>')
    ('  <text x="24" y="780" fill="' + $colors.bodyMuted + '" font-size="12">No.' + $row.id + ' · layout ' + $layout.ToUpper() + ' · ' + $row.colorKey + '</text>')
    '</svg>'
  ) -join "`n"
  [System.IO.File]::WriteAllText((Join-Path $dir "preview.svg"), $svg, $utf8)

  [void]$manifestSamples.Add([ordered]@{
      id          = [string]$row.id
      key         = [string]$row.key
      blurb       = [string]$row.blurb
      layout      = $layout
      colorKey    = [string]$row.colorKey
      fontMood    = [string]$row.fontMood
      scene       = $scene
      brand       = $brand
      hero        = $hero
      draftPath   = ($folder + "/draft.json")
      previewPath = ($folder + "/preview.svg")
    })

  [void]$copySeeds.Add([ordered]@{
      id       = [string]$row.id
      brand    = $brand
      hero     = $hero
      hero2    = $hero2
      about    = $about
      value1   = ([string]$row.value1t + ": " + [string]$row.value1x)
      work1    = ([string]$row.work1t + ": " + [string]$row.work1x)
      contact  = [string]$row.contact
      moodHint = [string]$row.fontMood
      scene    = $scene
    })
}

$manifest = [ordered]@{ version = 2; generatedAt = $now; note = [string]$L.note; samples = $manifestSamples }
[System.IO.File]::WriteAllText((Join-Path $Root "manifest.json"), ($manifest | ConvertTo-Json -Depth 8), $utf8)
[System.IO.File]::WriteAllText((Join-Path $Root "copy-seeds.json"), ($copySeeds | ConvertTo-Json -Depth 6), $utf8)
Write-Host ("wrote {0} samples" -f $src.Count)
