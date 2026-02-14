(() => {
  "use strict";

  let isTranslating = false;
  let isTranslated = false;
  let originals = new Map();
  let indicator = null;

  // ── Target selectors — leaf block elements with readable text ──────────

  const TARGETS =
    "p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, dt, dd, summary, caption, label";

  const BLOCK_CHILDREN =
    "p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, dt, dd, summary, caption, ul, ol, table, div, section, article";

  const SKIP_CLOSEST = [
    ".ailens-overlay",
    ".ailens-search-bar",
    ".ailens-preview-card",
    ".ailens-translate-indicator",
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
      if (/^[\d\s.,;:!?%$€£#@*()\-+=/<>]+$/.test(text)) continue;

      els.push(el);
    }

    return els;
  }

  // ── Chunk elements into batches for fewer API calls ────────────────────

  function chunkElements(els, maxChars = 4000) {
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

  function showIndicator(text, type = "loading") {
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.className = "ailens-translate-indicator";
      document.body.appendChild(indicator);
    }

    indicator.className = `ailens-translate-indicator ailens-translate-${type}`;
    indicator.innerHTML =
      type === "loading"
        ? `<div class="ailens-translate-spinner"></div><span>${esc(text)}</span>`
        : `<span>${esc(text)}</span>`;

    indicator.classList.add("ailens-translate-visible");

    if (type === "done" || type === "error") {
      setTimeout(() => {
        if (indicator) indicator.classList.remove("ailens-translate-visible");
      }, 2500);
    }
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

    isTranslating = true;
    originals.clear();

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

    const chunks = chunkElements(els, 4000);
    showIndicator(`Translating… 0/${chunks.length}`, "loading");

    let completed = 0;

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

        const parts = translated.split(/\|\|\|SPLIT\|\|\|/);

        for (let i = 0; i < chunk.length; i++) {
          const el = chunk[i];
          const result = (parts[i] || "").trim();

          if (result && result !== texts[i]) {
            // Store original innerHTML for perfect restore
            originals.set(el, el.innerHTML);
            applyTranslation(el, result);
          }
        }
      } catch (err) {
        console.error("AI Lens translate error:", err);
      }

      completed++;
      showIndicator(`Translating… ${completed}/${chunks.length}`, "loading");
    }

    isTranslating = false;

    if (originals.size > 0) {
      isTranslated = true;
      showIndicator(
        `Translated to ${targetLang} — press again to revert`,
        "done",
      );
    } else {
      showIndicator("Nothing was translated", "error");
    }
  }

  function revertTranslation() {
    for (const [el, html] of originals) {
      try {
        el.innerHTML = html;
      } catch {
        // Element may be gone
      }
    }
    originals.clear();
    isTranslated = false;
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

  (async () => {
    try {
      const s = await browser.runtime.sendMessage({ action: "getSettings" });
      cachedShortcut = s.shortcuts?.translatePage || "Ctrl+Shift+T";
    } catch {
      cachedShortcut = "Ctrl+Shift+T";
    }
  })();

  document.addEventListener("keydown", (e) => {
    if (!cachedShortcut) return;

    const parts = cachedShortcut.split("+").map((p) => p.trim().toLowerCase());
    const needsCtrl = parts.includes("ctrl");
    const needsShift = parts.includes("shift");
    const needsAlt = parts.includes("alt");
    const key = parts.filter((p) => !["ctrl", "shift", "alt"].includes(p))[0];

    if (
      e.ctrlKey === needsCtrl &&
      e.shiftKey === needsShift &&
      e.altKey === needsAlt &&
      e.key.toLowerCase() === key
    ) {
      e.preventDefault();
      translatePage();
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────

  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }
})();
