(() => {
  "use strict";

  let isTranslating = false;
  let isTranslated = false;
  let originalTexts = new Map();
  let indicator = null;

  // ── Text Node Extraction ──────────────────────────────────────────────

  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "SVG", "MATH", "CODE", "PRE",
    "TEXTAREA", "INPUT", "SELECT", "OPTION", "IFRAME", "CANVAS",
    "VIDEO", "AUDIO", "IMG", "BR", "HR",
  ]);

  const SKIP_SELECTORS = [
    ".ailens-overlay", ".ailens-search-bar", ".ailens-preview-card",
    ".ailens-translate-indicator",
  ];

  function shouldSkip(node) {
    const el = node.parentElement;
    if (!el) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    for (const sel of SKIP_SELECTORS) {
      if (el.closest(sel)) return true;
    }
    return false;
  }

  function collectTextNodes() {
    const nodes = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
          const text = node.textContent.trim();
          if (text.length < 2) return NodeFilter.FILTER_REJECT;
          if (/^\d+$/.test(text)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    return nodes;
  }

  // ── Chunk text nodes for batch translation ────────────────────────────

  function chunkNodes(nodes, maxChars = 3000) {
    const chunks = [];
    let current = [];
    let currentLen = 0;

    for (const node of nodes) {
      const text = node.textContent.trim();
      if (currentLen + text.length > maxChars && current.length > 0) {
        chunks.push(current);
        current = [];
        currentLen = 0;
      }
      current.push(node);
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
    indicator.innerHTML = type === "loading"
      ? `<div class="ailens-translate-spinner"></div><span>${escapeHtml(text)}</span>`
      : `<span>${escapeHtml(text)}</span>`;

    indicator.classList.add("ailens-translate-visible");

    if (type === "done" || type === "error") {
      setTimeout(() => {
        if (indicator) indicator.classList.remove("ailens-translate-visible");
      }, 2500);
    }
  }

  function hideIndicator() {
    if (indicator) indicator.classList.remove("ailens-translate-visible");
  }

  // ── Translation Logic ─────────────────────────────────────────────────

  async function translatePage() {
    if (isTranslating) return;

    if (isTranslated) {
      revertTranslation();
      return;
    }

    isTranslating = true;
    originalTexts.clear();

    let settings;
    try {
      settings = await browser.runtime.sendMessage({ action: "getSettings" });
    } catch {
      showIndicator("Settings error", "error");
      isTranslating = false;
      return;
    }

    const targetLang = settings.translateLanguage || settings.responseLanguage || "English";
    if (targetLang === "auto") {
      showIndicator("Set a target language in settings", "error");
      isTranslating = false;
      return;
    }

    const nodes = collectTextNodes();
    if (nodes.length === 0) {
      showIndicator("No text to translate", "error");
      isTranslating = false;
      return;
    }

    const chunks = chunkNodes(nodes, 2500);
    const total = chunks.length;
    showIndicator(`Translating… 0/${total}`, "loading");

    let completed = 0;

    for (const chunk of chunks) {
      if (!isTranslating) break;

      const texts = chunk.map((n) => n.textContent.trim());
      const separator = "\n|||SPLIT|||\n";
      const joined = texts.join(separator);

      try {
        const translated = await browser.runtime.sendMessage({
          action: "translateText",
          data: { text: joined, targetLang, separator },
        });

        if (!isTranslating) break;

        const parts = translated.split(/\|\|\|SPLIT\|\|\|/);

        for (let i = 0; i < chunk.length; i++) {
          const node = chunk[i];
          const original = node.textContent;
          const translatedText = (parts[i] || "").trim();

          if (translatedText && translatedText !== original.trim()) {
            originalTexts.set(node, original);
            // Preserve leading/trailing whitespace from original
            const leadSpace = original.match(/^\s*/)[0];
            const trailSpace = original.match(/\s*$/)[0];
            node.textContent = leadSpace + translatedText + trailSpace;
          }
        }
      } catch (err) {
        console.error("AI Lens translate chunk error:", err);
      }

      completed++;
      showIndicator(`Translating… ${completed}/${total}`, "loading");
    }

    isTranslating = false;

    if (originalTexts.size > 0) {
      isTranslated = true;
      showIndicator(`Translated to ${targetLang} — press again to revert`, "done");
    } else {
      showIndicator("Nothing was translated", "error");
    }
  }

  function revertTranslation() {
    for (const [node, original] of originalTexts) {
      try {
        node.textContent = original;
      } catch {
        // Node may no longer be in DOM
      }
    }
    originalTexts.clear();
    isTranslated = false;
    showIndicator("Reverted to original", "done");
  }

  // ── Message Listener ──────────────────────────────────────────────────

  browser.runtime.onMessage.addListener((msg) => {
    if (msg.action === "triggerTranslate") {
      translatePage();
    }
  });

  // ── Keyboard Shortcut (custom, from settings) ─────────────────────────

  let cachedShortcut = null;

  async function getTranslateShortcut() {
    try {
      const settings = await browser.runtime.sendMessage({ action: "getSettings" });
      return settings.shortcuts?.translatePage || "Ctrl+Shift+T";
    } catch {
      return "Ctrl+Shift+T";
    }
  }

  getTranslateShortcut().then((s) => (cachedShortcut = s));

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

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
