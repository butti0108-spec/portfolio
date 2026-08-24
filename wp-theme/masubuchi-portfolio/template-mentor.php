<?php
/**
 * Template Name: 確認用
 */
get_header();
$home = home_url('/');
$pricing = home_url('/#pricing');
$fill_in = mbp_page_url('fill-in');
$vital = home_url('/works/vital/');
?>
  <main id="main" class="mentor-page">
    <div class="shell mentor-shell">
      <p class="section-label">Mentor</p>
      <h1>確認用</h1>
      <p class="mentor-lead">メンター向けのまとめです。GitHub のコミットを1件ずつ見なくても、主な変更が分かるようにしています。</p>

      <section class="mentor-block" aria-labelledby="mentor-now">
        <h2 id="mentor-now">いま見てほしいこと</h2>
        <ul>
          <li>トップページ全体の見やすさ（ヒーロー・Profile・Works・ご依頼と料金・Contact）</li>
          <li>ご依頼と料金は3枚。くわしく見るで各プランのページへ。円は1万円のみ</li>
          <li>Works は管理画面から追加・URL・ボタン文言を直せます</li>
          <li>1万円プランの<a href="<?php echo esc_url($fill_in); ?>">記入用</a>（色の見本つき）</li>
          <li>Contact は Contact Form 7 で送信できます</li>
        </ul>
      </section>

      <section class="mentor-block" aria-labelledby="mentor-history">
        <h2 id="mentor-history">主な変更</h2>
        <ol>
          <li>文章を増やし、ヒーロー写真を入れた</li>
          <li>Profile・Works・スマホ表示を整えた</li>
          <li>バイタル事例ページを追加した</li>
          <li>ご依頼と料金を3枚にまとめ、詳細は別ページにした</li>
          <li>1万円用の記入ページを作った（色選択・見本・PDF／印刷）</li>
          <li>同じ見た目のまま WordPress 化した</li>
        </ol>
      </section>

      <section class="mentor-block" aria-labelledby="mentor-intent">
        <h2 id="mentor-intent">意識したこと</h2>
        <ul>
          <li>見やすさ・迷わなさを優先した</li>
          <li>1万円を料金の主軸にして、案内リンクが埋もれないようにした</li>
          <li>色はページ全体でそろえ、パレットは少なくした（緑→ティール→青の順）</li>
          <li>文字色は黒と白だけにした</li>
          <li>見本は色と文字の確認だけにした（本番サイトの真似まではしない）</li>
          <li>ポートフォリオ本体と、この確認用ページは分けた</li>
        </ul>
      </section>

      <section class="mentor-block" aria-labelledby="mentor-wp">
        <h2 id="mentor-wp">WordPress について</h2>
        <p>このサイトは WordPress で公開しています。お問い合わせは Contact Form 7 で送信できます。Works は管理画面の投稿です。見た目は静的版と同じテーマです。ITサポートは、このページには載せていません。</p>
      </section>

      <section class="mentor-block" aria-labelledby="mentor-links">
        <h2 id="mentor-links">リンク</h2>
        <ul class="mentor-links">
          <li><a href="<?php echo esc_url($home); ?>">トップページ</a></li>
          <li><a href="<?php echo esc_url($pricing); ?>">ご依頼と料金</a></li>
          <li><a href="<?php echo esc_url(mbp_page_url('price-1man')); ?>">1万円プラン</a></li>
          <li><a href="<?php echo esc_url($fill_in); ?>">記入用</a></li>
          <li><a href="<?php echo esc_url($vital); ?>">バイタル事例</a></li>
        </ul>
      </section>
    </div>
  </main>
<?php
get_footer();
