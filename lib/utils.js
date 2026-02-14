/**
 * AI Lens — Shared Utilities
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
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const el = node.parentElement;
          if (!el) return NodeFilter.FILTER_REJECT;
          for (const sel of NOISE_SELECTORS) {
            if (el.closest(sel)) return NodeFilter.FILTER_REJECT;
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
