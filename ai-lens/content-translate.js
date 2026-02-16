(() => {
  "use strict";

  const { escapeHtml, matchShortcut, loadShortcut, rateLimitHtml, isNetworkError, getErrorMessage, safeHTML } = window.__ailens;

  let isTranslating = false;
  let isTranslated = false;
  // R-9 FIX: Use WeakMap to prevent memory leaks from detached DOM elements (SPA pages)
  let originals = new WeakMap();
  let originalsKeys = []; // Keep track of elements for iteration
  let indicator = null;

  // ── Target selectors — leaf block elements with readable text ──────────

  const TARGETS =
    "p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, dt, dd, summary, caption, label, div, section, article, span";

  // Elements that count as "block children" — if a TARGETS element contains
  // any of these, it's not a leaf and we skip it (we'll translate its children instead).
  const BLOCK_CHILDREN =
    "p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, dt, dd, summary, caption, ul, ol, table, div, section, article";

  const SKIP_CLOSEST = [
    ".ailens-overlay",
    ".ailens-search-bar",
    ".ailens-preview-card",
    ".ailens-translate-indicator",
    ".ailens-ask-panel",
    "nav",
    "footer",
    "header",
    "[role='navigation']",
    "[role='banner']",
    "[role='contentinfo']",
  ];

  // ── Collect translatable elements — fast querySelectorAll ──────────────

  function collectElements() {
    const all = document.querySelectorAll(TARGETS);
    const els = [];

    for (const el of all) {
      // Skip our own UI and nav/footer noise
      let skip = false;
      for (const sel of SKIP_CLOSEST) {
        if (el.closest(sel)) {
          skip = true;
          break;
        }
      }
      if (skip) continue;

      // Skip hidden elements
      if (!el.offsetParent && el.tagName !== "BODY" && el.tagName !== "HTML")
        continue;

      // Skip if contains other block children (not a leaf)
      if (el.querySelector(BLOCK_CHILDREN)) continue;

      // Get visible text
      const text = el.innerText?.trim();
      if (!text || text.length < 3) continue;

      // Skip purely numeric or symbol-only
      if (/^[\d\s.,;:!?%$\u20ac\u00a3#@*()\-+=/<>]+$/.test(text)) continue;

      // For span elements, only include those with substantial text (avoid icons, badges etc.)
      if (el.tagName === "SPAN" && text.length < 15) continue;

      els.push(el);
    }

    return els;
  }

  // ── Chunk elements into batches for fewer API calls ────────────────────

  // S-8 FIX: Increased chunk size from 4000 to 10000 for fewer API calls
  function chunkElements(els, maxChars = 10000) {
    const chunks = [];
    let current = [];
    let currentLen = 0;

    for (const el of els) {
      const text = el.innerText.trim();
      if (currentLen + text.length > maxChars && current.length > 0) {
        chunks.push(current);
        current = [];
        currentLen = 0;
      }
      current.push(el);
      currentLen += text.length;
    }
    if (current.length > 0) chunks.push(current);
    return chunks;
  }

  // ── Indicator UI ──────────────────────────────────────────────────────

  function showIndicator(text, type = "loading", persistent = false) {
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.className = "ailens-translate-indicator";
      document.body.appendChild(indicator);
    }

    indicator.className = `ailens-translate-indicator ailens-translate-${type}`;

    if (type === "loading") {
      safeHTML(indicator, `<div class="ailens-spinner ailens-translate-spinner"></div><span>${escapeHtml(text)}</span>`);
    } else if (type === "done" && persistent) {
      // Persistent revert button
      safeHTML(indicator, `<span>${escapeHtml(text)}</span><button class="ailens-translate-revert-btn">Revert</button>`);
      indicator.querySelector(".ailens-translate-revert-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        revertTranslation();
      });
    } else {
      safeHTML(indicator, `<span>${escapeHtml(text)}</span>`);
    }

    indicator.classList.add("ailens-translate-visible");

    if (!persistent && (type === "done" || type === "error")) {
      setTimeout(() => {
        if (indicator) indicator.classList.remove("ailens-translate-visible");
      }, 2500);
    }
  }

  function hideIndicator() {
    if (indicator) indicator.classList.remove("ailens-translate-visible");
  }

  function showRateLimitIndicator(message) {
    let data;
    try {
      data = JSON.parse(message.slice(11));
    } catch {
      showIndicator("Daily limit reached", "error");
      return;
    }

    if (!indicator) {
      indicator = document.createElement("div");
      indicator.className = "ailens-translate-indicator";
      document.body.appendChild(indicator);
    }

    // H-2 FIX: Validate and properly encode URL for href attribute
    const url = data.upgradeUrl || "#";
    const safeUrl = url.startsWith("https://") || url === "#" ? url : "#";
    indicator.className = "ailens-translate-indicator ailens-translate-error ailens-translate-visible";
    safeHTML(indicator,
      `<span>Daily limit reached (${data.count}/${data.limit})</span>` +
      `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener" class="ailens-translate-upgrade-btn">Upgrade to Pro</a>`);
  }

  // ── Apply translation to an element's text nodes ──────────────────────

  function applyTranslation(el, translatedText) {
    // Walk only this element's text nodes and replace proportionally
    const textNodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent.trim();
      if (t.length > 0) textNodes.push(walker.currentNode);
    }

    if (textNodes.length === 0) return;

    if (textNodes.length === 1) {
      // Simple case — single text node, just replace preserving whitespace
      const node = textNodes[0];
      const lead = node.textContent.match(/^\s*/)[0];
      const trail = node.textContent.match(/\s*$/)[0];
      node.textContent = lead + translatedText + trail;
      return;
    }

    // Multiple text nodes — split translated text proportionally by original lengths
    const originalLengths = textNodes.map((n) => n.textContent.trim().length);
    const totalOriginal = originalLengths.reduce((a, b) => a + b, 0);
    const words = translatedText.split(/\s+/);
    const totalWords = words.length;

    let wordIdx = 0;
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const lead = node.textContent.match(/^\s*/)[0];
      const trail = node.textContent.match(/\s*$/)[0];
      const proportion = originalLengths[i] / totalOriginal;

      let count;
      if (i === textNodes.length - 1) {
        count = totalWords - wordIdx;
      } else {
        count = Math.max(1, Math.round(proportion * totalWords));
      }

      const slice = words.slice(wordIdx, wordIdx + count).join(" ");
      node.textContent = lead + slice + trail;
      wordIdx += count;
    }
  }

  // ── Translation Logic ─────────────────────────────────────────────────

  async function translatePage() {
    if (isTranslating) return;

    if (isTranslated) {
      revertTranslation();
      return;
    }

    // R-6 FIX: Set flag BEFORE first await to prevent double-trigger
    isTranslating = true;
    originalsKeys = []; // Clear keys array

    let settings;
    try {
      settings = await browser.runtime.sendMessage({ action: "getSettings" });
    } catch {
      showIndicator("Settings error", "error");
      isTranslating = false;
      return;
    }

    const targetLang =
      settings.translateLanguage === "auto"
        ? settings.responseLanguage
        : settings.translateLanguage || settings.responseLanguage || "English";

    if (!targetLang || targetLang === "auto") {
      showIndicator("Set a target language in settings", "error");
      isTranslating = false;
      return;
    }

    const els = collectElements();
    if (els.length === 0) {
      showIndicator("No text found", "error");
      isTranslating = false;
      return;
    }

    const chunks = chunkElements(els, 10000); // S-8 FIX: Larger chunks for better performance
    let completed = 0;
    let failed = 0;
    showIndicator(`Translating\u2026 0/${chunks.length}`, "loading");

    for (const chunk of chunks) {
      if (!isTranslating) break;

      const texts = chunk.map((el) => el.innerText.trim());
      const joined = texts.join("\n|||SPLIT|||\n");

      try {
        const translated = await browser.runtime.sendMessage({
          action: "translateText",
          data: { text: joined, targetLang },
        });

        if (!isTranslating) break;

        // R-2 FIX: Validate translation result before .split()
        if (!translated || typeof translated !== 'string') {
          failed++;
          continue;
        }

        const parts = translated.split(/\|\|\|SPLIT\|\|\|/);

        for (let i = 0; i < chunk.length; i++) {
          const el = chunk[i];
          const result = (parts[i] || "").trim();

          if (result && result !== texts[i]) {
            // Store original innerHTML for perfect restore
            originals.set(el, el.innerHTML);
            originalsKeys.push(el); // Track element for iteration
            applyTranslation(el, result);
          }
        }
        completed++;
      } catch (err) {
        console.error("Max translate error:", err);
        // R-13 FIX: Handle rate limit errors
        if (err?.message?.startsWith("RATE_LIMIT:")) {
          isTranslating = false;
          showRateLimitIndicator(err.message);
          return;
        }
        // R-13 FIX: Handle network errors gracefully
        if (isNetworkError(err)) {
          isTranslating = false;
          // Keep originals map so user can still revert partial translation
          if (originalsKeys.length > 0) {
            isTranslated = true;
            showIndicator(
              "Network lost — partial translation (click to revert)",
              "error",
              true
            );
          } else {
            showIndicator(getErrorMessage(err), "error");
          }
          return;
        }
        failed++;
      }

      showIndicator(
        `Translating\u2026 ${completed + failed}/${chunks.length}`,
        "loading",
      );
    }

    isTranslating = false;

    if (originalsKeys.length > 0) {
      isTranslated = true;
      showIndicator(
        `Translated to ${targetLang}`,
        "done",
        true, // persistent — shows revert button
      );
    } else if (failed > 0) {
      showIndicator(`Translation failed (${failed} errors)`, "error");
    } else {
      showIndicator("Nothing was translated", "error");
    }
  }

  function revertTranslation() {
    // R-9 FIX: Iterate using keys array
    for (const el of originalsKeys) {
      try {
        const html = originals.get(el);
        if (!html) continue; // Element was garbage collected
        // H-1 FIX: Sanitize HTML before restoring to prevent XSS from captured content
        if (typeof DOMPurify !== "undefined") {
          safeHTML(el, html);
        } else {
          // Fallback: use textContent if DOMPurify unavailable
          el.textContent = html.replace(/<[^>]*>/g, "");
        }
      } catch {
        // Element may be gone
      }
    }
    originalsKeys = [];
    isTranslated = false;
    hideIndicator();
    showIndicator("Reverted to original", "done");
  }

  // ── Message Listener ──────────────────────────────────────────────────

  browser.runtime.onMessage.addListener((msg) => {
    if (msg.action === "triggerTranslate") {
      translatePage();
    }
  });

  // ── Keyboard Shortcut ─────────────────────────────────────────────────

  let cachedShortcut = null;
  loadShortcut("translatePage", "Ctrl+Shift+T").then(
    (s) => (cachedShortcut = s),
  );

  document.addEventListener("keydown", (e) => {
    if (matchShortcut(e, cachedShortcut)) {
      e.preventDefault();
      translatePage();
    }
  });
})();
