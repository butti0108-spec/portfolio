$root = "C:\Users\masub\OneDrive\デスクトップ\テックメンター\ポートフォリオ\sample-1man\sushi-samples"
$utf8 = New-Object System.Text.UTF8Encoding $false

function Set-RebuildMeta([string]$folder, [hashtable]$meta) {
  $path = Join-Path (Join-Path $root $folder) "draft.json"
  if (-not (Test-Path $path)) { Write-Host "missing $folder"; return }
  $t = [System.IO.File]::ReadAllText($path, $utf8)
  $t = [regex]::Replace($t, '"brushUpPhoto"\s*:\s*"[^"]*"', '"brushUpPhoto":  "2026-09-19-rebuild"')
  $t = [regex]::Replace($t, '"brushUpCopy"\s*:\s*"[^"]*"', '"brushUpCopy":  "2026-09-19-rebuild"')
  $t = [regex]::Replace($t, '"blurb"\s*:\s*"[^"]*"', ('"blurb":  "' + $meta.blurb + '"'))
  $t = [regex]::Replace($t, '"scene"\s*:\s*"[^"]*"', ('"scene":  "' + $meta.scene + '"'))
  $briefObj = @"
    "designBrief":  {
                        "who":  "$($meta.who)",
                        "purpose":  "$($meta.purpose)",
                        "show":  "$($meta.show)",
                        "colorIntent":  "$($meta.color)",
                        "worldviewOneLiner":  "$($meta.one)"
                    },
"@
  if ($t -match '"designBrief"') {
    $t = [regex]::Replace($t, '(?s)\s*"designBrief"\s*:\s*\{.*?\},', "`r`n" + $briefObj.TrimEnd() + "`r`n")
  } else {
    $t = [regex]::Replace($t, '("scene"\s*:\s*"[^"]*",)', ('$1' + "`r`n" + $briefObj))
  }
  # Fix broken paths containing = 
  $t = [regex]::Replace($t, '"((?:hero|about_image_\d|work_\d)_image)"\s*:\s*"[^"]*=[^"]*"', {
    param($m)
    $key = $m.Groups[1].Value
    $slot = 'hero.jpg'
    if ($key -match 'about_image_(\d)') { $slot = 'about-{0:d2}.jpg' -f [int]$Matches[1] }
    elseif ($key -match 'work_(\d)') { $slot = 'work-{0:d2}.jpg' -f [int]$Matches[1] }
    return ('"' + $key + '":  "sushi-samples/' + $folder + '/images/' + $slot + '?v=rebuild-2026-09-19"')
  })
  $esc = [regex]::Escape($folder)
  $t = [regex]::Replace($t, '("sushi-samples/' + $esc + '/images/[^"\?]+\.jpg)(\?v=[^"]*)?"', ('$1?v=rebuild-2026-09-19"'))
  # Soft language quick fixes in fields blob
  $t = $t.Replace('持ち帰る束', '今日の店先から')
  $t = $t.Replace('持ち帰りやすい束', '持ち帰りやすい形')
  $t = $t.Replace('スタンダード束', 'スタンダードサイズ')
  [System.IO.File]::WriteAllText($path, $t, $utf8)
  Write-Host "OK $folder"
}

$all = @{
  "04-salon-clinic-a"=@{blurb="白個室ヘア。静けさ・相談・予約";scene="サロン・白";who="白基調の個室ヘアサロンのスタイリスト";purpose="落ち着いて相談し予約する";show="白壁・椅子・静かな光";color="白磁・余白";one="白い光と余白で髪を整える個室"}
  "05-salon-sakura-b"=@{blurb="午後菓子。パステル・一口";scene="スイーツ・パステル";who="午後のご褒美菓子を焼く菓子職人";purpose="一口買って帰る";show="パステル菓子・ショーケース";color="桜色パステル";one="淡い色の午後に一口のご褒美"}
  "06-bakery-brick-a"=@{blurb="窯パン。ケース・売り切れ前提";scene="パン・ケース";who="近所の窯パン屋の店主";purpose="売り切れ前に買う";show="ケース内のパン・紙袋";color="レンガ暖色";one="ケースの向こうでパンが休む"}
  "07-bakery-cafe-c"=@{blurb="ラーメン丼。湯気・正面";scene="ラーメン・丼";who="塩味の一杯を出す麺場の店主";purpose="今すぐ食べたい";show="丼正面・湯気";color="墨・筆文字";one="丼から湯気が立つ一杯屋"}
  "08-bar-ink-b"=@{blurb="客室宿。窓光・畳";scene="宿・客室";who="小さな客室宿の主人";purpose="泊まりたくなる";show="畳・窓光・余白";color="ベージュ宿";one="窓辺の光が主役の小さな客室宿"}
  "09-bar-brick-a"=@{blurb="ヨガ。床光・呼吸";scene="ヨガ・光";who="床光のヨガスタジオ講師";purpose="体験し呼吸をそろえる";show="床・窓光・マット";color="緑・柔らかゴ";one="床に落ちる光で呼吸をそろえる"}
  "10-clinic-green-a"=@{blurb="居酒屋。提灯・赤のれん";scene="居酒屋・提灯";who="提灯の居酒屋の店主";purpose="今夜寄る";show="提灯・赤のれん・路地";color="レンガ・太ゴ";one="提灯が灯る路地で一杯"}
  "11-clinic-clinic-b"=@{blurb="診療所。待合・安心案内";scene="診療所・待合";who="まちの診療所のスタッフ";purpose="不安を短くして来院";show="待合・時計・柔らか光";color="クリニック白";one="待合の時計がゆっくり進む安心"}
  "12-florist-sakura-a"=@{blurb="ペットケア。散歩・信頼";scene="ペット・散歩";who="散歩預かりのペットケア";purpose="預けて安心";show="リード・散歩・穏やかな店内";color="桜丸ゴ";one="リードの先の散歩を任せられる"}
  "13-florist-green-c"=@{blurb="コワーキング。席＋緑";scene="コワーキング・植物";who="緑のある共有席の運営";purpose="使い方が分かって座る";show="席＋観葉・コンセント";color="緑明朝";one="席のそばに葉がある共有席"}
  "14-ramen-brick-b"=@{blurb="ギャラリー。余白壁";scene="ギャラリー・壁";who="白い壁のギャラリー運営";purpose="作品を見に来る";show="余白壁・一点の作品";color="墨太ゴ";one="白い壁に作品だけを残す"}
  "15-ramen-ink-a"=@{blurb="朝パン。通勤・焼きたて";scene="パン屋・朝";who="通勤前の朝パン屋";purpose="開店と同時に買う";show="紙袋・焼きたて・朝の店先";color="カフェ丸ゴ";one="開店ベルと焼きたてが揃う"}
  "16-yoga-green-a"=@{blurb="花綴りサロン。花・温度";scene="サロン・花";who="花と髪を整えるサロン";purpose="予約したくなる温度";show="花＋ヘア空間";color="桜丸ゴ";one="花と髪を同じ手で整える"}
  "17-yoga-sakura-b"=@{blurb="バー。ボトル灯・夜";scene="バー・ボトル";who="ボトル灯の夜バー店主";purpose="貸切・二人の夜";show="ボトル棚の灯・暗い暖色";color="レンガ太ゴ";one="ボトルの灯が灯る貸切したくなる夜"}
  "18-studio-clinic-c"=@{blurb="フォトスタジオ。余白・作例";scene="写真館・余白";who="余白のフォトスタジオ";purpose="撮ってほしい";show="作例・白い床壁";color="クリニックゴシック";one="余白の多い写真で人を撮る"}
  "19-studio-ink-a"=@{blurb="ラーメン。暖簾・湯気";scene="ラーメン・暖簾";who="暖簾の定番ラーメン屋";purpose="のれんをくぐる";show="暖簾・湯気・暖色丼";color="レンガ太ゴ";one="暖簾の向こうで湯気が立つ"}
  "20-pet-cafe-b"=@{blurb="パルフェ。層・午後";scene="スイーツ";who="層のあるパルフェ屋";purpose="午後のご褒美";show="パルフェの層・ガラス";color="桜丸ゴ";one="午後のご褒美としての層のある甘いもの"}
  "21-pet-sakura-a"=@{blurb="緑カフェ。窓辺・静か";scene="カフェ・窓辺";who="窓辺の緑カフェ店主";purpose="静かに座る";show="窓・葉・カップ";color="緑柔ゴ";one="窓辺の緑と静かな一杯"}
  "22-cowork-clinic-b"=@{blurb="居酒屋。木暖簾";scene="居酒屋・木暖簾";who="木暖簾の居酒屋";purpose="今夜の定番一献";show="木の暖簾・木目・皿";color="墨筆";one="木の暖簾の向こうで今夜の一献"}
  "23-cowork-green-a"=@{blurb="共席ラボ。長机";scene="コワーキング";who="共席の仕事場運営";purpose="ひとりでも座る";show="長机・隣席";color="カフェ明朝";one="ひとりでも隣と座れる共有の仕事場"}
  "24-sweets-sakura-c"=@{blurb="クリニック。受付・安心";scene="診療所";who="ていねい診療所";purpose="不安が短い来院";show="受付・案内・清潔";color="クリニックゴシック";one="不安が短くなるていねいな診療所"}
  "25-sweets-cafe-a"=@{blurb="ベーカリー。小麦・ローフ";scene="パン・小麦";who="小麦香るベーカリー";purpose="焼き立てを買う";show="小麦・ローフ・粉気";color="レンガ柔ゴ";one="小麦の香りがする焼き立て"}
  "26-izakaya-brick-c"=@{blurb="写真館。モノクロ";scene="写真館・モノクロ";who="墨白の写真館";purpose="静かに撮る";show="モノクロ作例・余白";color="墨太ゴ";one="墨と白だけで切り取る静かな写真館"}
  "27-izakaya-ink-b"=@{blurb="宿。朝光・和室";scene="宿・朝";who="朝露の旅宿";purpose="一晩泊まる";show="朝光・和室";color="カフェ明朝";one="朝露と朝光だけの一晩の旅宿"}
  "28-gallery-ink-a"=@{blurb="ヨガ。葉音・呼吸";scene="ヨガ・スタジオ";who="葉音のヨガスタジオ";purpose="静かな呼吸";show="葉・光・マット";color="緑柔ゴ";one="葉の音のなかで呼吸する静かなヨガ"}
  "29-gallery-clinic-c"=@{blurb="花屋。手元・近所";scene="花屋・アレンジ";who="近所で花を整える花屋";purpose="選んで帰る";show="手元の花・紙";color="桜丸ゴ";one="近くで整えて持ち帰れる花屋"}
  "30-hotel-cafe-b"=@{blurb="ギャラリー。額・灯り";scene="ギャラリー・額";who="額のギャラリー";purpose="余韻で帰る";show="額・灯り・一点";color="レンガ明朝";one="額の灯りと作品が残る小さなギャラリー"}
}

foreach ($k in ($all.Keys | Sort-Object)) { Set-RebuildMeta $k $all[$k] }
Write-Host "DONE"
