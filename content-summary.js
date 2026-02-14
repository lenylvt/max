(() => {
  "use strict";

  const { escapeHtml, escapeAttr, extractPageContent, renderMarkdownSafe, matchShortcut, loadShortcut } =
    window.__ailens;

  let overlay = null;
  let isOpen = false;

  // ── Overlay ───────────────────────────────────────────────────────────

  function createOverlay() {
    const el = document.createElement("div");
    el.className = "ailens-overlay";
    el.innerHTML = `
      <div class="ailens-summary-container">
        <button class="ailens-close-btn" title="Close (Esc)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4l8 8M12 4l-8 8"/>
          </svg>
        </button>
        <div class="ailens-summary-content">
          <div class="ailens-summary-loading">
            <div class="ailens-shimmer-line"></div>
            <div class="ailens-shimmer-line"></div>
            <div class="ailens-shimmer-line"></div>
            <div class="ailens-shimmer-line"></div>
            <div class="ailens-shimmer-line"></div>
            <div class="ailens-shimmer-line"></div>
            <div class="ailens-shimmer-line"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    // Close handlers
    el.querySelector(".ailens-close-btn").addEventListener(
      "click",
      closeOverlay,
    );
    el.addEventListener("click", (e) => {
      if (e.target === el) closeOverlay();
    });

    return el;
  }

  function openOverlay() {
    if (isOpen) {
      closeOverlay();
      return;
    }

    if (!overlay) overlay = createOverlay();

    const content = overlay.querySelector(".ailens-summary-content");
    content.innerHTML = `
      <div class="ailens-summary-loading">
        <div class="ailens-shimmer-line"></div>
        <div class="ailens-shimmer-line"></div>
        <div class="ailens-shimmer-line"></div>
        <div class="ailens-shimmer-line"></div>
        <div class="ailens-shimmer-line"></div>
        <div class="ailens-shimmer-line"></div>
        <div class="ailens-shimmer-line"></div>
      </div>
    `;

    // Force reflow before adding visible class for animation
    overlay.offsetHeight;
    overlay.classList.add("ailens-visible");
    isOpen = true;
    document.body.style.overflow = "hidden";

    // Extract page content and show breadcrumb + loading immediately
    const page = extractPageContent();
    if (page.title) {
      const domain = new URL(page.url).hostname;
      content.innerHTML = `
        ${buildBreadcrumb(domain, page.title, page.url)}
        <div class="ailens-summary-loading">
          <div class="ailens-shimmer-line"></div>
          <div class="ailens-shimmer-line"></div>
          <div class="ailens-shimmer-line"></div>
          <div class="ailens-shimmer-line"></div>
          <div class="ailens-shimmer-line"></div>
          <div class="ailens-shimmer-line"></div>
          <div class="ailens-shimmer-line"></div>
        </div>
      `;
    }

    generateSummary(content, page);
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove("ailens-visible");
    isOpen = false;
    document.body.style.overflow = "";
  }

  // ── Breadcrumb ────────────────────────────────────────────────────────

  function buildBreadcrumb(domain, title, url) {
    return `
      <div class="ailens-breadcrumb-wrap">
        <a class="ailens-breadcrumb" href="${escapeAttr(url)}" target="_blank" rel="noopener">
          <img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32" alt="" onerror="this.style.display='none'">
          <span class="ailens-breadcrumb-domain">${escapeHtml(domain)}</span>
          <span class="ailens-breadcrumb-sep">
            <svg viewBox="0 0 6 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l4 4-4 4"/></svg>
          </span>
          <span class="ailens-breadcrumb-title">${escapeHtml(title)}</span>
          <svg class="ailens-breadcrumb-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 2L8.5 2L8.5 7"/><path d="M8.5 2L2 8.5"/></svg>
        </a>
      </div>
    `;
  }

  // ── Summary Generation ────────────────────────────────────────────────

  async function generateSummary(contentEl, page) {
    try {
      if (!page) page = extractPageContent();

      const result = await browser.runtime.sendMessage({
        action: "fetchAndSummarize",
        data: page,
      });

      if (!isOpen) return;

      renderSummary(contentEl, result, page);
    } catch (err) {
      if (!isOpen) return;
      contentEl.innerHTML = `
        <div class="ailens-summary-error">
          <p>Could not generate summary</p>
          <p class="ailens-error-hint">${escapeHtml(err.message || "Unknown error")}</p>
          <p class="ailens-error-hint">Check your AI provider settings in the extension options.</p>
        </div>
      `;
    }
  }

  function renderSummary(contentEl, result, page) {
    let html = renderMarkdownSafe(result.markdown || "");
    html = processCitations(html);

    let output = "";

    // Breadcrumb pill
    const domain = new URL(page.url).hostname;
    output += buildBreadcrumb(domain, page.title || domain, page.url);

    // Image gallery
    const images = page.images || [];
    if (images.length > 0) {
      output += `<div class="ailens-image-gallery">`;
      images.forEach((src) => {
        output += `<img src="${escapeAttr(src)}" alt="" loading="lazy" onerror="this.style.display='none'">`;
      });
      output += `</div>`;
    }

    // Main content
    output += `<div class="ailens-summary-body">${html}</div>`;

    contentEl.innerHTML = output;
  }

  function processCitations(html) {
    return html.replace(
      /\[(\d+)\]/g,
      '<span class="ailens-citation">$1</span>',
    );
  }

  // ── Message Listener ──────────────────────────────────────────────────

  browser.runtime.onMessage.addListener((msg) => {
    if (msg.action === "triggerSummary") {
      openOverlay();
    }
  });

  // ── Keyboard Shortcut ─────────────────────────────────────────────────

  let cachedShortcut = null;
  loadShortcut("toggleSummary", "Ctrl+Shift+S").then(
    (s) => (cachedShortcut = s),
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      closeOverlay();
    }
    if (matchShortcut(e, cachedShortcut)) {
      e.preventDefault();
      if (isOpen) {
        closeOverlay();
      } else {
        openOverlay();
      }
    }
  });
})();
