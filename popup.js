document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("provider-status");
  const statusText = document.getElementById("status-text");

  // ── Helper: send action to active tab ─────────────────────────────────

  async function sendToActiveTab(action) {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, { action });
      window.close();
    }
  }

  // ── Load provider status ──────────────────────────────────────────────

  try {
    const settings = await browser.runtime.sendMessage({
      action: "getSettings",
    });
    const providers = await browser.runtime.sendMessage({
      action: "getProviders",
    });

    if (settings.apiKey) {
      const provider = providers[settings.provider];
      const name = provider?.name || settings.provider;
      const model = settings.model || provider?.defaultModel || "";
      statusText.textContent = `${name} \u00b7 ${model}`;
      statusEl.className = "provider-pill configured";
    } else {
      statusText.textContent = "No API key configured";
      statusEl.className = "provider-pill not-configured";
    }
  } catch {
    statusText.textContent = "Error loading settings";
  }

  // ── Button actions ────────────────────────────────────────────────────

  document.getElementById("summarize-btn").addEventListener("click", () => {
    sendToActiveTab("triggerSummary");
  });

  document.getElementById("search-btn").addEventListener("click", () => {
    sendToActiveTab("triggerSearch");
  });

  document.getElementById("translate-btn").addEventListener("click", () => {
    sendToActiveTab("triggerTranslate");
  });

  document.getElementById("settings-link").addEventListener("click", (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
    window.close();
  });
});
