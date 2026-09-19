# Build auditor pack: HTML gallery, PDF, fulltext copy for all 30
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$repo = (Resolve-Path ".").Path
$utf8 = [Text.UTF8Encoding]::new($false)
$out = Join-Path $repo "docs\share\2026-09-19-sample30-audit"
$shots = Join-Path $out "shots"
$sushi = Join-Path $repo "sample-1man\sushi-samples"
New-Item -ItemType Directory -Force -Path $out | Out-Null

# --- rename shots to clean NN-folder.png if needed ---
Get-ChildItem $shots -Filter "*.png" | ForEach-Object {
  if ($_.Name -match '^(\d{2})-\1-(.+)\.png$') {
    $new = "$($Matches[1])-$($Matches[2]).png"
    $dest = Join-Path $shots $new
    if (-not (Test-Path $dest)) { Move-Item $_.FullName $dest -Force }
    else { Remove-Item $_.FullName -Force }
  }
}

$pngs = Get-ChildItem $shots -Filter "*.png" | Sort-Object Name
Write-Host ("shots=" + $pngs.Count)

# --- HTML gallery (print-friendly, 1 page per sample) ---
$html = New-Object System.Collections.Generic.List[string]
$html.Add('<!DOCTYPE html>')
$html.Add('<html lang="ja"><head><meta charset="utf-8">')
$html.Add('<title>見本30・監査用スクショ一覧 1200x1694</title>')
$html.Add('<style>')
$html.Add('@page { size: A4; margin: 10mm; }')
$html.Add('body{font-family:"Segoe UI","Hiragino Sans","Noto Sans JP",sans-serif;margin:0;padding:16px;color:#111;background:#f4f4f4}')
$html.Add('h1{font-size:20px;margin:0 0 8px}')
$html.Add('.meta{font-size:12px;color:#444;margin-bottom:20px;line-height:1.5}')
$html.Add('.toc a{margin-right:8px;font-size:12px}')
$html.Add('.card{background:#fff;border:1px solid #ccc;margin:0 0 18px;padding:12px;page-break-after:always;break-after:page}')
$html.Add('.card:last-child{page-break-after:auto}')
$html.Add('.card h2{font-size:16px;margin:0 0 8px}')
$html.Add('.card img{display:block;width:100%;max-width:1200px;height:auto;border:1px solid #ddd}')
$html.Add('.okng{margin-top:8px;font-size:13px}')
$html.Add('.okng span{display:inline-block;margin-right:16px}')
$html.Add('@media print{body{background:#fff;padding:0}.card{border:0;padding:0;margin:0 0 0}}')
$html.Add('</style></head><body>')
$html.Add('<h1>見本30・監査用スクショ一覧（1200×1694）</h1>')
$html.Add('<div class="meta">日付: 2026-09-19<br>用途: 観察官向け一括共有（ChatGPTの画像20枚制限回避）<br>判定: 各ページ末尾の OK / NG に印<br>注意: 一部号は画像欠落やレイアウト事故の可能性あり（小さめファイル要注視）</div>')
$html.Add('<div class="toc"><strong>目次:</strong> ')
foreach ($p in $pngs) {
  $id = $p.Name.Substring(0,2)
  $html.Add("<a href=`"#$id`">$id</a>")
}
$html.Add('</div>')

foreach ($p in $pngs) {
  $id = $p.Name.Substring(0,2)
  $folder = [IO.Path]::GetFileNameWithoutExtension($p.Name)
  $brand = ""
  $dir = Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
  if ($dir) {
    try {
      $j = [IO.File]::ReadAllText((Join-Path $dir.FullName "draft.json"), $utf8) | ConvertFrom-Json
      $brand = [string]$j.fields.brand_name
    } catch {}
  }
  $kb = [math]::Round($p.Length/1KB)
  $html.Add("<section class=`"card`" id=`"$id`">")
  $html.Add("<h2>$id　$brand　<code>$folder</code>　(${kb}KB)</h2>")
  $html.Add("<img src=`"shots/$([Uri]::EscapeDataString($p.Name))`" alt=`"$id`" width=`"1200`" height=`"1694`">")
  $html.Add('<div class="okng"><span>□ OK（例に流す）</span><span>□ NG（差し戻し）</span><span>メモ: _______________</span></div>')
  $html.Add('</section>')
}
$html.Add('</body></html>')
$htmlPath = Join-Path $out "index.html"
[IO.File]::WriteAllText($htmlPath, ($html -join "`n"), $utf8)
Write-Host "HTML $htmlPath"

# --- PDF via Edge headless ---
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
$pdfPath = Join-Path $out "sample30-audit-1200x1694.pdf"
$fileUrl = "file:///" + ($htmlPath -replace '\\','/')
# Edge print-to-pdf works better with http; copy to temp served path or use file URL
& $edge --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$pdfPath" $fileUrl 2>&1 | Out-Null
Start-Sleep -Seconds 2
if (Test-Path $pdfPath) {
  Write-Host ("PDF OK " + (Get-Item $pdfPath).Length)
} else {
  Write-Host "PDF via file URL failed; trying localhost copy…"
  # Serve note: use absolute file path with --allow-file-access-from-files
  & $edge --headless=new --disable-gpu --allow-file-access-from-files --no-pdf-header-footer --print-to-pdf="$pdfPath" $fileUrl 2>&1 | Out-Null
  Start-Sleep -Seconds 3
  if (Test-Path $pdfPath) { Write-Host ("PDF OK " + (Get-Item $pdfPath).Length) } else { Write-Host "PDF FAIL" }
}

# --- Fulltext copy all 30 ---
$ids = 1..30 | ForEach-Object { "{0:d2}" -f $_ }
$keys = @(
  "brand_name","hero_title","hero_lead_1","hero_lead_2","hero_lead_3",
  "value_1_title","value_1_text","value_2_title","value_2_text","value_3_title","value_3_text",
  "about_section_name","about_heading","about_name","about_lead",
  "acc_1_title","acc_1_body","acc_2_title","acc_2_body",
  "works_section_name","works_heading","works_lead",
  "work_1_title","work_1_text","work_2_title","work_2_text","work_3_title","work_3_text",
  "hours_text","address_text","access_text",
  "contact_section_name","contact_label","contact_email","contact_note_1","contact_note_2"
)
$emptyMark = "（空）"
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("# 見本30・掲載文言 全文一覧（監査提出）")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("- 日付: 2026-09-19")
[void]$sb.AppendLine("- 範囲: sushi-samples 01–30 / draft.json fields / 省略なし")
[void]$sb.AppendLine("- 対になるスクショ: [sample30-audit-1200x1694.pdf](./sample30-audit-1200x1694.pdf) / [index.html](./index.html)")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## 索引")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| No | 屋号 | folder |")
[void]$sb.AppendLine("|----|------|--------|")

$bodies = New-Object System.Collections.Generic.List[string]
foreach ($id in $ids) {
  $dir = Get-ChildItem $sushi -Directory | Where-Object { $_.Name -like "$id-*" } | Select-Object -First 1
  if (-not $dir) { continue }
  $j = [IO.File]::ReadAllText((Join-Path $dir.FullName "draft.json"), $utf8) | ConvertFrom-Json
  $f = $j.fields
  $brand = [string]$f.brand_name
  [void]$sb.AppendLine("| $id | $brand | ``$($dir.Name)`` |")
  $block = New-Object System.Text.StringBuilder
  [void]$block.AppendLine("")
  [void]$block.AppendLine("---")
  [void]$block.AppendLine("")
  [void]$block.AppendLine("## $id　$brand")
  [void]$block.AppendLine("")
  [void]$block.AppendLine("- folder: ``$($dir.Name)``")
  [void]$block.AppendLine("- scene: $($j.scene)")
  if ($j.layoutBlockOff) {
    $off = ($j.layoutBlockOff.PSObject.Properties | ForEach-Object { if ($_.Value) { $_.Name } }) -join ", "
    [void]$block.AppendLine("- layoutBlockOff: $off")
  }
  [void]$block.AppendLine("")
  foreach ($k in $keys) {
    $v = [string]$f.$k
    if ([string]::IsNullOrWhiteSpace($v)) { $v = $emptyMark }
    [void]$block.AppendLine("### $k")
    [void]$block.AppendLine("")
    [void]$block.AppendLine($v)
    [void]$block.AppendLine("")
  }
  $bodies.Add($block.ToString())
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("## 全文")
foreach ($b in $bodies) { [void]$sb.Append($b) }

$copyPath = Join-Path $out "00-copy-fulltext-30.md"
[IO.File]::WriteAllText($copyPath, $sb.ToString(), $utf8)
Write-Host "COPY $copyPath chars=$($sb.Length)"

# --- README ---
$readme = @"
# 見本30・監査パック（2026-09-19）

## 共有用（観察官へ）

| ファイル | 内容 |
|----------|------|
| **sample30-audit-1200x1694.pdf** | 30号スクショを1冊にまとめたPDF（推奨・画像20枚制限回避） |
| **index.html** | 同じ内容のHTML一覧（ブラウザでOK/NG記入可） |
| **00-copy-fulltext-30.md** | 全号の掲載文言全文 |
| **shots/** | 個別PNG（1200×1694） |

## 規定サイズ

- 1200 × 1694（寿司タイル 170×240 と同比・サイト設計幅1200）

## 判定の使い方

1. PDF（または index.html）を開く
2. 各号を見て OK（例に流す）/ NG（差し戻し）を印
3. NGは号番号＋一言メモを返す

## 注意

- ファイルサイズが極端に小さい号（例: 07/09/11/26/28）は白欠け・画像欠落の可能性あり → 要目視
"@
[IO.File]::WriteAllText((Join-Path $out "README.md"), $readme, $utf8)
Write-Host "README written"
Write-Host "OUT DIR: $out"
Get-ChildItem $out | Format-Table Name, Length -AutoSize
