<?php
get_header();
$asset = 'mbp_asset';
?>
  <main id="main">
    <section class="hero" aria-labelledby="hero-title">
      <div class="shell hero-box">
        <div class="hero-stage">
          <img
            class="hero-photo"
            src="<?php echo esc_url(mbp_mod_image_url('mbp_img_hero', 'assets/images/hero/leaves-hero.png')); ?>"
            alt=""
            width="2752"
            height="1536"
          >
          <div class="hero-copy">
            <h1 id="hero-title">Web Designer</h1>
            <p class="hero-lead">「何を載せればいいか分からない」から<span class="phrase-keep">相談できます。</span></p>
            <p class="hero-lead">困りごとを聞いて目的を整理し、見やすく使いやすいサイトを</p>
            <p class="hero-lead">HTML / CSS / <span class="phrase-keep">JavaScript</span> と <span class="phrase-keep">WordPress</span> で<span class="phrase-keep">形にします。</span></p>
            <div class="hero-cta-inner">
              <a class="btn btn-primary" href="#works">作品を見る</a>
              <a class="btn btn-ghost" href="#contact">お問い合わせ</a>
            </div>
          </div>
        </div>
        <ul class="hero-value-list">
          <li>
            <p class="hero-value-title">見やすく</p>
            <p>先に伝えることを決めてから並べます。情報が散らかって見えない、を減らします。</p>
          </li>
          <li>
            <p class="hero-value-title">使いやすく</p>
            <p>次に何をすればいいか分かる画面にします。迷わず触れることを優先します。</p>
          </li>
          <li>
            <p class="hero-value-title">目的をカタチに</p>
            <p>作りたい画面から入らず、困りごとと目的を聞いてから構成を決めます。</p>
          </li>
        </ul>
      </div>
    </section>

    <section id="about" class="section about" aria-labelledby="about-title">
      <div class="shell">
        <div class="reveal-group" data-reveal-group>
          <p class="section-label" data-reveal>About</p>
          <h2 id="about-title" data-reveal style="--reveal-delay: 0.08s">Profile</h2>
          <p class="profile-name" data-reveal style="--reveal-delay: 0.16s">増渕 敦（Atsushi Masubuchi）</p>
          <p class="section-lead" data-reveal style="--reveal-delay: 0.24s">お客様の立場に立って考える Web Designer です。声になっていない要望にも耳を傾け、「何を作りたいか」だけでなく「なぜそれを作りたいのか」まで整理します。</p>
        </div>

        <div class="accordion-list" data-reveal-group>
          <details class="accordion" data-reveal="fade">
            <summary>大切にしていること</summary>
            <div class="accordion-body">
              <ul class="value-list">
                <li><span class="value-mark">【使う人基準】</span>見た目の新しさより、触ったときに迷わないかを先に判断する。</li>
                <li><span class="value-mark">【優先順位】</span>全部を同じ強さで出さない。先に伝えることを決めてから並べる。</li>
                <li><span class="value-mark">【統一感】</span>色・見出し・余白のトーンをサイト全体でそろえる。ページごとに印象が割れないこと。</li>
                <li><span class="value-mark">【引き算】</span>足す前に、無くても伝わるかを見る。装飾だけの要素は置かない。</li>
              </ul>
            </div>
          </details>

          <details class="accordion" data-reveal="fade" style="--reveal-delay: 0.1s">
            <summary>強み</summary>
            <div class="accordion-body">
              <ul class="strength-list">
                <li>
                  <span class="strength-label">要望を「困りごと」から聞く</span>
                  <span class="strength-text">作りたい画面から入らず、何に困っているかを先に聞いて、載せる順に分けます。</span>
                </li>
                <li>
                  <span class="strength-label">課題から設計する力</span>
                  <span class="strength-text">「バイタル記録ノート」は、実際の困りごとから機能・構成・UIを一から構想しました。</span>
                </li>
                <li>
                  <span class="strength-label">実物で判断する</span>
                  <span class="strength-text">言葉だけで決めず、画面を触ってから直します。このサイトの開閉もその判断です。</span>
                </li>
              </ul>
            </div>
          </details>
        </div>

        <ul class="skill-cards" data-reveal-group>
          <li class="skill-card" data-reveal="wave">
            <img class="skill-card-img" src="<?php echo esc_url(mbp_mod_image_url('mbp_img_profile_1', 'assets/images/works/web-design-3000-1.png')); ?>" alt="Webデザイン：見やすさ・伝わりやすさ" width="3000" height="2250" loading="lazy">
          </li>
          <li class="skill-card" data-reveal="wave" style="--reveal-delay: 0.16s">
            <img class="skill-card-img" src="<?php echo esc_url(mbp_mod_image_url('mbp_img_profile_2', 'assets/images/works/web-design-3000-2.png')); ?>" alt="コーディング：HTML / CSS / JavaScript" width="3000" height="2250" loading="lazy">
          </li>
          <li class="skill-card" data-reveal="wave" style="--reveal-delay: 0.32s">
            <img class="skill-card-img" src="<?php echo esc_url(mbp_mod_image_url('mbp_img_profile_3', 'assets/images/works/web-design-3000-3.png')); ?>" alt="課題から設計：使う人を想定したUI" width="3000" height="2250" loading="lazy">
          </li>
          <li class="skill-card" data-reveal="wave" style="--reveal-delay: 0.48s">
            <img class="skill-card-img" src="<?php echo esc_url(mbp_mod_image_url('mbp_img_profile_4', 'assets/images/works/web-design-3000-4.png')); ?>" alt="WordPress：更新しやすいサイトへ" width="3000" height="2250" loading="lazy">
          </li>
        </ul>
      </div>
    </section>

    <section id="works" class="section works" aria-labelledby="works-title">
      <div class="shell">
        <div class="reveal-group" data-reveal-group>
          <div data-reveal-trigger>
            <p class="section-label" data-reveal>Works</p>
            <h2 id="works-title" data-reveal>Selected Works</h2>
            <p class="section-lead" data-reveal style="--reveal-delay: 0.12s">制作したサイト・<span class="text-keep">Webアプリ</span>の一部です。新しい順に3件まで出ます。下の作品を押すと、詳細や実サイトを確認できます。</p>
          </div>

          <ul class="work-list">
          <?php
          $works = new WP_Query([
            'post_type' => 'work',
            'posts_per_page' => 3,
            'orderby' => 'date',
            'order' => 'DESC',
            'post_status' => 'publish',
          ]);
          if ($works->have_posts()) :
            $work_index = 0;
            while ($works->have_posts()) :
              $works->the_post();
              get_template_part('template-parts/work-card', null, ['index' => $work_index]);
              $work_index++;
            endwhile;
            wp_reset_postdata();
          endif;
          ?>
        </ul>
        </div>
      </div>
    </section>

    <section id="pricing" class="section pricing" aria-labelledby="pricing-title">
      <div id="offer" class="offer-anchor"></div>
      <div class="shell">
        <div class="reveal-group" data-reveal-group>
          <div data-reveal-trigger>
            <p class="section-label" data-reveal>Offer</p>
            <h2 id="pricing-title" data-reveal>ご依頼と料金</h2>
            <p class="section-lead" data-reveal style="--reveal-delay: 0.12s">ホームページは欲しいけれど、何から頼めばいいか分からない方へ。下の3つから選べます。「くわしく見る」で内容が開きます。金額を出しているのは1万円プランのみです。オプションと WordPress はお見積もりです。</p>
          </div>

          <ul class="work-list price-entry-list">
            <li class="work-item" id="price-entry-1man" data-reveal="work">
              <a class="price-entry" href="<?php echo esc_url(mbp_page_url('price-1man')); ?>">
                <img class="work-thumb" src="<?php echo esc_url($asset('assets/images/pricing/pricing-1man.png')); ?>" alt="" width="1376" height="768" loading="lazy">
                <div class="work-item-body">
                  <p class="price-card-fee">1万円</p>
                  <h3>1万円プラン</h3>
                  <p>まずは案内用の1ページが欲しい方へ。見た目はこのページと同じ作りです。</p>
                  <span class="work-link">くわしく見る</span>
                </div>
              </a>
            </li>
            <li class="work-item" id="price-entry-option" data-reveal="work" style="--reveal-delay: 0.22s">
              <a class="price-entry" href="<?php echo esc_url(mbp_page_url('price-option')); ?>">
                <img class="work-thumb" src="<?php echo esc_url($asset('assets/images/pricing/pricing-option.png')); ?>" alt="" width="1376" height="768" loading="lazy">
                <div class="work-item-body">
                  <p class="price-card-fee">お見積もり</p>
                  <h3>オプション</h3>
                  <p>1ページでは足りない・もう少し伝えたい方へ。ページや文章の整理などを足せます。</p>
                  <span class="work-link">くわしく見る</span>
                </div>
              </a>
            </li>
            <li class="work-item" id="price-entry-wordpress" data-reveal="work" style="--reveal-delay: 0.44s">
              <a class="price-entry" href="<?php echo esc_url(mbp_page_url('price-wordpress')); ?>">
                <img class="work-thumb" src="<?php echo esc_url($asset('assets/images/pricing/pricing-wordpress.png')); ?>" alt="" width="1376" height="768" loading="lazy">
                <div class="work-item-body">
                  <p class="price-card-fee">お見積もり</p>
                  <h3>WordPress</h3>
                  <p>あとから自分で直したい方へ。文章や写真を更新できるサイトにします。</p>
                  <span class="work-link">くわしく見る</span>
                </div>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section id="faq" class="section faq" aria-labelledby="faq-title">
      <div class="shell">
        <div class="reveal-group" data-reveal-group>
          <div data-reveal-trigger>
            <p class="section-label" data-reveal>FAQ</p>
            <h2 id="faq-title" data-reveal>よくある質問</h2>
          </div>

          <div class="accordion-list" data-reveal="fade" style="--reveal-delay: 0.12s">
            <details class="accordion">
              <summary>すでに WordPress を使っています。いくらかかりますか？</summary>
              <div class="accordion-body">
                <p class="offer-foot">お見積もりです。直したい範囲と使う機能で手間が変わるため、困りごとを聞いてから金額をお伝えします。金額そのものは、内容が分かるまで決めません。</p>
              </div>
            </details>
            <details class="accordion">
              <summary>まだ WordPress を使っていません。いくらかかりますか？</summary>
              <div class="accordion-body">
                <p class="offer-foot">お見積もりです。使えるようにするところから、あとから自分で直せる形まで、どこまで必要かで変わります。内容を聞いて決めます。</p>
              </div>
            </details>
            <details class="accordion">
              <summary>今あるサイトを WordPress にしたいのですが？</summary>
              <div class="accordion-body">
                <p class="offer-foot">お見積もりです。今のサイトを、自分で更新できる形にします。このウェブサイトと同じ見た目にする必要はありません。移す範囲を聞いてから金額をお伝えします。</p>
              </div>
            </details>
            <details class="accordion">
              <summary>1万円のプランに、入力して送れる問い合わせ欄は含まれますか？</summary>
              <div class="accordion-body">
                <p class="offer-foot">含まれません。1万円はメールアドレスの掲載と、押すとコピーできるところまでです。送れる欄が必要な場合は、オプションまたは WordPress で対応します。金額は内容を聞いてからお伝えします。</p>
              </div>
            </details>
            <details class="accordion">
              <summary>直しは何回までですか？</summary>
              <div class="accordion-body">
                <p class="offer-foot">1万円のプランは1回までです。2回目から別料金です。オプションや WordPress は、相談して決めます。</p>
              </div>
            </details>
            <details class="accordion">
              <summary>サーバー代は、制作費に含まれますか？</summary>
              <div class="accordion-body">
                <p class="offer-foot">含まれません。月々のサーバー代は、お客様の契約です。セキュリティなども同様です。</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </section>

    <section id="contact" class="contact-band" aria-labelledby="contact-title">
      <div class="shell contact-band-inner">
        <div class="reveal-group" data-reveal-group>
          <p class="section-label" data-reveal>Contact</p>
          <h2 id="contact-title" data-reveal style="--reveal-delay: 0.08s">制作のご相談</h2>
          <p class="contact-band-lead" data-reveal style="--reveal-delay: 0.16s">「何を載せればいいか分からない」段階でも大丈夫です。困りごとから聞きます。</p>
          <p class="contact-band-lead" data-reveal style="--reveal-delay: 0.24s">サイト制作・UI改善・<span class="text-keep">WordPress</span>など、ご質問はフォームからどうぞ。内容を確認のうえ、折り返しご連絡します。</p>
        </div>

        <div class="contact-form">
          <?php echo do_shortcode(mbp_cf7_shortcode()); ?>
          <p class="contact-form-note contact-recaptcha-note">このサイトは reCAPTCHA により保護されており、Google の<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>と<a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">利用規約</a>が適用されます。</p>
        </div>
      </div>
    </section>
  </main>
<?php
get_footer();
