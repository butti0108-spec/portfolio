<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <?php if (is_front_page()) : ?>
    <meta name="description" content="増渕 敦（マスブチ アツシ）のポートフォリオ。困りごとから聞いて、見やすく使いやすいWebサイトを制作します。">
  <?php elseif (is_singular('work') && get_post_field('post_name') === 'vital') : ?>
    <meta name="description" content="バイタル記録ノートの制作事例。">
  <?php endif; ?>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <script>
    document.documentElement.classList.add("js");
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("has-reveal");
    }
    if (/^#price-entry-(1man|option|wordpress)$/.test(location.hash)) {
      document.documentElement.classList.add("jump-hash");
      window.addEventListener("load", function () {
        window.setTimeout(function () {
          document.documentElement.classList.remove("jump-hash");
        }, 80);
      });
    }
  </script>
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
  <a class="skip-link" href="#main">本文へスキップ</a>

  <header class="site-header">
    <div class="shell header-inner">
      <a class="logo" href="<?php echo esc_url(home_url('/')); ?>">増渕 敦</a>
      <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="メニューを開く">
        <span class="nav-toggle-bars" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span class="nav-toggle-label">メニュー</span>
      </button>
      <nav id="site-nav" class="site-nav" aria-label="メイン">
        <a href="<?php echo esc_url(home_url('/#about')); ?>">About</a>
        <a href="<?php echo esc_url(home_url('/#works')); ?>">Works</a>
        <a href="<?php echo esc_url(home_url('/#contact')); ?>">Contact</a>
      </nav>
    </div>
  </header>
