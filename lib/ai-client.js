/**
 * AI Lens - Unified AI Client
 * Supports OpenAI-compatible (OpenAI, xAI, Groq, Custom), Anthropic, and Gemini APIs.
 */

const PROVIDERS = {
  openai: {
    name: "OpenAI",
    format: "openai",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini"],
    defaultModel: "gpt-4o-mini",
  },
  anthropic: {
    name: "Anthropic",
    format: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    models: ["claude-sonnet-4-20250514", "claude-haiku-4-20250414"],
    defaultModel: "claude-sonnet-4-20250514",
  },
  gemini: {
    name: "Gemini",
    format: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-2.5-flash", "gemini-2.0-flash"],
    defaultModel: "gemini-2.5-flash",
  },
  xai: {
    name: "xAI",
    format: "openai",
    baseUrl: "https://api.x.ai/v1",
    models: ["grok-3", "grok-3-mini"],
    defaultModel: "grok-3-mini",
  },
  groq: {
    name: "Groq",
    format: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    defaultModel: "llama-3.3-70b-versatile",
  },
  custom: {
    name: "Custom (OpenAI-compatible)",
    format: "openai",
    baseUrl: "",
    models: [],
    defaultModel: "",
  },
};

/**
 * Fetch available models from a provider's API endpoint.
 * Falls back to hardcoded models if the request fails.
 * @param {object} settings - { provider, apiKey, baseUrl }
 * @returns {Promise<string[]>} List of model IDs
 */
async function fetchModels(settings) {
  const preset = PROVIDERS[settings.provider] || PROVIDERS.custom;
  const format = preset.format;
  const baseUrl = (settings.baseUrl || preset.baseUrl).replace(/\/+$/, "");
  const apiKey = settings.apiKey;

  if (!apiKey) {
    return preset.models || [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    let url, headers;

    if (format === "openai") {
      // OpenAI-compatible: GET /v1/models
      url = `${baseUrl}/models`;
      headers = {
        Authorization: `Bearer ${apiKey}`,
      };
    } else if (format === "anthropic") {
      // Anthropic: GET /v1/models
      url = `${baseUrl}/models`;
      headers = {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      };
    } else if (format === "gemini") {
      // Gemini: GET /v1beta/models?key=API_KEY
      url = `${baseUrl}/models?key=${apiKey}`;
      headers = {};
    } else {
      return preset.models || [];
    }

    const resp = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (!resp.ok) {
      // Fallback to hardcoded
      return preset.models || [];
    }

    const json = await resp.json();
    let models = [];

    if (format === "openai") {
      // OpenAI-compatible response: { data: [{ id: "model-name" }, ...] }
      if (json.data && Array.isArray(json.data)) {
        models = json.data
          .map((m) => m.id)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
      }
    } else if (format === "anthropic") {
      // Anthropic response: { data: [{ id: "model-name" }, ...] }
      if (json.data && Array.isArray(json.data)) {
        models = json.data
          .map((m) => m.id)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
      }
    } else if (format === "gemini") {
      // Gemini response: { models: [{ name: "models/gemini-xxx" }, ...] }
      if (json.models && Array.isArray(json.models)) {
        models = json.models
          .map((m) => {
            // name is like "models/gemini-2.0-flash" -> extract "gemini-2.0-flash"
            const name = m.name || "";
            return name.startsWith("models/") ? name.slice(7) : name;
          })
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
      }
    }

    // If we got models from the API, return them; otherwise fallback
    return models.length > 0 ? models : preset.models || [];
  } catch {
    // Network error, timeout, etc. — fallback to hardcoded
    return preset.models || [];
  } finally {
    clearTimeout(timeout);
  }
}

function formatOpenAI(systemPrompt, userPrompt, model, temperature) {
  return {
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
    }),
    extractText(json) {
      return json.choices?.[0]?.message?.content ?? "";
    },
  };
}

function formatAnthropic(systemPrompt, userPrompt, model, temperature) {
  return {
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature,
    }),
    extractText(json) {
      const block = json.content?.find((b) => b.type === "text");
      return block?.text ?? "";
    },
  };
}

function formatGemini(systemPrompt, userPrompt, _model, temperature) {
  return {
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { temperature },
    }),
    extractText(json) {
      return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    },
  };
}

const FORMATTERS = {
  openai: formatOpenAI,
  anthropic: formatAnthropic,
  gemini: formatGemini,
};

/**
 * Build the fetch URL and headers for a given provider config.
 */
function buildRequest(config, formatted) {
  const { format, baseUrl, apiKey, model } = config;
  let url, headers;

  if (format === "openai") {
    url = `${baseUrl}/chat/completions`;
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
  } else if (format === "anthropic") {
    url = `${baseUrl}/messages`;
    headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    };
  } else if (format === "gemini") {
    url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    headers = { "Content-Type": "application/json" };
  }

  return { url, headers, body: formatted.body };
}

/**
 * Send a completion request to the configured AI provider.
 * @param {object} settings - { provider, apiKey, model, baseUrl, temperature }
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>} The AI response text.
 */
async function aiComplete(settings, systemPrompt, userPrompt) {
  const preset = PROVIDERS[settings.provider] || PROVIDERS.custom;
  const format = preset.format;
  const baseUrl = (settings.baseUrl || preset.baseUrl).replace(/\/+$/, "");
  const model = settings.model || preset.defaultModel;
  const temperature = settings.temperature ?? 0.3;
  const apiKey = settings.apiKey;

  if (!apiKey) throw new Error("API key not configured");

  const formatter = FORMATTERS[format];
  if (!formatter) throw new Error(`Unknown format: ${format}`);

  const formatted = formatter(systemPrompt, userPrompt, model, temperature);
  const config = { format, baseUrl, apiKey, model };
  const { url, headers, body } = buildRequest(config, formatted);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      throw new Error(`API error ${resp.status}: ${errBody.slice(0, 200)}`);
    }

    const json = await resp.json();
    return formatted.extractText(json);
  } finally {
    clearTimeout(timeout);
  }
}

// Export for use in background script (ES module)
export { PROVIDERS, aiComplete, fetchModels };
