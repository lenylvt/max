(() => {
  "use strict";

  const { escapeHtml, renderInlineMarkdown, rateLimitHtml, safeHTML } = window.__ailens;

  let panel = null;
  let isOpen = false;
  let selectedText = "";
  let selectionRange = null;
  let selectionMarks = [];

  // ── Highlight selection with custom marks ──

  function highlightSelection() {
    if (selectionMarks.length > 0) return;

    const selection = window.getSelection();
    const range =
      selection?.rangeCount > 0 ? selection.getRangeAt(0) : selectionRange;
    if (!range || range.collapsed) return;

    const treeWalker = document.createTreeWalker(
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (node.parentElement?.closest(".ailens-ask-panel")) {
            return NodeFilter.FILTER_REJECT;
          }
          const nodeRange = document.createRange();
          nodeRange.selectNodeContents(node);
          if (
            range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0 &&
            range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0
          ) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        },
      },
    );

    const textNodes = [];
    while (treeWalker.nextNode()) {
      textNodes.push(treeWalker.currentNode);
    }

    for (const textNode of textNodes) {
      try {
        const highlightRange = document.createRange();

        if (
          textNode === range.startContainer &&
          textNode === range.endContainer
        ) {
          highlightRange.setStart(textNode, range.startOffset);
          highlightRange.setEnd(textNode, range.endOffset);
        } else if (textNode === range.startContainer) {
          highlightRange.setStart(textNode, range.startOffset);
          highlightRange.setEnd(textNode, textNode.textContent.length);
        } else if (textNode === range.endContainer) {
          highlightRange.setStart(textNode, 0);
          highlightRange.setEnd(textNode, range.endOffset);
        } else {
          highlightRange.selectNodeContents(textNode);
        }

        if (highlightRange.toString().length === 0) continue;

        const mark = document.createElement("mark");
        mark.className = "ailens-ask-selection-highlight";
        highlightRange.surroundContents(mark);
        selectionMarks.push(mark);
      } catch {
        // Node may have been split or modified
      }
    }

    if (selection) selection.removeAllRanges();
  }

  function clearSelectionHighlight() {
    for (const mark of selectionMarks) {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    }
    selectionMarks = [];
  }

  // ── Panel UI (input + answer) ─────────────────────────────────────────

  function createPanel() {
    const el = document.createElement("div");
    el.className = "ailens-ask-panel";
    safeHTML(el, `
      <div class="ailens-ask-panel-input-wrap">
        <input type="text" class="ailens-ask-panel-input" placeholder="Ask about selection..." spellcheck="false" />
        <button class="ailens-ask-panel-submit" title="Ask">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 8h12M10 4l4 4-4 4"/>
          </svg>
        </button>
      </div>
      <div class="ailens-ask-panel-answer"></div>
    `);
    document.body.appendChild(el);

    const input = el.querySelector(".ailens-ask-panel-input");
    const submitBtn = el.querySelector(".ailens-ask-panel-submit");

    input.addEventListener("focus", highlightSelection);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitQuestion();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
      }
    });

    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      submitQuestion();
    });

    el.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    return el;
  }

  function openPanel() {
    if (!panel) panel = createPanel();

    const answerEl = panel.querySelector(".ailens-ask-panel-answer");
    const input = panel.querySelector(".ailens-ask-panel-input");

    answerEl.textContent = "";
    answerEl.classList.remove("ailens-ask-panel-answer-visible");
    input.value = "";

    positionPanel();

    requestAnimationFrame(() => {
      panel.classList.add("ailens-ask-panel-visible");
    });

    isOpen = true;
  }

  function positionPanel() {
    if (!panel || !selectionRange) return;

    const rect = selectionRange.getBoundingClientRect();
    const { scrollX, scrollY, innerWidth, innerHeight } = window;
    const panelWidth = 380;
    const panelHeight = 60;

    let left = rect.left + scrollX + rect.width / 2 - panelWidth / 2;
    let top = rect.bottom + scrollY + 10;

    // Clamp horizontal position
    left = Math.max(scrollX + 16, Math.min(left, innerWidth + scrollX - panelWidth - 16));

    // Position above if not enough space below
    if (rect.bottom + panelHeight + 10 > innerHeight) {
      top = Math.max(scrollY + 16, rect.top + scrollY - panelHeight - 10);
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function closePanel() {
    if (!panel) return;
    panel.classList.remove("ailens-ask-panel-visible");
    clearSelectionHighlight();
    isOpen = false;
  }

  // ── Ask AI ────────────────────────────────────────────────────────────

  async function submitQuestion() {
    if (!panel) return;
    const input = panel.querySelector(".ailens-ask-panel-input");
    const question = input.value.trim();
    if (!question) return;

    const answerEl = panel.querySelector(".ailens-ask-panel-answer");
    answerEl.classList.add("ailens-ask-panel-answer-visible");
    safeHTML(answerEl, `
      <div class="ailens-loading">
        <div class="ailens-spinner"></div>
        <span>Thinking...</span>
      </div>
    `);

    try {
      const result = await browser.runtime.sendMessage({
        action: "askSelectionQuestion",
        data: {
          text: selectedText.slice(0, 8000),
          question,
        },
      });

      if (!isOpen) return;

      const html = renderInlineMarkdown(result.answer || "No answer available.");
      safeHTML(answerEl, `<div class="ailens-content ailens-ask-answer-content">${html}</div>`);
    } catch (err) {
      const rl = rateLimitHtml(err?.message, "ailens-ask");
      // R-13 FIX: Show network-specific error message
      safeHTML(answerEl,
        rl ||
        `<div class="ailens-error">${escapeHtml(window.__ailens.getErrorMessage(err))}</div>`);
    }
  }

  // ── Selection Detection ───────────────────────────────────────────────

  const UI_SELECTOR =
    ".ailens-ask-panel, .ailens-search-bar, .ailens-overlay, .ailens-preview-card";

  function handleSelectionChange() {
    setTimeout(() => {
      if (isOpen) return;

      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (!text || text.length < 3) {
        selectedText = "";
        selectionRange = null;
        return;
      }

      // Don't trigger on our own UI
      const anchor = selection.anchorNode?.parentElement;
      const focus = selection.focusNode?.parentElement;
      if (anchor?.closest(UI_SELECTOR) || focus?.closest(UI_SELECTOR)) {
        return;
      }

      selectedText = text;
      try {
        selectionRange = selection.getRangeAt(0).cloneRange();
      } catch {
        return;
      }

      const rect = selectionRange.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      openPanel();
    }, 10);
  }

  document.addEventListener("mouseup", (e) => {
    if (e.target.closest(".ailens-ask-panel") || e.button === 2) return;
    handleSelectionChange();
  });

  document.addEventListener("mousedown", (e) => {
    if (e.target.closest(".ailens-ask-panel")) return;
    if (isOpen) closePanel();
  });
})();
