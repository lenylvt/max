(() => {
  "use strict";

  const { escapeHtml, matchShortcut, loadShortcut, extractPageContent, renderInlineMarkdown } =
    window.__ailens;

  let searchBar = null;
  let isOpen = false;
  let highlights = [];
  let currentHighlight = -1;

  // ── SVG icons ──────────────────────────────────────────────────────────

  const ICON_SEARCH = `<circle cx="6.5" cy="6.5" r="4.5"/><line x1="10" y1="10" x2="14" y2="14"/>`;
  const ICON_AI = `<path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5z"/>`;

  // ── Search Bar UI ──────────────────────────────────────────────────────

  function createSearchBar() {
    const bar = document.createElement("div");
    bar.className = "ailens-search-bar";
    bar.innerHTML = `
      <div class="ailens-search-inner">
        <div class="ailens-search-input-wrap">
          <svg class="ailens-search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            ${ICON_SEARCH}
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
        setAIMode(true);
        updateCount("");
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = input.value.trim();

        if (val.startsWith("?")) {
          askAI(val.slice(1).trim());
        } else if (highlights.length === 0 && val.length > 0) {
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

  // ── Toggle search / AI visual mode ─────────────────────────────────────

  function setAIMode(on) {
    if (!searchBar) return;
    const icon = searchBar.querySelector(".ailens-search-icon");
    const prev = searchBar.querySelector(".ailens-search-prev");
    const next = searchBar.querySelector(".ailens-search-next");

    if (on) {
      icon.innerHTML = ICON_AI;
      prev.style.display = "none";
      next.style.display = "none";
    } else {
      icon.innerHTML = ICON_SEARCH;
      prev.style.display = "";
      next.style.display = "";
    }
  }

  function openSearchBar() {
    if (isOpen) {
      searchBar?.querySelector(".ailens-search-input")?.focus();
      return;
    }

    if (!searchBar) searchBar = createSearchBar();

    searchBar.classList.add("ailens-search-visible");
    isOpen = true;
    setAIMode(false);

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
    setAIMode(false);
    updateCount("");
  }

  // ── Text Search ────────────────────────────────────────────────────────

  function performTextSearch(query) {
    clearHighlights();

    if (!query || query.length < 2) {
      setAIMode(false);
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
      setAIMode(false);
      navigateHighlight(1);
      updateCount(`${1} / ${highlights.length}`);
    } else {
      // No results — switch to AI mode visually (icon + hide arrows), no text
      setAIMode(true);
      updateCount("");
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
      const page = extractPageContent();
      const result = await browser.runtime.sendMessage({
        action: "askPageQuestion",
        data: {
          url: location.href,
          title: document.title,
          text: page.text,
          question,
        },
      });

      if (!isOpen) return;

      let html = result.answer || "No answer available.";
      html = renderInlineMarkdown(html);

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

  let cachedShortcut = null;
  loadShortcut("searchInPage", "Ctrl+Shift+F").then(
    (s) => (cachedShortcut = s),
  );

  document.addEventListener("keydown", (e) => {
    if (matchShortcut(e, cachedShortcut)) {
      e.preventDefault();
      if (isOpen) {
        closeSearchBar();
      } else {
        openSearchBar();
      }
    }
  });
})();
