<?php
get_header();

if (have_posts()) {
  the_post();
}

if (get_post_field('post_name', get_the_ID()) === 'vital') {
  get_template_part('template-parts/work', 'vital');
} else {
  ?>
  <main id="main" class="case">
    <div class="shell">
      <div class="case-intro">
        <p class="crumb"><a href="<?php echo esc_url(home_url('/#works')); ?>">Works</a> / <?php the_title(); ?></p>
        <p class="section-label">Work</p>
        <h1><?php the_title(); ?></h1>
        <?php the_content(); ?>
      </div>
      <p class="case-nav">
        <a href="<?php echo esc_url(home_url('/#works')); ?>">← Works一覧</a>
      </p>
    </div>
  </main>
  <?php
}

get_footer();
