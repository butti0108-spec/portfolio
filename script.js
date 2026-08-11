(() => {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#site-nav");
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      setOpen(open);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
  }

  const galleryImages = document.querySelectorAll(".shot-gallery img");
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

  const setZoom = (next) => {
    const previous = zoom;
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    applyZoom();

    if (zoom !== previous) {
      const ratio = stageEl.scrollTop / Math.max(stageEl.scrollHeight - stageEl.clientHeight, 1);
      requestAnimationFrame(() => {
        const maxScroll = Math.max(stageEl.scrollHeight - stageEl.clientHeight, 0);
        stageEl.scrollTop = ratio * maxScroll;
      });
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
      stageEl.scrollTop = 0;
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
