<?php

if (!defined('ABSPATH')) {
  exit;
}

function mbp_setup() {
  add_theme_support('title-tag');
  add_theme_support('post-thumbnails');
  add_theme_support('html5', ['search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script']);
  add_theme_support('automatic-feed-links');

  register_post_type('work', [
    'labels' => [
      'name' => 'Works',
      'singular_name' => 'Work',
      'add_new_item' => '作品を追加',
      'edit_item' => '作品を編集',
    ],
    'public' => true,
    'has_archive' => false,
    'rewrite' => ['slug' => 'works'],
    'menu_icon' => 'dashicons-portfolio',
    'supports' => ['title', 'editor', 'thumbnail', 'page-attributes'],
    'show_in_rest' => true,
  ]);
}
add_action('after_setup_theme', 'mbp_setup');

function mbp_asset($path) {
  return get_theme_file_uri($path);
}

function mbp_page_url($slug) {
  $page = get_page_by_path($slug);
  return $page ? get_permalink($page) : home_url('/' . $slug . '/');
}

function mbp_cf7_shortcode() {
  $id = (int) get_option('mbp_cf7_id');
  if ($id) {
    return '[contact-form-7 id="' . $id . '" title="お問い合わせ"]';
  }
  return '[contact-form-7 title="お問い合わせ"]';
}

add_filter('wpcf7_autop_or_not', '__return_false');

function mbp_dequeue_wp_styles() {
  wp_dequeue_style('wp-block-library');
  wp_dequeue_style('classic-theme-styles');
  wp_dequeue_style('global-styles');
}
add_action('wp_enqueue_scripts', 'mbp_dequeue_wp_styles', 100);

function mbp_font_choice() {
  $choice = get_theme_mod('mbp_font', 'mincho_gothic');
  $allowed = ['mincho_gothic', 'gothic', 'mincho'];
  return in_array($choice, $allowed, true) ? $choice : 'mincho_gothic';
}

function mbp_font_url() {
  $choice = mbp_font_choice();
  if ($choice === 'gothic') {
    return 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap';
  }
  if ($choice === 'mincho') {
    return 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&display=swap';
  }
  return 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap';
}

function mbp_mod_image_url($mod, $fallback_rel) {
  $id = (int) get_theme_mod($mod, 0);
  if ($id) {
    $url = wp_get_attachment_image_url($id, 'full');
    if ($url) {
      return $url;
    }
  }
  return mbp_asset($fallback_rel);
}

function mbp_sanitize_hex($color) {
  $clean = sanitize_hex_color($color);
  return $clean ? $clean : '';
}

function mbp_sanitize_font($value) {
  $allowed = ['mincho_gothic', 'gothic', 'mincho'];
  return in_array($value, $allowed, true) ? $value : 'mincho_gothic';
}

function mbp_sanitize_scale($value) {
  $allowed = ['90', '100', '110', '125'];
  return in_array((string) $value, $allowed, true) ? (string) $value : '100';
}

function mbp_sanitize_attachment_id($value) {
  return absint($value);
}

function mbp_customize_register($wp_customize) {
  $wp_customize->add_section('mbp_look', [
    'title' => '見た目の設定',
    'priority' => 32,
    'description' => '文字色・背景色・文字サイズ・フォントと、トップの写真を変えられます。写真を外すと、テーマの初期画像に戻ります。Worksのサムネは各作品のアイキャッチ画像です。',
  ]);

  $wp_customize->add_setting('mbp_ink', [
    'default' => '#111111',
    'sanitize_callback' => 'mbp_sanitize_hex',
  ]);
  $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'mbp_ink', [
    'label' => '文字色',
    'section' => 'mbp_look',
  ]));

  $wp_customize->add_setting('mbp_bg', [
    'default' => '#fcfdfb',
    'sanitize_callback' => 'mbp_sanitize_hex',
  ]);
  $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'mbp_bg', [
    'label' => '背景色（ページ上部）',
    'section' => 'mbp_look',
    'description' => '下へいく緑のグラデは、この色を起点にします。',
  ]));

  $wp_customize->add_setting('mbp_text_scale', [
    'default' => '100',
    'sanitize_callback' => 'mbp_sanitize_scale',
  ]);
  $wp_customize->add_control('mbp_text_scale', [
    'label' => '文字サイズ',
    'section' => 'mbp_look',
    'type' => 'select',
    'choices' => [
      '90' => '小さめ',
      '100' => '標準',
      '110' => '大きめ',
      '125' => 'かなり大きい',
    ],
  ]);

  $wp_customize->add_setting('mbp_font', [
    'default' => 'mincho_gothic',
    'sanitize_callback' => 'mbp_sanitize_font',
  ]);
  $wp_customize->add_control('mbp_font', [
    'label' => 'フォント',
    'section' => 'mbp_look',
    'type' => 'select',
    'choices' => [
      'mincho_gothic' => '見出し：明朝／本文：ゴシック（初期）',
      'gothic' => 'ゴシックのみ',
      'mincho' => '明朝のみ',
    ],
  ]);

  $images = [
    'mbp_img_hero' => 'ヒーロー画像',
    'mbp_img_profile_1' => 'プロフィール写真 1',
    'mbp_img_profile_2' => 'プロフィール写真 2',
    'mbp_img_profile_3' => 'プロフィール写真 3',
    'mbp_img_profile_4' => 'プロフィール写真 4',
  ];
  foreach ($images as $id => $label) {
    $wp_customize->add_setting($id, [
      'default' => 0,
      'sanitize_callback' => 'mbp_sanitize_attachment_id',
    ]);
    $wp_customize->add_control(new WP_Customize_Media_Control($wp_customize, $id, [
      'label' => $label,
      'section' => 'mbp_look',
      'mime_type' => 'image',
    ]));
  }
}
add_action('customize_register', 'mbp_customize_register');

function mbp_look_css() {
  $ink = mbp_sanitize_hex(get_theme_mod('mbp_ink', '#111111'));
  $bg = mbp_sanitize_hex(get_theme_mod('mbp_bg', '#fcfdfb'));
  $scale = ((int) mbp_sanitize_scale(get_theme_mod('mbp_text_scale', '100'))) / 100;
  $font = mbp_font_choice();
  $mincho = '"Shippori Mincho", "Hiragino Mincho ProN", serif';
  $gothic = '"Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
  $display = $mincho;
  $body = $gothic;
  if ($font === 'gothic') {
    $display = $body = $gothic;
  } elseif ($font === 'mincho') {
    $display = $body = $mincho;
  }

  $rules = [
    '--font-scale: ' . $scale,
    '--font-display: ' . $display,
    '--font-body: ' . $body,
  ];
  if ($ink && $ink !== '#111111') {
    $rules[] = '--ink: ' . $ink;
  }
  if ($bg && strtolower($bg) !== '#fcfdfb') {
    $rules[] = '--bg: ' . $bg;
    $rules[] = '--bg-soft: color-mix(in srgb, var(--bg) 82%, #399d26 18%)';
    $rules[] = '--bg-mid: color-mix(in srgb, var(--bg) 55%, #399d26 45%)';
    $rules[] = '--bg-deep: color-mix(in srgb, var(--bg) 28%, #399d26 72%)';
    $rules[] = '--bg-end: color-mix(in srgb, var(--bg) 12%, #8fbf78 88%)';
  }

  echo '<style id="mbp-look">:root{' . implode(';', $rules) . ';}</style>' . "\n";
}
add_action('wp_head', 'mbp_look_css', 40);

function mbp_favicon() {
  if (function_exists('has_site_icon') && has_site_icon()) {
    return;
  }
  $url = mbp_asset('assets/images/favicon.png');
  echo '<link rel="icon" href="' . esc_url($url) . '" type="image/png" sizes="512x512">' . "\n";
  echo '<link rel="apple-touch-icon" href="' . esc_url($url) . '">' . "\n";
}
add_action('wp_head', 'mbp_favicon', 1);
add_action('admin_head', 'mbp_favicon');
add_action('login_head', 'mbp_favicon');

function mbp_scripts() {
  wp_enqueue_style('mbp-fonts', mbp_font_url(), [], null);
  wp_enqueue_style('mbp-style', get_stylesheet_uri(), ['mbp-fonts'], '1.1.25');
  wp_enqueue_script('mbp-script', mbp_asset('js/script.js'), [], '1.1.25', true);

  if (is_page_template('template-mentor.php')) {
    wp_enqueue_style('mbp-mentor', mbp_asset('css/mentor.css'), ['mbp-style'], '1.0.0');
  }

  if (is_page_template('template-fill-in.php')) {
    wp_enqueue_style('mbp-wireframe', mbp_asset('css/wireframe.css'), ['mbp-style'], '1.0.0');
    wp_enqueue_script(
      'html2pdf',
      'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
      [],
      '0.10.1',
      true
    );
    wp_enqueue_script('mbp-fill-in', mbp_asset('js/fill-in.js'), ['html2pdf'], '1.0.0', true);
  }
}
add_action('wp_enqueue_scripts', 'mbp_scripts');

function mbp_document_title($title) {
  if (is_front_page()) {
    $title['title'] = '増渕 敦 | Web Designer';
  }
  if (is_page('price-1man')) {
    $title['title'] = '1万円プラン';
  }
  if (is_page('price-option')) {
    $title['title'] = 'オプション';
  }
  if (is_page('price-wordpress')) {
    $title['title'] = 'WordPress';
  }
  return $title;
}
add_filter('document_title_parts', 'mbp_document_title');

function mbp_mentor_robots($robots) {
  if (is_page_template('template-mentor.php')) {
    $robots['noindex'] = true;
    $robots['nofollow'] = true;
  }
  return $robots;
}
add_filter('wp_robots', 'mbp_mentor_robots');

function mbp_cf7_form_markup() {
  return <<<'FORM'
<div class="contact-form-row">
<label for="contact-name">お名前 <span class="req">必須</span></label>
[text* your-name id:contact-name autocomplete:name akismet:author]
</div>
<div class="contact-form-row">
<label for="contact-email">メールアドレス <span class="req">必須</span></label>
[email* your-email id:contact-email autocomplete:email akismet:author_email]
</div>
<div class="contact-form-row">
<label for="contact-subject">件名</label>
[text your-subject id:contact-subject]
</div>
<div class="contact-form-row">
<label for="contact-message">お問い合わせ内容 <span class="req">必須</span></label>
[textarea* your-message id:contact-message]
</div>
[submit class:btn class:btn-primary class:contact-submit "送信する"]
FORM;
}

function mbp_cf7_recipient() {
  return 'atsushi.masubuchi.work@gmail.com';
}

function mbp_apply_cf7_mail($form) {
  $properties = $form->get_properties();
  $properties['form'] = mbp_cf7_form_markup();
  $properties['mail']['recipient'] = mbp_cf7_recipient();
  $properties['mail']['subject'] = '[_site_title] お問い合わせ: [your-subject]';
  $properties['mail']['body'] = "お名前: [your-name]\nメール: [your-email]\n件名: [your-subject]\n\n[your-message]\n";
  $form->set_properties($properties);
  $form->save();
}

function mbp_create_cf7_form() {
  if (!class_exists('WPCF7_ContactForm')) {
    return 0;
  }

  $existing = (int) get_option('mbp_cf7_id');
  $form = $existing ? WPCF7_ContactForm::get_instance($existing) : null;
  if ($form) {
    mbp_apply_cf7_mail($form);
    return $existing;
  }

  $form = WPCF7_ContactForm::get_template(['title' => 'お問い合わせ']);
  mbp_apply_cf7_mail($form);
  $id = (int) $form->id();
  update_option('mbp_cf7_id', $id);
  return $id;
}

function mbp_cf7_form_version() {
  return '1.1.25';
}

function mbp_sync_cf7_recipient() {
  $need_mail = get_option('mbp_cf7_recipient') !== mbp_cf7_recipient();
  $need_form = get_option('mbp_cf7_form_ver') !== mbp_cf7_form_version();
  if (!$need_mail && !$need_form) {
    return;
  }
  if (mbp_create_cf7_form()) {
    update_option('mbp_cf7_recipient', mbp_cf7_recipient());
    update_option('mbp_cf7_form_ver', mbp_cf7_form_version());
  }
}

function mbp_ensure_page($slug, $title, $template) {
  $page = get_page_by_path($slug);
  if (!$page) {
    $id = wp_insert_post([
      'post_title' => $title,
      'post_name' => $slug,
      'post_status' => 'publish',
      'post_type' => 'page',
      'post_content' => '',
    ]);
  } else {
    $id = $page->ID;
  }
  if ($id && !is_wp_error($id)) {
    update_post_meta($id, '_wp_page_template', $template);
  }
  return $id;
}

function mbp_work_defaults() {
  return [
    [
      'name' => 'vital',
      'title' => 'バイタル記録ノート',
      'menu_order' => 1,
      'tag' => 'Web App',
      'summary' => "血圧・脈拍・体重・体温をスマホで記録。\nカレンダーとグラフで振り返る軽量Webアプリ。",
      'link_type' => 'internal',
      'external_url' => '',
      'link_label' => '詳細を見る',
      'image' => 'assets/images/works/vital-thumb.png',
    ],
    [
      'name' => 'taro',
      'title' => "Taro's Scenery",
      'menu_order' => 2,
      'tag' => 'Website',
      'summary' => "フォトグラファー紹介の模写コーディング。\nABOUT／WORKS構成の静的サイト。",
      'link_type' => 'external',
      'external_url' => 'https://butti0108-spec.github.io/taro/',
      'link_label' => 'サイトを見る',
      'image' => 'assets/images/works/taro-thumb.png',
    ],
    [
      'name' => 'gnamgnam',
      'title' => 'Gnam gnam',
      'menu_order' => 3,
      'tag' => 'Website',
      'summary' => "イタリアンレストランの模写コーディング。\nコンセプト・メニュー・店舗情報の構成。",
      'link_type' => 'external',
      'external_url' => 'https://butti0108-spec.github.io/GnamGnam/',
      'link_label' => 'サイトを見る',
      'image' => 'assets/images/works/gnamgnam-thumb.png',
    ],
  ];
}

function mbp_save_work_meta($post_id, $meta) {
  if (!$post_id || is_wp_error($post_id)) {
    return;
  }
  foreach (['tag', 'summary', 'link_type', 'external_url', 'link_label', 'image'] as $key) {
    if (!isset($meta[$key])) {
      continue;
    }
    update_post_meta($post_id, '_mbp_work_' . $key, $meta[$key]);
  }
}

function mbp_ensure_work($item) {
  $existing = get_page_by_path($item['name'], OBJECT, 'work');
  if ($existing) {
    $id = $existing->ID;
    if (!get_post_meta($id, '_mbp_work_tag', true) && !get_post_meta($id, '_mbp_work_link_type', true)) {
      mbp_save_work_meta($id, $item);
      wp_update_post([
        'ID' => $id,
        'menu_order' => (int) $item['menu_order'],
      ]);
    }
    return $id;
  }

  $id = wp_insert_post([
    'post_title' => $item['title'],
    'post_name' => $item['name'],
    'post_status' => 'publish',
    'post_type' => 'work',
    'post_content' => '',
    'menu_order' => (int) $item['menu_order'],
  ]);
  mbp_save_work_meta($id, $item);
  return $id;
}

function mbp_seed_default_works() {
  foreach (mbp_work_defaults() as $item) {
    mbp_ensure_work($item);
  }
}

function mbp_work_image_url($post_id) {
  if (has_post_thumbnail($post_id)) {
    $url = get_the_post_thumbnail_url($post_id, 'large');
    if ($url) {
      return $url;
    }
  }
  $rel = get_post_meta($post_id, '_mbp_work_image', true);
  return $rel ? mbp_asset($rel) : '';
}

function mbp_work_link_url($post_id) {
  $type = get_post_meta($post_id, '_mbp_work_link_type', true);
  if ($type === 'external') {
    $url = get_post_meta($post_id, '_mbp_work_external_url', true);
    return $url ?: get_permalink($post_id);
  }
  return get_permalink($post_id);
}

function mbp_parse_lines($raw) {
  $lines = preg_split("/\r\n|\r|\n/", (string) $raw);
  $out = [];
  foreach ($lines as $line) {
    $line = trim($line);
    if ($line !== '') {
      $out[] = $line;
    }
  }
  return $out;
}

function mbp_parse_labeled_lines($raw) {
  $rows = [];
  foreach (mbp_parse_lines($raw) as $line) {
    if (strpos($line, '|') !== false) {
      $parts = array_map('trim', explode('|', $line, 2));
      $rows[] = ['label' => $parts[0], 'text' => $parts[1] ?? ''];
    } else {
      $rows[] = ['label' => '', 'text' => $line];
    }
  }
  return $rows;
}

function mbp_vital_detail_defaults() {
  return [
    'lead1' => '血圧・脈拍・体重・体温をスマートフォンで記録し、履歴を振り返るための軽量Webアプリです。',
    'lead2' => '毎日続けやすいよう、「記録する」と「見る」の画面をシンプルに分けています。',
    'role' => '個人制作（企画・画面構成・UIデザイン・コーディング）',
    'tech' => 'HTML / CSS / JavaScript、PWA（manifest / service worker）',
    'problems' => "記録のしづらさ|紙だと字が読みにくく、あとから数値を追いづらい。\nきっかけ|手描きの推移では変化が伝わりにくく、母から印刷して医師に見せられるようにしてほしいと言われた。\n目指したこと|スマホで入力し、期間のまとめやチャート、PDFで状態を分かりやすく確認できるようにする。",
    'points' => "「記録する／見る」の2画面に絞り、操作を単純にする\nスマホ表示を前提に、文字を大きめ・余白広め・ボタンを押しやすくし、高齢の方でも入力しやすいレイアウトにする\nChromeで開いて、スマートフォンにアプリとしてインストールできるようにする（PWA）\nCSVでバックアップ／復元できるほか、必要なときはバックアップ画面から全記録を削除できる\n選択した期間のまとめ・グラフ・測定一覧をPDFとして保存・印刷できる\n入力した数値から注意・確認の目安を表示し、必要に応じて受診を検討するよう促す",
    'app_url' => 'https://butti0108-spec.github.io/vital-record-notebook/',
    'github_url' => 'https://github.com/butti0108-spec/vital-record-notebook',
    'try_lead' => 'Chromeで開き、必要ならインストール。動作確認にはデモ用CSVも使えます。',
    'try_steps' => "試す|アプリを開き、必要ならインストールして動作を確認します。\nリセットする|確認後は、バックアップ画面から記録を削除できます。\n自分用に使う|そのあと、自分や家族の記録用として使い始められます。",
  ];
}

function mbp_seed_work_detail_meta() {
  $vital = get_page_by_path('vital', OBJECT, 'work');
  if (!$vital) {
    return;
  }
  $id = $vital->ID;
  if (get_post_meta($id, '_mbp_work_problems', true)) {
    return;
  }
  foreach (mbp_vital_detail_defaults() as $key => $value) {
    update_post_meta($id, '_mbp_work_' . $key, $value);
  }
}

function mbp_stamp_work_dates() {
  if (get_option('mbp_work_dates') === '1.1.17') {
    return;
  }
  $works = get_posts([
    'post_type' => 'work',
    'numberposts' => -1,
    'orderby' => 'menu_order',
    'order' => 'ASC',
    'post_status' => 'any',
  ]);
  $base = time();
  foreach ($works as $i => $post) {
    $stamp = $base - ($i * DAY_IN_SECONDS);
    wp_update_post([
      'ID' => $post->ID,
      'post_date' => wp_date('Y-m-d H:i:s', $stamp),
      'post_date_gmt' => gmdate('Y-m-d H:i:s', $stamp),
    ]);
  }
  update_option('mbp_work_dates', '1.1.17');
}
add_action('init', 'mbp_seed_work_detail_meta', 20);
add_action('init', 'mbp_stamp_work_dates', 21);

function mbp_work_field($post_id, $key, $fallback = '') {
  $value = get_post_meta($post_id, '_mbp_work_' . $key, true);
  return ($value !== '' && $value !== false) ? $value : $fallback;
}

function mbp_add_work_metabox() {
  add_meta_box(
    'mbp_work_fields',
    '作品の表示設定',
    'mbp_render_work_metabox',
    'work',
    'normal',
    'high'
  );
}
add_action('add_meta_boxes', 'mbp_add_work_metabox');

function mbp_render_work_metabox($post) {
  wp_nonce_field('mbp_save_work_fields', 'mbp_work_fields_nonce');
  $id = $post->ID;
  $tag = get_post_meta($id, '_mbp_work_tag', true);
  $summary = get_post_meta($id, '_mbp_work_summary', true);
  $link_type = get_post_meta($id, '_mbp_work_link_type', true) ?: 'internal';
  $external_url = get_post_meta($id, '_mbp_work_external_url', true);
  $link_label = get_post_meta($id, '_mbp_work_link_label', true);
  $lead1 = get_post_meta($id, '_mbp_work_lead1', true);
  $lead2 = get_post_meta($id, '_mbp_work_lead2', true);
  $role = get_post_meta($id, '_mbp_work_role', true);
  $tech = get_post_meta($id, '_mbp_work_tech', true);
  $problems = get_post_meta($id, '_mbp_work_problems', true);
  $points = get_post_meta($id, '_mbp_work_points', true);
  $app_url = get_post_meta($id, '_mbp_work_app_url', true);
  $github_url = get_post_meta($id, '_mbp_work_github_url', true);
  $try_lead = get_post_meta($id, '_mbp_work_try_lead', true);
  $try_steps = get_post_meta($id, '_mbp_work_try_steps', true);
  ?>
  <p>トップの Works には、公開日が新しい順に3件まで出ます。並びを変えるときは、右の「公開日時」を変えてください。</p>
  <p>
    <label for="mbp_work_tag">タグ（例: Website / Web App）</label><br>
    <input type="text" id="mbp_work_tag" name="mbp_work_tag" value="<?php echo esc_attr($tag); ?>" class="widefat">
  </p>
  <p>
    <label for="mbp_work_summary">一覧用の説明（改行で2行に分かれます）</label><br>
    <textarea id="mbp_work_summary" name="mbp_work_summary" rows="3" class="widefat"><?php echo esc_textarea($summary); ?></textarea>
  </p>
  <p>
    <label>リンク先</label><br>
    <label><input type="radio" name="mbp_work_link_type" value="internal" <?php checked($link_type, 'internal'); ?>> この作品の詳細ページ</label><br>
    <label><input type="radio" name="mbp_work_link_type" value="external" <?php checked($link_type, 'external'); ?>> 外部URL</label>
  </p>
  <p>
    <label for="mbp_work_external_url">外部URL</label><br>
    <input type="url" id="mbp_work_external_url" name="mbp_work_external_url" value="<?php echo esc_attr($external_url); ?>" class="widefat" placeholder="https://">
  </p>
  <p>
    <label for="mbp_work_link_label">リンクの文言（例: 詳細を見る / サイトを見る）</label><br>
    <input type="text" id="mbp_work_link_label" name="mbp_work_link_label" value="<?php echo esc_attr($link_label); ?>" class="widefat">
  </p>
  <p>サムネイルは「アイキャッチ画像」を使います。未設定のときはテーマ内の既定画像を使います。</p>
  <hr>
  <p><strong>詳細ページの文章</strong>（「この作品の詳細ページ」を選んだとき。画面の並びはテーマ側です）</p>
  <p>
    <label for="mbp_work_lead1">リード1行目</label><br>
    <textarea id="mbp_work_lead1" name="mbp_work_lead1" rows="2" class="widefat"><?php echo esc_textarea($lead1); ?></textarea>
  </p>
  <p>
    <label for="mbp_work_lead2">リード2行目</label><br>
    <textarea id="mbp_work_lead2" name="mbp_work_lead2" rows="2" class="widefat"><?php echo esc_textarea($lead2); ?></textarea>
  </p>
  <p>
    <label for="mbp_work_role">担当</label><br>
    <input type="text" id="mbp_work_role" name="mbp_work_role" value="<?php echo esc_attr($role); ?>" class="widefat">
  </p>
  <p>
    <label for="mbp_work_tech">技術</label><br>
    <input type="text" id="mbp_work_tech" name="mbp_work_tech" value="<?php echo esc_attr($tech); ?>" class="widefat">
  </p>
  <p>
    <label for="mbp_work_problems">課題（1行に「見出し|本文」。空行は無視）</label><br>
    <textarea id="mbp_work_problems" name="mbp_work_problems" rows="5" class="widefat"><?php echo esc_textarea($problems); ?></textarea>
  </p>
  <p>
    <label for="mbp_work_points">工夫した点（1行に1つ）</label><br>
    <textarea id="mbp_work_points" name="mbp_work_points" rows="7" class="widefat"><?php echo esc_textarea($points); ?></textarea>
  </p>
  <p>
    <label for="mbp_work_app_url">アプリを開く URL</label><br>
    <input type="url" id="mbp_work_app_url" name="mbp_work_app_url" value="<?php echo esc_attr($app_url); ?>" class="widefat" placeholder="https://">
  </p>
  <p>
    <label for="mbp_work_github_url">GitHub URL</label><br>
    <input type="url" id="mbp_work_github_url" name="mbp_work_github_url" value="<?php echo esc_attr($github_url); ?>" class="widefat" placeholder="https://">
  </p>
  <p>
    <label for="mbp_work_try_lead">使ってみる・リード</label><br>
    <textarea id="mbp_work_try_lead" name="mbp_work_try_lead" rows="2" class="widefat"><?php echo esc_textarea($try_lead); ?></textarea>
  </p>
  <p>
    <label for="mbp_work_try_steps">使ってみる・手順（1行に「見出し|本文」）</label><br>
    <textarea id="mbp_work_try_steps" name="mbp_work_try_steps" rows="5" class="widefat"><?php echo esc_textarea($try_steps); ?></textarea>
  </p>
  <?php
}

function mbp_save_work_fields($post_id) {
  if (!isset($_POST['mbp_work_fields_nonce']) || !wp_verify_nonce($_POST['mbp_work_fields_nonce'], 'mbp_save_work_fields')) {
    return;
  }
  if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
    return;
  }
  if (!current_user_can('edit_post', $post_id)) {
    return;
  }
  if (get_post_type($post_id) !== 'work') {
    return;
  }

  $link_type = (isset($_POST['mbp_work_link_type']) && $_POST['mbp_work_link_type'] === 'external') ? 'external' : 'internal';
  update_post_meta($post_id, '_mbp_work_tag', sanitize_text_field(wp_unslash($_POST['mbp_work_tag'] ?? '')));
  update_post_meta($post_id, '_mbp_work_summary', sanitize_textarea_field(wp_unslash($_POST['mbp_work_summary'] ?? '')));
  update_post_meta($post_id, '_mbp_work_link_type', $link_type);
  update_post_meta($post_id, '_mbp_work_external_url', esc_url_raw(wp_unslash($_POST['mbp_work_external_url'] ?? '')));
  update_post_meta($post_id, '_mbp_work_link_label', sanitize_text_field(wp_unslash($_POST['mbp_work_link_label'] ?? '')));
  update_post_meta($post_id, '_mbp_work_lead1', sanitize_textarea_field(wp_unslash($_POST['mbp_work_lead1'] ?? '')));
  update_post_meta($post_id, '_mbp_work_lead2', sanitize_textarea_field(wp_unslash($_POST['mbp_work_lead2'] ?? '')));
  update_post_meta($post_id, '_mbp_work_role', sanitize_text_field(wp_unslash($_POST['mbp_work_role'] ?? '')));
  update_post_meta($post_id, '_mbp_work_tech', sanitize_text_field(wp_unslash($_POST['mbp_work_tech'] ?? '')));
  update_post_meta($post_id, '_mbp_work_problems', sanitize_textarea_field(wp_unslash($_POST['mbp_work_problems'] ?? '')));
  update_post_meta($post_id, '_mbp_work_points', sanitize_textarea_field(wp_unslash($_POST['mbp_work_points'] ?? '')));
  update_post_meta($post_id, '_mbp_work_app_url', esc_url_raw(wp_unslash($_POST['mbp_work_app_url'] ?? '')));
  update_post_meta($post_id, '_mbp_work_github_url', esc_url_raw(wp_unslash($_POST['mbp_work_github_url'] ?? '')));
  update_post_meta($post_id, '_mbp_work_try_lead', sanitize_textarea_field(wp_unslash($_POST['mbp_work_try_lead'] ?? '')));
  update_post_meta($post_id, '_mbp_work_try_steps', sanitize_textarea_field(wp_unslash($_POST['mbp_work_try_steps'] ?? '')));
}
add_action('save_post_work', 'mbp_save_work_fields');

function mbp_ensure_vital_work() {
  return mbp_ensure_work(mbp_work_defaults()[0]);
}

function mbp_setup_site() {
  if (get_option('permalink_structure') !== '/%postname%/') {
    update_option('permalink_structure', '/%postname%/');
  }

  mbp_ensure_page('fill-in', '1万円プラン 記入用', 'template-fill-in.php');
  mbp_ensure_page('mentor', '確認用（メンター）', 'template-mentor.php');
  mbp_ensure_price_pages();
  mbp_seed_default_works();
  mbp_seed_work_detail_meta();
  mbp_stamp_work_dates();
  mbp_create_cf7_form();
  flush_rewrite_rules();
  update_option('mbp_setup_done', '1');
  update_option('mbp_cf7_recipient', mbp_cf7_recipient());
  update_option('mbp_cf7_form_ver', mbp_cf7_form_version());
}
add_action('after_switch_theme', 'mbp_setup_site');

function mbp_setup_if_needed() {
  if (!is_admin()) {
    return;
  }
  if (get_option('mbp_setup_done') !== '1') {
    mbp_setup_site();
    return;
  }
  mbp_sync_cf7_recipient();
  mbp_ensure_price_pages();
}
add_action('admin_init', 'mbp_setup_if_needed');

function mbp_ensure_price_pages() {
  mbp_ensure_page('price-1man', '1万円プラン', 'template-price.php');
  mbp_ensure_page('price-option', 'オプション', 'template-price.php');
  mbp_ensure_page('price-wordpress', 'WordPress', 'template-price.php');
}
add_action('init', 'mbp_ensure_price_pages');

function mbp_seed_works_if_needed() {
  if (get_option('mbp_works_seeded') === '1.0.9') {
    return;
  }
  mbp_seed_default_works();
  update_option('mbp_works_seeded', '1.0.9');
}
add_action('init', 'mbp_seed_works_if_needed');
