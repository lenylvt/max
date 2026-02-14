import { PROVIDERS, aiComplete, fetchModels } from "./lib/ai-client.js";

// ── Settings ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  provider: "openai",
  apiKey: "",
  model: "",
  baseUrl: "",
  temperature: 0.3,
  responseLanguage: "auto",
  translateLanguage: "auto",
  shortcuts: {
    searchInPage: "Ctrl+Shift+F",
    translatePage: "Ctrl+Shift+T",
  },
};

async function getSettings() {
  const { settings } = await browser.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...settings };
}

async function saveSettings(settings) {
  await browser.storage.local.set({ settings });
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function cacheGet(key) {
  const data = await browser.storage.local.get(key);
  const entry = data[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    await browser.storage.local.remove(key);
    return null;
  }
  return entry.value;
}

async function cacheSet(key, value) {
  await browser.storage.local.set({ [key]: { value, ts: Date.now() } });
}

// ── Request Deduplication ─────────────────────────────────────────────────────

const pendingRequests = new Map();

function dedup(key, fn) {
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  const promise = fn().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}

// ── Page Fetching ─────────────────────────────────────────────────────────────

async function fetchPageText(url, maxChars = 6000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AI-Lens/1.0)" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extract OG image
    const ogImage =
      doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
      "";

    // Extract title
    const title =
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      doc.querySelector("title")?.textContent ||
      "";

    // Remove noise elements
    for (const sel of [
      "script",
      "style",
      "nav",
      "header",
      "footer",
      "aside",
      "iframe",
      "noscript",
      "svg",
    ]) {
      doc.querySelectorAll(sel).forEach((el) => el.remove());
    }

    // Get text content
    const text = (doc.body?.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxChars);

    return { title, text, ogImage, url };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Language Helper ───────────────────────────────────────────────────────────

function getLanguageInstruction(settings) {
  const lang = settings.responseLanguage || "auto";
  if (lang === "auto") return "";
  return `\nIMPORTANT: Respond entirely in ${lang}.`;
}

// ── AI Prompts ────────────────────────────────────────────────────────────────

const PREVIEW_SYSTEM = `You are a concise summarizer. Given a web page's content, produce a JSON object with exactly two fields:
- "title": a short, descriptive title (max 12 words)
- "description": Only one full sentences describing what the page is about, covering the main points, key details, and context.
Output ONLY valid JSON, no markdown fences, no extra text.`;

const SUMMARY_SYSTEM = `You are an expert page analyzer. Given a web page's content, produce a JSON object with these fields:

- "title": short catchy title (max 8 words)
- "subtitle": the full page title or a descriptive tagline
- "summary": 2-4 sentence summary of the page
- "sections": an array of contextual info sections relevant to this page type. Pick ONLY sections that make sense for the content. Each section has:
  - "icon": one of: star, price, list, thumbsup, thumbsdown, info, clock, location, warning, check
  - "label": short header (1-3 words)
  - "content": string value (for single-value info like price, rating)
  - "items": array of strings (for lists like features, pros, cons) — use EITHER content OR items, not both

Examples of adaptive sections:
- Product page: Price, Rating, Key Features, Pros/Cons
- Blog/article: Key Points, Takeaways, Topics Covered
- Restaurant: Price Range, Location, Hours, Rating
- News: Key Facts, Timeline, Sources
- Documentation: Overview, Prerequisites, Key Concepts

Include 2-6 sections. Output ONLY valid JSON, no markdown fences, no extra text.`;

const QUESTION_SYSTEM = `You are an expert assistant that answers questions about web page content. Given the page content and a user question:
- Answer directly and concisely based on the page content
- Use markdown formatting for clarity
- If the answer cannot be found in the page content, say so clearly
- Keep answers focused and under 200 words unless a longer explanation is needed`;

const SELECTION_QUESTION_SYSTEM = `You are an expert assistant. The user has selected a specific piece of text and is asking a question about it.
- Answer directly about the selected text
- Use markdown formatting for clarity
- If the user asks for a translation, translate the text
- If the user asks what it means, explain it
- Keep answers focused and under 200 words unless a longer explanation is needed`;

function buildPreviewPrompt(page) {
  return `URL: ${page.url}\nTitle: ${page.title}\nContent: ${page.text}`;
}

function buildSummaryPrompt(page) {
  return `URL: ${page.url}\nTitle: ${page.title}\nContent: ${page.text}`;
}

const TRANSLATE_SYSTEM = `You are a professional translator. You will receive text segments separated by "|||SPLIT|||".
Translate EACH segment to the target language, keeping the same separator "|||SPLIT|||" between translated segments.
Rules:
- Preserve the EXACT number of segments — do NOT merge or split them
- Keep proper nouns, brand names, URLs, code, and numbers unchanged
- Maintain the original tone and style
- Output ONLY the translated segments separated by |||SPLIT|||, nothing else
- Do NOT add any explanation, numbering, or extra text`;

function buildQuestionPrompt(page, question) {
  return `Page URL: ${page.url}\nPage Title: ${page.title}\nPage Content: ${page.text}\n\nUser Question: ${question}`;
}

// ── Message Handler ───────────────────────────────────────────────────────────

browser.runtime.onMessage.addListener((msg, _sender) => {
  switch (msg.action) {
    case "fetchAndPreview":
      return handlePreview(msg.url);
    case "fetchAndSummarize":
      return handleSummarize(msg.data);
    case "askPageQuestion":
      return handleAskPageQuestion(msg.data);
    case "askSelectionQuestion":
      return handleAskSelectionQuestion(msg.data);
    case "translateText":
      return handleTranslate(msg.data);
    case "getSettings":
      return getSettings();
    case "saveSettings":
      return saveSettings(msg.settings);
    case "testConnection":
      return handleTestConnection();
    case "getProviders":
      return Promise.resolve(PROVIDERS);
    case "fetchModels":
      return handleFetchModels(msg.settings);
    default:
      return false;
  }
});

async function handleFetchModels(settings) {
  try {
    const models = await fetchModels(settings);
    return { success: true, models };
  } catch (err) {
    const preset = PROVIDERS[settings.provider] || PROVIDERS.custom;
    return { success: false, models: preset.models || [] };
  }
}

async function handlePreview(url) {
  return dedup(`preview::${url}`, async () => {
    const cacheKey = `preview::${url}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const page = await fetchPageText(url, 6000);
    const settings = await getSettings();
    const langInstruction = getLanguageInstruction(settings);
    const raw = await aiComplete(
      settings,
      PREVIEW_SYSTEM + langInstruction,
      buildPreviewPrompt(page),
    );

    let result;
    try {
      const cleaned = raw
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { title: page.title || url, description: raw.slice(0, 200) };
    }

    result.ogImage = page.ogImage;
    result.domain = new URL(url).hostname;
    await cacheSet(cacheKey, result);
    return result;
  });
}

async function handleSummarize(data) {
  const url = data?.url;
  if (!url) throw new Error("No URL provided");

  return dedup(`summary::${url}`, async () => {
    const cacheKey = `summary::${url}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    let page;
    if (data.text && data.title) {
      page = {
        url,
        title: data.title,
        text: data.text.slice(0, 8000),
        ogImage: data.ogImage || "",
      };
    } else {
      page = await fetchPageText(url, 8000);
    }

    const settings = await getSettings();
    const langInstruction = getLanguageInstruction(settings);
    let parsed;
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await aiComplete(
        settings,
        SUMMARY_SYSTEM + langInstruction,
        buildSummaryPrompt(page),
      );

      try {
        const cleaned = raw
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        parsed = JSON.parse(cleaned);
        break;
      } catch {
        if (attempt === 1) {
          parsed = {
            title: page.title || "",
            subtitle: "",
            summary: raw.slice(0, 500),
            sections: [],
          };
        }
      }
    }

    const result = {
      ...parsed,
      ogImage: page.ogImage,
      url: page.url,
      domain: new URL(url).hostname,
    };

    await cacheSet(cacheKey, result);
    return result;
  });
}

async function handleAskPageQuestion(data) {
  const { url, title, text, question } = data;
  if (!question) throw new Error("No question provided");

  const page = {
    url: url || "",
    title: title || "",
    text: (text || "").slice(0, 8000),
  };
  const settings = await getSettings();
  const langInstruction = getLanguageInstruction(settings);
  const answer = await aiComplete(
    settings,
    QUESTION_SYSTEM + langInstruction,
    buildQuestionPrompt(page, question),
  );

  return { answer };
}

async function handleAskSelectionQuestion(data) {
  const { text, question } = data;
  if (!question) throw new Error("No question provided");

  const settings = await getSettings();
  const langInstruction = getLanguageInstruction(settings);
  const answer = await aiComplete(
    settings,
    SELECTION_QUESTION_SYSTEM + langInstruction,
    `Selected text: ${(text || "").slice(0, 8000)}\n\nUser Question: ${question}`,
  );

  return { answer };
}

async function handleTranslate(data) {
  const { text, targetLang, separator } = data;
  if (!text || !targetLang) throw new Error("Missing translate parameters");

  const settings = await getSettings();
  const result = await aiComplete(
    settings,
    TRANSLATE_SYSTEM,
    `Target language: ${targetLang}\n\nText to translate:\n${text}`,
  );

  return result;
}

async function handleTestConnection() {
  const settings = await getSettings();
  const response = await aiComplete(
    settings,
    "You are a helpful assistant.",
    'Say "OK" and nothing else.',
  );
  return { success: true, response: response.trim() };
}

// ── Keyboard Shortcut ─────────────────────────────────────────────────────────

browser.commands.onCommand.addListener(async (command) => {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id) return;

  if (command === "toggle-search") {
    browser.tabs.sendMessage(tab.id, { action: "triggerSearch" });
  } else if (command === "toggle-translate") {
    browser.tabs.sendMessage(tab.id, { action: "triggerTranslate" });
  }
});
