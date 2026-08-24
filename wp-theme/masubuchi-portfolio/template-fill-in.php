<?php
/**
 * Template Name: 記入用
 */
get_header();
$csv = mbp_asset('assets/fill-in.csv');
$pricing = home_url('/#price-entry-1man');
?>
  <main id="main" class="wf-page">
    <div class="shell">
      <p class="section-label">1万円プラン</p>
      <h1>記入用（空欄）</h1>
      <p class="wf-lead">このサイトと同じ番号の場所に書いてください。色は下の見た目から選んでください。送るときは「PDFで保存」。紙で見るときは「印刷」。画面を閉じると入力は消えます。リンクが無いときは「なし」。写真は 02.jpg のように番号のファイル名で共有フォルダへ入れてください。</p>
      <p class="wf-nav no-print">
        <a href="<?php echo esc_url($pricing); ?>">ご依頼と料金へ戻る</a>
        <a href="<?php echo esc_url($csv); ?>">Excel 用 CSV</a>
      </p>

      <form>
        <div class="print-only print-banner">
          <p>1万円プラン 記入内容</p>
        </div>
        <p class="wf-actions no-print">
          <button type="button" id="save-pdf">PDFで保存</button>
          <button type="button" class="btn-secondary" id="print-page">印刷</button>
          <span>送るならPDF。紙で見るなら印刷。</span>
        </p>
<?php get_template_part('template-parts/fill-in-fields'); ?>
      </form>
    </div>
  </main>
<?php
get_footer();
