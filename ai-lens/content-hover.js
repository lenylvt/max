(() => {
  "use strict";

  const { escapeHtml, escapeAttr, rateLimitHtml, safeHTML } = window.__ailens;

  // ── Search Engine Link Selectors ────────────────────────────────────────
  const SEARCH_SELECTORS = {
    google:
      '#search a[href^="http"]:not([href*="google.com"]):not([role="button"])',
    bing: '#b_results .b_algo a[href^="http"]',
    duckduckgo: '[data-testid="result-title-a"], .result__a',
  };

  function getEngine() {
    const host = location.hostname;
    if (host.includes("google.")) return "google";
    if (host.includes("bing.")) return "bing";
    if (host.includes("duckduckgo.")) return "duckduckgo";
    return null;
  }

  const engine = getEngine();
  const isSearchEngine = !!engine;
  const searchSelector = engine ? SEARCH_SELECTORS[engine] : null;

  // ── Hyperlink mode: content area selectors ──────────────────────────────
  const CONTENT_SELECTORS = [
    "article",
    "main",
    ".content",
    ".post",
    ".entry",
    ".article",
    '[role="main"]',
    ".blog",
    ".story",
    ".text",
    ".body",
    ".page",
  ];

  function isInContentArea(el) {
    return CONTENT_SELECTORS.some((sel) => el.closest(sel));
  }

  function isExternalLink(a) {
    try {
      return new URL(a.href).hostname !== location.hostname;
    } catch {
      return false;
    }
  }

  // ── Card Element ──────────────────────────────────────────────────────────

  let card = null;
  let hoverTimer = null;
  let leaveTimer = null;
  let currentPreviewUrl = null;

  function createCard() {
    const el = document.createElement("div");
    el.className = "ailens-preview-card";
    document.body.appendChild(el);
    return el;
  }

  function positionCard(link) {
    const rect = link.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Always align to left of the word with fixed spacing
    const left = Math.max(8, rect.left + scrollX);

    // Position below by default, above if not enough space
    let top = rect.bottom + scrollY + 12;
    if (rect.bottom + 320 > window.innerHeight) {
      top = rect.top + scrollY - 312;
    }

    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function showCard(link) {
    if (!card || !card.isConnected) card = createCard();
    clearTimeout(leaveTimer);

    positionCard(link);

    // Shimmer loading skeleton
    safeHTML(card, `
      <div class="ailens-preview-loading">
        <div class="ailens-shimmer ailens-preview-shimmer"></div>
        <div class="ailens-shimmer ailens-preview-shimmer" style="width:75%"></div>
      </div>
    `);
    card.classList.add("ailens-visible", "ailens-loading");
    card.classList.remove("ailens-loaded");
    card.style.pointerEvents = "auto";

    currentPreviewUrl = link.href;
    fetchPreview(link.href);
  }

  function hideCard() {
    currentPreviewUrl = null;
    if (card) {
      card.classList.remove("ailens-visible", "ailens-loading", "ailens-loaded");
      card.style.pointerEvents = "none";
    }
  }

  async function fetchPreview(url) {
    try {
      const result = await browser.runtime.sendMessage({
        action: "fetchAndPreview",
        url,
      });

      if (currentPreviewUrl !== url) return;
      if (!card || !card.classList.contains("ailens-visible")) return;

      // Build HTML immediately — images load naturally via the browser
      const parts = [];
      if (result.ogImage) {
        parts.push(
          `<img class="ailens-preview-og" src="${escapeAttr(result.ogImage)}" alt="">`,
        );
      }
      parts.push(`<div class="ailens-preview-body">`);
      parts.push(
        `<div class="ailens-preview-title">${escapeHtml(result.title || "")}</div>`,
      );
      parts.push(
        `<div class="ailens-preview-desc">${escapeHtml(result.description || "")}</div>`,
      );
      if (result.domain) {
        parts.push(
          `<div class="ailens-preview-domain"><img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(result.domain)}&sz=32" alt=""><span>${escapeHtml(result.domain)}</span></div>`,
        );
      }
      parts.push(`</div>`);

      if (currentPreviewUrl !== url) return;

      // Trigger curtain animation
      card.classList.remove("ailens-loading");
      safeHTML(card, parts.join(""));
      void card.offsetWidth;
      card.classList.add("ailens-loaded");
    } catch (err) {
      if (currentPreviewUrl !== url) return;
      if (card && card.classList.contains("ailens-visible")) {
        card.classList.remove("ailens-loading");
        const rl = rateLimitHtml(err?.message, "ailens-hover");
        // R-13 FIX: Show network-specific error message
        const errorMsg = rl || `<div class="ailens-preview-error">${window.__ailens.escapeHtml(window.__ailens.getErrorMessage(err))}</div>`;
        safeHTML(card, errorMsg);
        void card.offsetWidth;
        card.classList.add("ailens-loaded");
      }
    }
  }

  // ── Event Handlers ────────────────────────────────────────────────────────

  function isValidTarget(link) {
    if (isSearchEngine) {
      return link.matches(searchSelector);
    }
    // Hyperlink mode: external links in content areas
    return (
      link.matches('a[href^="http"]') &&
      isExternalLink(link) &&
      isInContentArea(link)
    );
  }

  const HOVER_DELAY = 1000;
  const LEAVE_DELAY = 300;

  function hasActiveSelection() {
    const sel = window.getSelection();
    return sel && sel.toString().trim().length > 0;
  }

  // Use event delegation for both modes
  document.addEventListener("mouseover", (e) => {
    const link = e.target.closest("a");
    if (!link || !isValidTarget(link)) {
      // Keep card open when hovering it
      if (card && card.contains(e.target)) {
        clearTimeout(leaveTimer);
      }
      return;
    }

    // Don't trigger hover preview while user has text selected
    if (hasActiveSelection()) return;

    clearTimeout(hoverTimer);
    clearTimeout(leaveTimer);
    hoverTimer = setTimeout(() => {
      // Re-check selection right before showing (user may have selected during delay)
      if (!hasActiveSelection()) showCard(link);
    }, HOVER_DELAY);
  });

  document.addEventListener("mouseout", (e) => {
    const link = e.target.closest("a");
    if (link) {
      clearTimeout(hoverTimer);
      leaveTimer = setTimeout(hideCard, LEAVE_DELAY);
    }
    if (card && card.contains(e.target) && !card.contains(e.relatedTarget)) {
      leaveTimer = setTimeout(hideCard, LEAVE_DELAY);
    }
  });

  // Hide card on click so it doesn't block navigation
  document.addEventListener("click", (e) => {
    if (card && card.contains(e.target)) return;
    clearTimeout(hoverTimer);
    hideCard();
  });

  // Hide card on right-click so context menu works normally
  document.addEventListener("contextmenu", () => {
    clearTimeout(hoverTimer);
    hideCard();
  });
})();
