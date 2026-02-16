/**
 * Max — Shared Utilities
 * Loaded once before all content scripts (shared content-script world).
 */

if (!window.__ailens) {
  window.__ailens = {};

  // ── HTML / Attribute escaping ──────────────────────────────────────────

  window.__ailens.escapeHtml = function (str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };

  window.__ailens.escapeAttr = function (str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  // ── Keyboard shortcut matching ─────────────────────────────────────────

  window.__ailens.matchShortcut = function (e, shortcutStr) {
    if (!shortcutStr) return false;
    const parts = shortcutStr
      .split("+")
      .map((p) => p.trim().toLowerCase());
    const needsCtrl = parts.includes("ctrl");
    const needsShift = parts.includes("shift");
    const needsAlt = parts.includes("alt");
    const key = parts.filter(
      (p) => !["ctrl", "shift", "alt"].includes(p),
    )[0];
    return (
      e.ctrlKey === needsCtrl &&
      e.shiftKey === needsShift &&
      e.altKey === needsAlt &&
      e.key.toLowerCase() === key
    );
  };

  // ── Cached settings shortcut loader ────────────────────────────────────

  window.__ailens.loadShortcut = async function (key, fallback) {
    try {
      const s = await browser.runtime.sendMessage({
        action: "getSettings",
      });
      return s.shortcuts?.[key] || fallback;
    } catch {
      return fallback;
    }
  };

  // ── Safe Markdown rendering (with optional table/image stripping) ──────

  window.__ailens.renderMarkdownSafe = function (md, opts = {}) {
    if (typeof marked === "undefined") {
      return window.__ailens.escapeHtml(md);
    }

    const renderer = new marked.Renderer();
    if (opts.stripTables) {
      renderer.table = () => "";
      renderer.tablerow = () => "";
      renderer.tablecell = () => "";
    }
    if (opts.stripImages) {
      renderer.image = () => "";
    }

    let html = marked.parse(md, { renderer });

    if (typeof DOMPurify !== "undefined") {
      html = DOMPurify.sanitize(
        html,
        opts.purifyConfig || { ADD_ATTR: ["target"] },
      );
    }
    return html;
  };

  // ── Compact markdown renderer for inline panels (search, ask) ──────────

  const INLINE_PURIFY_CONFIG = {
    ALLOWED_TAGS: [
      "p",
      "strong",
      "em",
      "b",
      "i",
      "br",
      "ul",
      "ol",
      "li",
      "code",
      "pre",
      "a",
      "h1",
      "h2",
      "h3",
      "h4",
      "blockquote",
      "hr",
    ],
    ALLOWED_ATTR: ["href", "target"],
  };

  window.__ailens.renderInlineMarkdown = function (md) {
    return window.__ailens.renderMarkdownSafe(md, {
      stripTables: true,
      stripImages: true,
      purifyConfig: INLINE_PURIFY_CONFIG,
    });
  };

  // ── Network/Offline Detection ──────────────────────────────────────────

  /**
   * R-13 FIX: Detect if an error is due to network/offline issues
   * @param {Error} err - The error object
   * @returns {boolean} True if this is a network error
   */
  window.__ailens.isNetworkError = function (err) {
    if (!err) return false;

    // Check for common network error patterns
    const msg = (err.message || "").toLowerCase();
    return (
      // Browser offline
      !navigator.onLine ||
      // Failed fetch
      err.name === "NetworkError" ||
      err.name === "TypeError" && msg.includes("fetch") ||
      // Abort/timeout
      err.name === "AbortError" ||
      msg.includes("network") ||
      msg.includes("offline") ||
      msg.includes("failed to fetch") ||
      msg.includes("networkerror")
    );
  };

  /**
   * R-13 FIX: Generate user-friendly error message for network errors
   * @param {Error} err - The error object
   * @returns {string} User-friendly error message
   */
  window.__ailens.getErrorMessage = function (err) {
    if (window.__ailens.isNetworkError(err)) {
      return "Network connection lost. Check your internet and try again.";
    }
    return err?.message || "An error occurred.";
  };

  // ── Rate-limit UI helper ───────────────────────────────────────────────

  /**
   * Parses a RATE_LIMIT: error message and returns rich HTML.
   * Returns null if the message is not a rate-limit error.
   * @param {string} message  - err.message from a caught error
   * @param {string} cssPrefix - e.g. "ailens-hover", "ailens-summary"
   */
  window.__ailens.rateLimitHtml = function (message, cssPrefix) {
    if (!message || !message.startsWith("RATE_LIMIT:")) return null;

    let data;
    try {
      data = JSON.parse(message.slice(11));
    } catch {
      return null;
    }

    const upgradeUrl = data.upgradeUrl || "#";

    return `
      <div class="ailens-ratelimit ${cssPrefix}-ratelimit">
        <p class="ailens-ratelimit-title">Daily limit reached</p>
        <p class="ailens-ratelimit-hint">Resets at midnight UTC</p>
        <a href="${window.__ailens.escapeAttr(upgradeUrl)}" target="_blank" rel="noopener" class="ailens-ratelimit-btn">
          Upgrade to Pro — $1/mo
        </a>
      </div>
    `;
  };

  // ── Page content extraction (shared between summary + search) ──────────

  const NOISE_SELECTORS = [
    "script",
    "style",
    "nav",
    "header",
    "footer",
    "aside",
    "iframe",
    "noscript",
    "svg",
    ".ad",
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    ".sidebar",
    ".menu",
    ".nav",
    ".cookie",
    ".popup",
    ".modal",
  ];

  window.__ailens.extractPageContent = function (maxChars = 8000) {
    // S-11 FIX: Pre-compute noise elements to avoid O(n×m×d) closest() calls
    const noiseElements = new Set();
    for (const sel of NOISE_SELECTORS) {
      document.querySelectorAll(sel).forEach(el => noiseElements.add(el));
    }

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const el = node.parentElement;
          if (!el) return NodeFilter.FILTER_REJECT;

          // S-11 FIX: Check if element or any ancestor is in noise set
          let current = el;
          while (current && current !== document.body) {
            if (noiseElements.has(current)) return NodeFilter.FILTER_REJECT;
            current = current.parentElement;
          }

          if (node.textContent.trim().length === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    let text = "";
    while (walker.nextNode()) {
      text += walker.currentNode.textContent + " ";
    }

    text = text.replace(/\s+/g, " ").trim().slice(0, maxChars);

    const title =
      document
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content") ||
      document.title ||
      "";

    const ogImage =
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content") || "";

    const images = [];
    if (ogImage) images.push(ogImage);
    document
      .querySelectorAll("article img, main img, .post img, .content img")
      .forEach((img) => {
        if (img.src && img.naturalWidth > 200 && images.length < 3) {
          images.push(img.src);
        }
      });

    return { title, text, ogImage, images, url: location.href };
  };
}
