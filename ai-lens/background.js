import { PROVIDERS, aiComplete, fetchModels, toUserError } from "./lib/ai-client.js";
import { CLOUD_API_URL, CLOUD_PRICING_URL } from "./config.js";

// ── Settings ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  provider: "openai",
  apiKey: "",
  model: "",
  baseUrl: "",
  temperature: 0.3,
  responseLanguage: "auto",
  translateLanguage: "auto",
  useCloud: true,
  cloudToken: "",
  cloudEmail: "",
  shortcuts: {
    searchInPage: "Ctrl+Shift+F",
    translatePage: "Ctrl+Shift+T",
  },
};

// CLOUD_API_URL imported from config.js

async function getSettings() {
  const { settings } = await browser.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...settings };
}

async function saveSettings(settings) {
  await browser.storage.local.set({ settings });
}

function sanitizeSettings(s) {
  if (!s || typeof s !== 'object') return DEFAULT_SETTINGS;
  return {
    provider: typeof s.provider === 'string' ? s.provider : 'openai',
    apiKey: typeof s.apiKey === 'string' ? s.apiKey.slice(0, 512) : '',
    model: typeof s.model === 'string' ? s.model.slice(0, 128) : '',
    baseUrl: typeof s.baseUrl === 'string' ? s.baseUrl.slice(0, 512) : '',
    temperature: typeof s.temperature === 'number' ? Math.min(1, Math.max(0, s.temperature)) : 0.3,
    responseLanguage: typeof s.responseLanguage === 'string' ? s.responseLanguage : 'auto',
    translateLanguage: typeof s.translateLanguage === 'string' ? s.translateLanguage : 'auto',
    useCloud: typeof s.useCloud === 'boolean' ? s.useCloud : true,
    cloudToken: typeof s.cloudToken === 'string' ? s.cloudToken.slice(0, 2048) : '',
    cloudEmail: typeof s.cloudEmail === 'string' ? s.cloudEmail.slice(0, 256) : '',
    shortcuts: s.shortcuts && typeof s.shortcuts === 'object' ? {
      toggleSummary: typeof s.shortcuts.toggleSummary === 'string' ? s.shortcuts.toggleSummary.slice(0, 50) : 'Ctrl+Shift+S',
      searchInPage: typeof s.shortcuts.searchInPage === 'string' ? s.shortcuts.searchInPage.slice(0, 50) : 'Ctrl+Shift+F',
      translatePage: typeof s.shortcuts.translatePage === 'string' ? s.shortcuts.translatePage.slice(0, 50) : 'Ctrl+Shift+T',
    } : DEFAULT_SETTINGS.shortcuts,
  };
}

// ── Cache with LRU Eviction ──────────────────────────────────────────────────

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const CACHE_MAX_SIZE = 10 * 1024 * 1024; // S-4 FIX: 10MB limit
const CACHE_INDEX_KEY = '__ailens_cache_index';

// S-4 FIX: Get cache index for LRU management
async function getCacheIndex() {
  const data = await browser.storage.local.get(CACHE_INDEX_KEY);
  return data[CACHE_INDEX_KEY] || { keys: [], size: 0 };
}

// S-4 FIX: Update cache index with new entry
async function updateCacheIndex(key, entrySize) {
  const index = await getCacheIndex();

  // Remove key if it exists (to move to end)
  index.keys = index.keys.filter(k => k !== key);

  // Add key to end (most recent)
  index.keys.push(key);
  index.size += entrySize;

  // Evict oldest entries if over limit
  while (index.size > CACHE_MAX_SIZE && index.keys.length > 0) {
    const oldestKey = index.keys.shift();
    const oldData = await browser.storage.local.get(oldestKey);
    if (oldData[oldestKey]) {
      const oldSize = JSON.stringify(oldData[oldestKey]).length;
      index.size -= oldSize;
    }
    await browser.storage.local.remove(oldestKey);
  }

  await browser.storage.local.set({ [CACHE_INDEX_KEY]: index });
}

async function cacheGet(key) {
  const data = await browser.storage.local.get(key);
  const entry = data[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    await browser.storage.local.remove(key);
    // Remove from index
    const index = await getCacheIndex();
    index.keys = index.keys.filter(k => k !== key);
    await browser.storage.local.set({ [CACHE_INDEX_KEY]: index });
    return null;
  }

  // S-4 FIX: Update access time for LRU
  entry.lastAccess = Date.now();
  await browser.storage.local.set({ [key]: entry });

  return entry.value;
}

async function cacheSet(key, value) {
  const entry = { value, ts: Date.now(), lastAccess: Date.now() };
  await browser.storage.local.set({ [key]: entry });

  // S-4 FIX: Update cache index with size tracking
  const entrySize = JSON.stringify(entry).length;
  await updateCacheIndex(key, entrySize);
}

// ── Request Deduplication ─────────────────────────────────────────────────────

const pendingRequests = new Map();

function dedup(key, fn) {
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  const promise = fn().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}

// ── Cloud AI Complete ─────────────────────────────────────────────────────

async function cloudComplete(settings, systemPrompt, userPrompt) {
  const token = settings.cloudToken;
  if (!token) throw new Error("Not signed in to Max Cloud");

  const payload = {
    systemPrompt,
    userPrompt,
    temperature: settings.temperature ?? 0.3,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const resp = await fetch(CLOUD_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (resp.status === 429) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(
        `RATE_LIMIT:${JSON.stringify({
          count: data.count ?? 0,
          limit: data.limit ?? 0,
          upgradeUrl: CLOUD_PRICING_URL,
        })}`,
      );
    }

    if (resp.status === 401) {
      const s = await getSettings();
      s.cloudToken = "";
      await saveSettings(s);
      throw new Error("Session expired. Please sign in again.");
    }

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      throw new Error(
        `Cloud API error ${resp.status}: ${errBody.slice(0, 200)}`,
      );
    }

    // Handle SSE streaming response
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      // R-1 FIX: Create reader inside try-finally to ensure it's always released
      let reader = null;
      try {
        reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }

        return fullText;
      } finally {
        if (reader) {
          try {
            reader.releaseLock();
          } catch {
            // Reader may already be released or in invalid state
          }
        }
      }
    }

    // Fallback: handle JSON response (non-streaming)
    const json = await resp.json();
    return json.text;
  } catch (err) {
    console.error("[Max Cloud] Fetch error:", err.message || err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Smart AI complete: routes to Cloud or direct BYOK based on settings.
 */
async function smartComplete(settings, systemPrompt, userPrompt) {
  if (settings.useCloud && settings.cloudToken) {
    return cloudComplete(settings, systemPrompt, userPrompt);
  }
  return aiComplete(settings, systemPrompt, userPrompt);
}

// ── Page Fetching ─────────────────────────────────────────────────────────────

async function fetchPageText(url, maxChars = 6000) {
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { throw new Error('Invalid URL'); }
  if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
    throw new Error(`Unsupported URL scheme: ${parsedUrl.protocol}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Max/1.0)" },
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

browser.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id !== browser.runtime.id) return false;
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
      return saveSettings(sanitizeSettings(msg.settings));
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
    const raw = await smartComplete(
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
    try { result.domain = new URL(url).hostname; } catch { result.domain = ''; }
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
      const raw = await smartComplete(
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

    let domain;
    try { domain = new URL(url).hostname; } catch { domain = ''; }
    const result = {
      ...parsed,
      ogImage: page.ogImage,
      url: page.url,
      domain,
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
  const answer = await smartComplete(
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
  const answer = await smartComplete(
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
  const result = await smartComplete(
    settings,
    TRANSLATE_SYSTEM,
    `Target language: ${targetLang}\n\nText to translate:\n${text}`,
  );

  return result;
}

async function handleTestConnection() {
  const settings = await getSettings();
  const response = await smartComplete(
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
