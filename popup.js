document.addEventListener("DOMContentLoaded", async () => {
  const summarizeBtn = document.getElementById("summarize-btn");
  const searchBtn = document.getElementById("search-btn");
  const statusEl = document.getElementById("provider-status");
  const statusText = document.getElementById("status-text");
  const settingsLink = document.getElementById("settings-link");

  // Load provider status
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
      statusText.textContent = `${name} · ${model}`;
      statusEl.className = "provider-pill configured";
    } else {
      statusText.textContent = "No API key configured";
      statusEl.className = "provider-pill not-configured";
    }
  } catch {
    statusText.textContent = "Error loading settings";
  }

  // Summarize button
  summarizeBtn.addEventListener("click", async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, { action: "triggerSummary" });
      window.close();
    }
  });

  // Search button
  searchBtn.addEventListener("click", async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, { action: "triggerSearch" });
      window.close();
    }
  });

  // Translate button
  const translateBtn = document.getElementById("translate-btn");
  translateBtn.addEventListener("click", async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, { action: "triggerTranslate" });
      window.close();
    }
  });

  // Settings button
  settingsLink.addEventListener("click", (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
    window.close();
  });
});
