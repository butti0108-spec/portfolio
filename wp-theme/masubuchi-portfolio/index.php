<?php
get_header();
?>
<main id="main">
  <section class="section">
    <div class="shell">
      <?php if (have_posts()) : ?>
        <?php while (have_posts()) : the_post(); ?>
          <h1><?php the_title(); ?></h1>
          <?php the_content(); ?>
        <?php endwhile; ?>
      <?php else : ?>
        <p>ページが見つかりませんでした。</p>
      <?php endif; ?>
    </div>
  </section>
</main>
<?php
get_footer();
