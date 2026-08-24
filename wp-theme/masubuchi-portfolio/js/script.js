(() => {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#site-nav");
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
      nav.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      setOpen(open);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    const desktopNav = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => {
      if (desktopNav.matches) setOpen(false);
    };
    if (desktopNav.addEventListener) {
      desktopNav.addEventListener("change", closeOnDesktop);
    } else {
      desktopNav.addListener(closeOnDesktop);
    }
  }

  const openHashTarget = (hash) => {
    if (!hash || hash === "#") return;
    const id = decodeURIComponent(hash.slice(1));
    const target = document.getElementById(id);
    if (!target) return;

    let node = target;
    while (node) {
      if (node.tagName === "DETAILS") {
        node.open = true;
      }
      node = node.parentElement;
    }

    const priceEntry = /^#price-entry-(1man|option|wordpress)$/.test(hash);
    target.scrollIntoView({
      behavior: priceEntry ? "auto" : "smooth",
      block: "start",
    });
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href === "#") return;
    const id = decodeURIComponent(href.slice(1));
    if (!document.getElementById(id)) return;
    event.preventDefault();
    history.pushState(null, "", href);
    openHashTarget(href);
  });

  window.addEventListener("hashchange", () => openHashTarget(location.hash));
  if (location.hash) {
    openHashTarget(location.hash);
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const groups = Array.from(document.querySelectorAll("[data-reveal-group]"));
  if (groups.length && !reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("has-reveal");

    const isDesktop = window.matchMedia("(min-width: 60rem)").matches;
    const triggerToGroup = new Map();
    const revealGroup = (group, instant) => {
      if (group.classList.contains("is-revealed")) return;
      if (instant) group.classList.add("is-instant");
      group.classList.add("is-revealed");
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const group = triggerToGroup.get(entry.target);
          if (!group) return;
          revealGroup(group, false);
          io.unobserve(entry.target);
        });
      },
      isDesktop
        ? { threshold: 0.2, rootMargin: "0px 0px -18% 0px" }
        : { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
    );

    groups.forEach((group) => {
      const trigger = group.querySelector("[data-reveal-trigger]") || group;
      triggerToGroup.set(trigger, group);
      io.observe(trigger);
    });

    const catchPassedGroups = () => {
      triggerToGroup.forEach((group, trigger) => {
        if (group.classList.contains("is-revealed")) return;
        const rect = trigger.getBoundingClientRect();
        if (rect.bottom < 0) {
          revealGroup(group, true);
          io.unobserve(trigger);
        }
      });
    };

    window.addEventListener("scroll", catchPassedGroups, { passive: true });
  }

  const galleryImages = document.querySelectorAll(".shot-gallery img, .case-zigzag-shot img");
  if (!galleryImages.length) return;

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.25;

  let zoom = 1;
  let lastFocus = null;

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.hidden = true;
  lightbox.innerHTML = `
    <div class="lightbox-backdrop" data-lightbox-close></div>
    <div class="lightbox-dialog" role="dialog" aria-modal="true" aria-label="画像の拡大表示">
      <button type="button" class="lightbox-close" data-lightbox-close aria-label="閉じる">×</button>
      <div class="lightbox-stage">
        <div class="lightbox-canvas">
          <img class="lightbox-image" alt="">
        </div>
      </div>
      <div class="lightbox-toolbar">
        <button type="button" class="lightbox-zoom-out" aria-label="縮小">−</button>
        <span class="lightbox-zoom-label">100%</span>
        <button type="button" class="lightbox-zoom-in" aria-label="拡大">＋</button>
        <span class="lightbox-hint">Ctrl＋ホイールでもズーム（Macは Command）</span>
      </div>
    </div>
  `;
  document.body.appendChild(lightbox);

  const stageEl = lightbox.querySelector(".lightbox-stage");
  const imageEl = lightbox.querySelector(".lightbox-image");
  const zoomLabel = lightbox.querySelector(".lightbox-zoom-label");
  const zoomInBtn = lightbox.querySelector(".lightbox-zoom-in");
  const zoomOutBtn = lightbox.querySelector(".lightbox-zoom-out");

  let baseWidth = 0;

  const measureBaseWidth = () => {
    imageEl.style.width = "";
    imageEl.style.maxWidth = "";
    imageEl.style.maxHeight = "";
    const rect = imageEl.getBoundingClientRect();
    baseWidth = Math.max(rect.width, 1);
  };

  const applyZoom = () => {
    if (baseWidth > 0) {
      imageEl.style.maxWidth = "none";
      imageEl.style.maxHeight = "none";
      imageEl.style.width = `${baseWidth * zoom}px`;
    }
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    zoomOutBtn.disabled = zoom <= MIN_ZOOM;
    zoomInBtn.disabled = zoom >= MAX_ZOOM;
  };

  const centerScroll = () => {
    requestAnimationFrame(() => {
      stageEl.scrollLeft = Math.max((stageEl.scrollWidth - stageEl.clientWidth) / 2, 0);
      stageEl.scrollTop = Math.max((stageEl.scrollHeight - stageEl.clientHeight) / 2, 0);
    });
  };

  const setZoom = (next) => {
    const previous = zoom;
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    applyZoom();
    if (zoom !== previous) {
      centerScroll();
    }
  };

  const openLightbox = (sourceImg) => {
    lastFocus = document.activeElement;
    zoom = 1;
    baseWidth = 0;
    imageEl.style.width = "";
    imageEl.style.maxWidth = "";
    imageEl.style.maxHeight = "";
    imageEl.alt = sourceImg.alt || "";

    const reveal = () => {
      measureBaseWidth();
      applyZoom();
      centerScroll();
      lightbox.querySelector(".lightbox-close").focus();
    };

    imageEl.addEventListener("load", reveal, { once: true });
    imageEl.src = sourceImg.currentSrc || sourceImg.src;
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");

    if (imageEl.complete && imageEl.naturalWidth > 0) {
      reveal();
    }
  };

  const closeLightbox = () => {
    if (lightbox.hidden) return;
    lightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
    imageEl.removeAttribute("src");
    imageEl.style.width = "";
    imageEl.style.maxWidth = "";
    imageEl.style.maxHeight = "";
    baseWidth = 0;
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
  };

  galleryImages.forEach((img) => {
    img.classList.add("is-zoomable");
    img.setAttribute("tabindex", "0");
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", (img.alt || "画像") + "を拡大表示");

    img.addEventListener("click", () => openLightbox(img));
    img.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(img);
      }
    });
  });

  lightbox.addEventListener("click", (event) => {
    if (event.target.closest("[data-lightbox-close]")) {
      closeLightbox();
    }
  });

  zoomInBtn.addEventListener("click", () => setZoom(zoom + ZOOM_STEP));
  zoomOutBtn.addEventListener("click", () => setZoom(zoom - ZOOM_STEP));

  stageEl.addEventListener(
    "wheel",
    (event) => {
      if (lightbox.hidden) return;
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        setZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
      }
    },
    { passive: false }
  );

  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(zoom + ZOOM_STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      setZoom(zoom - ZOOM_STEP);
    }
  });

})();
