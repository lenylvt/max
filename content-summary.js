(() => {
  "use strict";

  const {
    escapeHtml,
    escapeAttr,
    extractPageContent,
    matchShortcut,
    loadShortcut,
  } = window.__ailens;

  let overlay = null;
  let isOpen = false;

  // ── Icon SVGs ────────────────────────────────────────────────────────

  const ICONS = {
    star: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>`,
    price: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v1H8a1 1 0 100 2h3a1 1 0 010 2H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2H9a1 1 0 010-2h3a1 1 0 100-2h-1V7z"/></svg>`,
    list: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>`,
    thumbsup: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zm4-.167v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/></svg>`,
    thumbsdown: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zm-4 .167v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z"/></svg>`,
    info: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
    clock: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>`,
    location: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>`,
    warning: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
    check: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
  };

  function getIcon(name) {
    return ICONS[name] || ICONS.info;
  }

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
          <div class="ailens-summary-card">
            <div class="ailens-summary-loading">
              <div class="ailens-shimmer-block"></div>
              <div class="ailens-shimmer-line w60"></div>
              <div class="ailens-shimmer-line w40"></div>
              <div class="ailens-shimmer-line w100"></div>
              <div class="ailens-shimmer-line w90"></div>
              <div class="ailens-shimmer-line w70"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelector(".ailens-close-btn").addEventListener(
      "click",
      closeOverlay,
    );
    el.addEventListener("click", (e) => {
      if (e.target === el) closeOverlay();
    });

    return el;
  }

  function buildShimmer() {
    return `
      <div class="ailens-summary-loading">
        <div class="ailens-shimmer-block"></div>
        <div class="ailens-shimmer-line w60"></div>
        <div class="ailens-shimmer-line w40"></div>
        <div class="ailens-shimmer-line w100"></div>
        <div class="ailens-shimmer-line w90"></div>
        <div class="ailens-shimmer-line w70"></div>
      </div>
    `;
  }

  function openOverlay() {
    if (isOpen) {
      closeOverlay();
      return;
    }

    if (!overlay) overlay = createOverlay();

    const card =
      overlay.querySelector(".ailens-summary-card") ||
      overlay.querySelector(".ailens-summary-content");
    card.innerHTML = buildShimmer();

    overlay.offsetHeight;
    overlay.classList.add("ailens-visible");
    isOpen = true;
    document.body.style.overflow = "hidden";

    const page = extractPageContent();
    generateSummary(card, page);
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove("ailens-visible");
    isOpen = false;
    document.body.style.overflow = "";
  }

  // ── Summary Generation ──────────────────────────────────────────────

  async function generateSummary(cardEl, page) {
    try {
      if (!page) page = extractPageContent();

      const result = await browser.runtime.sendMessage({
        action: "fetchAndSummarize",
        data: page,
      });

      if (!isOpen) return;

      renderSummary(cardEl, result, page);
    } catch (err) {
      if (!isOpen) return;
      cardEl.innerHTML = `
        <div class="ailens-summary-error">
          <div class="ailens-error-icon">${ICONS.warning}</div>
          <p>Could not generate summary</p>
          <p class="ailens-error-hint">${escapeHtml(err.message || "Unknown error")}</p>
          <p class="ailens-error-hint">Check your AI provider settings in the extension options.</p>
        </div>
      `;
    }
  }

  function renderSummary(cardEl, result, page) {
    const domain = result.domain || new URL(page.url).hostname;
    const heroSrc = result.ogImage || page.ogImage || "";
    const images = page.images || [];

    let html = "";

    // Hero image
    if (heroSrc) {
      html += `<div class="ailens-card-hero">
        <img src="${escapeAttr(heroSrc)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'">
      </div>`;
    }

    // Source line
    html += `
      <div class="ailens-card-source">
        <img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32" alt="" onerror="this.style.display='none'">
        <span>${escapeHtml(domain)}</span>
      </div>
    `;

    // Title
    html += `<h1 class="ailens-card-title">${escapeHtml(result.title || page.title || "")}</h1>`;

    // Subtitle
    if (result.subtitle) {
      html += `<p class="ailens-card-subtitle">${escapeHtml(result.subtitle)}</p>`;
    }

    // Summary
    if (result.summary) {
      html += `<p class="ailens-card-summary">${escapeHtml(result.summary)}</p>`;
    }

    // Divider
    const sections = result.sections || [];
    if (sections.length > 0) {
      html += `<div class="ailens-card-divider"></div>`;

      // Sections grid
      html += `<div class="ailens-card-sections">`;
      for (const section of sections) {
        html += `<div class="ailens-card-section">`;
        html += `<div class="ailens-section-header">`;
        html += `<span class="ailens-section-icon">${getIcon(section.icon)}</span>`;
        html += `<span class="ailens-section-label">${escapeHtml(section.label || "")}</span>`;
        html += `</div>`;

        if (section.items && section.items.length > 0) {
          html += `<ul class="ailens-section-list">`;
          for (const item of section.items) {
            html += `<li>${escapeHtml(item)}</li>`;
          }
          html += `</ul>`;
        } else if (section.content) {
          html += `<p class="ailens-section-content">${escapeHtml(section.content)}</p>`;
        }

        html += `</div>`;
      }
      html += `</div>`;
    }

    cardEl.innerHTML = html;
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
