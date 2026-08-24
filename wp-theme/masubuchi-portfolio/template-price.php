<?php
/**
 * Template Name: 料金プラン
 */
get_header();
$slug = get_post_field('post_name');
$parts = [
  'price-1man' => '1man',
  'price-option' => 'option',
  'price-wordpress' => 'wordpress',
];
$key = isset($parts[$slug]) ? $parts[$slug] : '';
$back = $key ? home_url('/#price-entry-' . $key) : home_url('/#pricing');
?>
  <main id="main" class="price-plan">
    <div class="shell">
      <p class="section-label">Offer</p>
      <h1><?php the_title(); ?></h1>
      <div class="price-panel">
        <div class="price-panel-copy">
          <?php
          if ($key) {
            get_template_part('template-parts/price', $key);
          } else {
            the_content();
          }
          ?>
        </div>
      </div>
      <p class="case-nav">
        <a href="<?php echo esc_url($back); ?>">ご依頼と料金へ戻る</a>
      </p>
    </div>
  </main>
<?php
get_footer();
