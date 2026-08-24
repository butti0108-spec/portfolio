<?php
if (!defined('ABSPATH')) {
  exit;
}

$post_id = get_the_ID();
$index = isset($args['index']) ? (int) $args['index'] : 0;
$delay = number_format($index * 0.22, 2, '.', '');
$tag = get_post_meta($post_id, '_mbp_work_tag', true);
$summary = (string) get_post_meta($post_id, '_mbp_work_summary', true);
$link_type = get_post_meta($post_id, '_mbp_work_link_type', true);
$url = mbp_work_link_url($post_id);
$label = get_post_meta($post_id, '_mbp_work_link_label', true);
$image = mbp_work_image_url($post_id);
$title = get_the_title();
$external = $link_type === 'external';
$lines = preg_split("/\r\n|\r|\n/", $summary);
$lines = array_values(array_filter(array_map('trim', $lines), static function ($line) {
  return $line !== '';
}));
if (!$label) {
  $label = $external ? 'サイトを見る' : '詳細を見る';
}
?>
<li class="work-item" data-reveal="work" style="--reveal-delay: <?php echo esc_attr($delay); ?>s">
  <a href="<?php echo esc_url($url); ?>"<?php echo $external ? ' target="_blank" rel="noopener noreferrer"' : ''; ?>>
    <?php if ($image) : ?>
      <img class="work-thumb" src="<?php echo esc_url($image); ?>" alt="<?php echo esc_attr($title . 'の画面キャプチャ'); ?>" width="1200" height="750" loading="lazy">
    <?php endif; ?>
    <div class="work-item-body">
      <?php if ($tag) : ?>
        <span class="work-tag"><?php echo esc_html($tag); ?></span>
      <?php endif; ?>
      <h3><?php echo esc_html($title); ?></h3>
      <?php if ($lines) : ?>
        <div class="work-item-copy">
          <?php foreach ($lines as $line) : ?>
            <p><?php echo esc_html($line); ?></p>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
      <span class="work-link"><?php echo esc_html($label); ?></span>
    </div>
  </a>
</li>
