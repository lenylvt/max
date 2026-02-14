(() => {
  "use strict";

  const { escapeHtml, escapeAttr } = window.__ailens;

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
  let activeLink = null;

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
    let top = rect.bottom + scrollY + 8;
    let left = Math.max(
      8,
      Math.min(rect.left + scrollX, window.innerWidth - 400),
    );

    // If card would go below viewport, show above
    if (rect.bottom + 280 > window.innerHeight) {
      top = rect.top + scrollY - 280;
    }

    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function showCard(link) {
    if (!card) card = createCard();
    clearTimeout(leaveTimer);

    positionCard(link);

    // Shimmer loading skeleton
    card.innerHTML = `
      <div class="ailens-preview-loading">
        <div class="ailens-preview-shimmer"></div>
        <div class="ailens-preview-shimmer" style="width:85%"></div>
        <div class="ailens-preview-shimmer" style="width:65%"></div>
        <div class="ailens-preview-shimmer" style="width:40%;margin-top:6px"></div>
      </div>
    `;
    card.classList.add("ailens-visible");
    card.style.pointerEvents = "auto";

    activeLink = link;
    fetchPreview(link.href);
  }

  function hideCard() {
    if (card) {
      card.classList.remove("ailens-visible");
      card.style.pointerEvents = "none";
    }
    activeLink = null;
  }

  async function fetchPreview(url) {
    try {
      const result = await browser.runtime.sendMessage({
        action: "fetchAndPreview",
        url,
      });

      if (!card || !card.classList.contains("ailens-visible")) return;

      let html = "";
      if (result.ogImage) {
        html += `<img class="ailens-preview-og" src="${escapeAttr(result.ogImage)}" alt="" onerror="this.style.display='none'">`;
      }
      html += `<div class="ailens-preview-body">`;
      html += `<div class="ailens-preview-title">${escapeHtml(result.title || "")}</div>`;
      html += `<div class="ailens-preview-desc">${escapeHtml(result.description || "")}</div>`;
      if (result.domain) {
        html += `<div class="ailens-preview-domain">`;
        html += `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(result.domain)}&sz=32" alt="" onerror="this.style.display='none'">`;
        html += `<span>${escapeHtml(result.domain)}</span>`;
        html += `</div>`;
      }
      html += `</div>`;

      card.innerHTML = html;
    } catch {
      if (card && card.classList.contains("ailens-visible")) {
        card.innerHTML = `<div class="ailens-preview-error">Preview unavailable</div>`;
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

  // Don't show preview while user is selecting text
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
      leaveTimer = setTimeout(() => hideCard(), 300);
    }
    if (card && card.contains(e.target) && !card.contains(e.relatedTarget)) {
      leaveTimer = setTimeout(() => hideCard(), 300);
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
