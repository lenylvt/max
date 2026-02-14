(() => {
  "use strict";

  let searchBar = null;
  let isOpen = false;
  let highlights = [];
  let currentHighlight = -1;

  // ── Page Content Extraction ─────────────────────────────────────────────

  function extractPageContent() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const tag = node.parentElement?.tagName;
          if (
            tag === "SCRIPT" ||
            tag === "STYLE" ||
            tag === "NOSCRIPT" ||
            tag === "SVG"
          ) {
            return NodeFilter.FILTER_REJECT;
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

    return text.replace(/\s+/g, " ").trim().slice(0, 8000);
  }

  // ── Search Bar UI ──────────────────────────────────────────────────────

  function createSearchBar() {
    const bar = document.createElement("div");
    bar.className = "ailens-search-bar";
    bar.innerHTML = `
      <div class="ailens-search-inner">
        <div class="ailens-search-input-wrap">
          <svg class="ailens-search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="6.5" cy="6.5" r="4.5"/>
            <line x1="10" y1="10" x2="14" y2="14"/>
          </svg>
          <input type="text" class="ailens-search-input" placeholder="Search or ask AI..." spellcheck="false" />
          <span class="ailens-search-count"></span>
        </div>
        <div class="ailens-search-actions">
          <button class="ailens-search-nav ailens-search-prev" title="Previous (Shift+Enter)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4-4 4 4"/></svg>
          </button>
          <button class="ailens-search-nav ailens-search-next" title="Next (Enter)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>
          </button>
          <button class="ailens-search-ask" title="Ask AI about this page">Ask AI</button>
          <button class="ailens-search-close" title="Close (Esc)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
          </button>
        </div>
      </div>
      <div class="ailens-search-answer"></div>
    `;
    document.body.appendChild(bar);

    // Event listeners
    const input = bar.querySelector(".ailens-search-input");
    const askBtn = bar.querySelector(".ailens-search-ask");
    const closeBtn = bar.querySelector(".ailens-search-close");
    const prevBtn = bar.querySelector(".ailens-search-prev");
    const nextBtn = bar.querySelector(".ailens-search-next");

    input.addEventListener("input", () => {
      const val = input.value;
      if (!val.startsWith("?")) {
        performTextSearch(val);
        bar.querySelector(".ailens-search-answer").innerHTML = "";
        bar.querySelector(".ailens-search-answer").classList.remove("ailens-search-answer-visible");
      } else {
        clearHighlights();
        updateCount("");
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = input.value.trim();

        if (val.startsWith("?")) {
          // Explicit AI mode with ? prefix
          askAI(val.slice(1).trim());
        } else if (highlights.length === 0 && val.length > 0) {
          // No text search results → automatically ask AI
          askAI(val);
        } else if (e.shiftKey) {
          navigateHighlight(-1);
        } else {
          navigateHighlight(1);
        }
      }
      if (e.key === "Escape") {
        closeSearchBar();
      }
    });

    askBtn.addEventListener("click", () => {
      const val = input.value.trim();
      const question = val.startsWith("?") ? val.slice(1).trim() : val;
      if (question) askAI(question);
    });

    closeBtn.addEventListener("click", closeSearchBar);
    prevBtn.addEventListener("click", () => navigateHighlight(-1));
    nextBtn.addEventListener("click", () => navigateHighlight(1));

    return bar;
  }

  function openSearchBar() {
    if (isOpen) {
      searchBar?.querySelector(".ailens-search-input")?.focus();
      return;
    }

    if (!searchBar) searchBar = createSearchBar();

    searchBar.classList.add("ailens-search-visible");
    isOpen = true;

    requestAnimationFrame(() => {
      searchBar.querySelector(".ailens-search-input").focus();
    });
  }

  function closeSearchBar() {
    if (!searchBar) return;
    searchBar.classList.remove("ailens-search-visible");
    searchBar.querySelector(".ailens-search-answer").classList.remove("ailens-search-answer-visible");
    searchBar.querySelector(".ailens-search-answer").innerHTML = "";
    isOpen = false;
    clearHighlights();
    updateCount("");
  }

  // ── Text Search ────────────────────────────────────────────────────────

  function performTextSearch(query) {
    clearHighlights();

    if (!query || query.length < 2) {
      updateCount("");
      return;
    }

    const lowerQuery = query.toLowerCase();
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (node.parentElement?.closest(".ailens-search-bar")) {
            return NodeFilter.FILTER_REJECT;
          }
          const tag = node.parentElement?.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.textContent.toLowerCase().includes(lowerQuery)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        },
      },
    );

    const matches = [];
    while (walker.nextNode()) {
      const textNode = walker.currentNode;
      const text = textNode.textContent;
      const lowerText = text.toLowerCase();
      let startIdx = 0;

      while (true) {
        const idx = lowerText.indexOf(lowerQuery, startIdx);
        if (idx === -1) break;
        matches.push({ node: textNode, index: idx, length: query.length });
        startIdx = idx + 1;
      }
    }

    // Highlight matches (process in reverse to avoid offset issues)
    for (let i = matches.length - 1; i >= 0; i--) {
      const { node, index, length } = matches[i];
      try {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + length);

        const mark = document.createElement("mark");
        mark.className = "ailens-search-highlight";
        range.surroundContents(mark);
        highlights.push(mark);
      } catch {
        // Node may have been modified
      }
    }

    highlights.reverse();
    currentHighlight = -1;

    if (highlights.length > 0) {
      navigateHighlight(1);
      updateCount(`${1} / ${highlights.length}`);
    } else {
      updateCount("0 results");
    }
  }

  function navigateHighlight(direction) {
    if (highlights.length === 0) return;

    if (currentHighlight >= 0 && currentHighlight < highlights.length) {
      highlights[currentHighlight].classList.remove("ailens-search-highlight-active");
    }

    currentHighlight += direction;
    if (currentHighlight >= highlights.length) currentHighlight = 0;
    if (currentHighlight < 0) currentHighlight = highlights.length - 1;

    const mark = highlights[currentHighlight];
    mark.classList.add("ailens-search-highlight-active");
    mark.scrollIntoView({ behavior: "smooth", block: "center" });

    updateCount(`${currentHighlight + 1} / ${highlights.length}`);
  }

  function clearHighlights() {
    highlights.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    });
    highlights = [];
    currentHighlight = -1;
  }

  function updateCount(text) {
    if (!searchBar) return;
    searchBar.querySelector(".ailens-search-count").textContent = text;
  }

  // ── AI Ask ─────────────────────────────────────────────────────────────

  async function askAI(question) {
    if (!question) return;

    const answerEl = searchBar.querySelector(".ailens-search-answer");
    answerEl.classList.add("ailens-search-answer-visible");
    answerEl.innerHTML = `
      <div class="ailens-search-answer-loading">
        <div class="ailens-search-spinner"></div>
        <span>Thinking...</span>
      </div>
    `;

    try {
      const pageText = extractPageContent();
      const result = await browser.runtime.sendMessage({
        action: "askPageQuestion",
        data: {
          url: location.href,
          title: document.title,
          text: pageText,
          question,
        },
      });

      if (!isOpen) return;

      let html = result.answer || "No answer available.";
      // Render markdown as text-only (no tables, no images)
      if (typeof marked !== "undefined") {
        const renderer = new marked.Renderer();
        // Strip tables to plain text
        renderer.table = () => "";
        renderer.tablerow = () => "";
        renderer.tablecell = () => "";
        // Strip images
        renderer.image = () => "";
        html = marked.parse(html, { renderer });
        if (typeof DOMPurify !== "undefined") {
          html = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ["p", "strong", "em", "b", "i", "br", "ul", "ol", "li", "code", "pre", "a", "h1", "h2", "h3", "h4", "blockquote", "hr"],
            ALLOWED_ATTR: ["href", "target"],
          });
        }
      }

      answerEl.innerHTML = `<div class="ailens-search-answer-content">${html}</div>`;
    } catch (err) {
      answerEl.innerHTML = `<div class="ailens-search-answer-error">Could not get answer: ${escapeHtml(err.message || "Unknown error")}</div>`;
    }
  }

  // ── Message Listener ───────────────────────────────────────────────────

  browser.runtime.onMessage.addListener((msg) => {
    if (msg.action === "triggerSearch") {
      if (isOpen) {
        closeSearchBar();
      } else {
        openSearchBar();
      }
    }
  });

  // ── Keyboard Shortcut (manual, for customizable shortcut) ─────────────

  async function getSearchShortcut() {
    try {
      const settings = await browser.runtime.sendMessage({ action: "getSettings" });
      return settings.shortcuts?.searchInPage || "Ctrl+Shift+F";
    } catch {
      return "Ctrl+Shift+F";
    }
  }

  let cachedShortcut = null;
  getSearchShortcut().then((s) => (cachedShortcut = s));

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
      if (isOpen) {
        closeSearchBar();
      } else {
        openSearchBar();
      }
    }
  });

  // ── Helpers ────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
