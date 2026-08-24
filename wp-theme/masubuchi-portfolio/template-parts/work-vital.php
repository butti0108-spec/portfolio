<?php
$contact = home_url('/#contact');
$works = home_url('/#works');
$post_id = get_the_ID();
$defaults = mbp_vital_detail_defaults();
$lead1 = mbp_work_field($post_id, 'lead1', $defaults['lead1']);
$lead2 = mbp_work_field($post_id, 'lead2', $defaults['lead2']);
$role = mbp_work_field($post_id, 'role', $defaults['role']);
$tech = mbp_work_field($post_id, 'tech', $defaults['tech']);
$problems = mbp_parse_labeled_lines(mbp_work_field($post_id, 'problems', $defaults['problems']));
$points = mbp_parse_lines(mbp_work_field($post_id, 'points', $defaults['points']));
$app_url = mbp_work_field($post_id, 'app_url', $defaults['app_url']);
$github_url = mbp_work_field($post_id, 'github_url', $defaults['github_url']);
$try_lead = mbp_work_field($post_id, 'try_lead', $defaults['try_lead']);
$try_steps = mbp_parse_labeled_lines(mbp_work_field($post_id, 'try_steps', $defaults['try_steps']));
?>
  <main id="main" class="case">
    <div class="shell">
      <div class="case-intro">
        <p class="crumb"><a href="<?php echo esc_url($works); ?>">Works</a> / <?php the_title(); ?></p>
        <p class="section-label">Work</p>
        <h1><?php the_title(); ?></h1>
        <?php if ($lead1) : ?>
          <p class="case-lead"><?php echo esc_html($lead1); ?></p>
        <?php endif; ?>
        <?php if ($lead2) : ?>
          <p class="case-lead"><?php echo esc_html($lead2); ?></p>
        <?php endif; ?>

        <dl class="meta-grid">
          <?php if ($role) : ?>
          <div>
            <dt>担当</dt>
            <dd><?php echo esc_html($role); ?></dd>
          </div>
          <?php endif; ?>
          <?php if ($tech) : ?>
          <div>
            <dt>技術</dt>
            <dd><?php echo esc_html($tech); ?></dd>
          </div>
          <?php endif; ?>
        </dl>
        <p class="shot-note">画面イメージは制作時点のものです。クリックで拡大できます（＋／−、または <span class="text-keep">Ctrl＋ホイール</span>。Macは Command）。</p>
      </div>

      <section class="case-zigzag case-zigzag-text-first" aria-labelledby="problem-title">
        <div class="case-zigzag-copy case-block">
          <h2 id="problem-title">課題</h2>
          <ol class="case-points">
            <?php foreach ($problems as $row) : ?>
            <li>
              <?php if ($row['label'] !== '') : ?>
                <span class="case-point-label"><?php echo esc_html($row['label']); ?></span>
              <?php endif; ?>
              <span class="case-point-text"><?php echo esc_html($row['text']); ?></span>
            </li>
            <?php endforeach; ?>
          </ol>
        </div>
        <figure class="case-zigzag-shot shot-card">
          <figcaption>記録する<span class="shot-click-hint">クリックで拡大</span></figcaption>
          <div class="phone-frame">
            <div class="phone-screen">
              <img src="<?php echo esc_url(mbp_asset('assets/images/vital/record.png')); ?>" alt="バイタル記録ノートの記録画面。血圧と脈拍を入力するスマホUI。" width="390" height="317" loading="eager">
            </div>
          </div>
        </figure>
      </section>

      <section class="case-zigzag case-zigzag-media-first" aria-labelledby="approach-title">
        <figure class="case-zigzag-shot shot-card">
          <figcaption>カレンダーで振り返る<span class="shot-click-hint">クリックで拡大</span></figcaption>
          <div class="phone-frame">
            <div class="phone-screen">
              <img src="<?php echo esc_url(mbp_asset('assets/images/vital/calendar.png')); ?>" alt="カレンダーで日付を選び、その日の記録を確認する画面。" width="621" height="1024" loading="lazy">
            </div>
          </div>
        </figure>
        <div class="case-zigzag-copy case-block">
          <h2 id="approach-title">工夫した点</h2>
          <ul>
            <?php foreach ($points as $point) : ?>
            <li><?php echo esc_html($point); ?></li>
            <?php endforeach; ?>
          </ul>
        </div>
      </section>

      <section class="case-zigzag case-zigzag-text-first" aria-labelledby="try-title">
        <div class="case-zigzag-copy case-block case-block-try">
          <h2 id="try-title">使ってみる</h2>
          <?php if ($try_lead) : ?>
          <p><?php echo esc_html($try_lead); ?></p>
          <?php endif; ?>
          <p class="work-links work-links-try">
            <?php if ($app_url) : ?>
            <a class="btn btn-primary" href="<?php echo esc_url($app_url); ?>" target="_blank" rel="noopener noreferrer">アプリを開く</a>
            <?php endif; ?>
            <?php if ($github_url) : ?>
            <a class="btn btn-ghost" href="<?php echo esc_url($github_url); ?>" target="_blank" rel="noopener noreferrer">GitHub</a>
            <?php endif; ?>
            <a class="btn btn-primary" href="<?php echo esc_url(mbp_asset('assets/vital-demo-sample.csv')); ?>" download="vital-demo-sample.csv">デモ用CSV</a>
          </p>
          <ol class="case-points">
            <?php foreach ($try_steps as $row) : ?>
            <li>
              <?php if ($row['label'] !== '') : ?>
                <span class="case-point-label"><?php echo esc_html($row['label']); ?></span>
              <?php endif; ?>
              <span class="case-point-text"><?php echo esc_html($row['text']); ?></span>
            </li>
            <?php endforeach; ?>
          </ol>
          <p class="case-cta">
            同種のアプリ制作やご相談があれば、
            <a href="<?php echo esc_url($contact); ?>">Contact</a>
            からお気軽にご連絡ください。
          </p>
        </div>
        <figure class="case-zigzag-shot shot-card">
          <figcaption>グラフで推移を確認<span class="shot-click-hint">クリックで拡大</span></figcaption>
          <div class="phone-frame">
            <div class="phone-screen">
              <img src="<?php echo esc_url(mbp_asset('assets/images/vital/graphs.png')); ?>" alt="血圧・脈拍・体重の推移グラフ画面。" width="390" height="665" loading="lazy">
            </div>
          </div>
        </figure>
      </section>

      <p class="case-nav">
        <a href="<?php echo esc_url($works); ?>">← Works一覧</a>
      </p>
    </div>
  </main>
