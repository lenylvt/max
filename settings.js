document.addEventListener("DOMContentLoaded", async () => {
  const providerEl = document.getElementById("provider");
  const baseurlField = document.getElementById("baseurl-field");
  const baseurlEl = document.getElementById("baseurl");
  const apikeyEl = document.getElementById("apikey");
  const toggleKeyBtn = document.getElementById("toggle-key");
  const modelEl = document.getElementById("model");
  const modelLoading = document.getElementById("model-loading");
  const refreshModelsBtn = document.getElementById("refresh-models");
  const temperatureEl = document.getElementById("temperature");
  const tempValueEl = document.getElementById("temp-value");
  const testBtn = document.getElementById("test-btn");
  const saveBtn = document.getElementById("save-btn");
  const statusMsg = document.getElementById("status-msg");
  const languageEl = document.getElementById("response-language");
  const shortcutSummaryEl = document.getElementById("shortcut-summary");
  const shortcutRecordSummaryBtn = document.getElementById(
    "shortcut-record-summary",
  );
  const shortcutSearchEl = document.getElementById("shortcut-search");
  const shortcutRecordBtn = document.getElementById("shortcut-record");
  const shortcutTranslateEl = document.getElementById("shortcut-translate");
  const shortcutRecordTranslateBtn = document.getElementById(
    "shortcut-record-translate",
  );
  const manageShortcutsLink = document.getElementById("manage-shortcuts-link");
  const translateLanguageEl = document.getElementById("translate-language");

  let providers = {};
  let currentSettings = {};
  let isRecording = false;
  let recordingTarget = null;

  // ── Load Providers & Settings ───────────────────────────────────────────

  try {
    providers = await browser.runtime.sendMessage({ action: "getProviders" });
    currentSettings = await browser.runtime.sendMessage({
      action: "getSettings",
    });

    providerEl.value = currentSettings.provider || "openai";
    apikeyEl.value = currentSettings.apiKey || "";
    baseurlEl.value = currentSettings.baseUrl || "";
    temperatureEl.value = currentSettings.temperature ?? 0.3;
    tempValueEl.textContent = temperatureEl.value;
    languageEl.value = currentSettings.responseLanguage || "auto";
    translateLanguageEl.value = currentSettings.translateLanguage || "auto";
    shortcutSummaryEl.value =
      currentSettings.shortcuts?.toggleSummary || "Ctrl+Shift+S";
    shortcutSearchEl.value =
      currentSettings.shortcuts?.searchInPage || "Ctrl+Shift+F";
    shortcutTranslateEl.value =
      currentSettings.shortcuts?.translatePage || "Ctrl+Shift+T";

    updateBaseUrlVisibility();

    // If we have an API key, fetch models from the API; otherwise use defaults
    if (currentSettings.apiKey) {
      await fetchAndPopulateModels(currentSettings.model);
    } else {
      populateDefaultModels(currentSettings.model);
    }
  } catch (err) {
    showStatus("Failed to load settings", "error");
  }

  // ── Provider Change ─────────────────────────────────────────────────────

  providerEl.addEventListener("change", async () => {
    const preset = providers[providerEl.value];
    if (preset && providerEl.value !== "custom") {
      baseurlEl.value = preset.baseUrl;
    } else {
      baseurlEl.value = "";
    }
    updateBaseUrlVisibility();

    // Try to fetch models if we have an API key
    if (apikeyEl.value.trim()) {
      await fetchAndPopulateModels();
    } else {
      populateDefaultModels();
    }
  });

  // ── API Key Change — auto-fetch models on blur ──────────────────────────

  apikeyEl.addEventListener("blur", async () => {
    if (apikeyEl.value.trim()) {
      await fetchAndPopulateModels();
    }
  });

  // ── Refresh Models Button ───────────────────────────────────────────────

  refreshModelsBtn.addEventListener("click", async () => {
    if (!apikeyEl.value.trim()) {
      showStatus("Enter an API key first to fetch models", "info");
      return;
    }
    await fetchAndPopulateModels();
  });

  // ── Model Fetching ──────────────────────────────────────────────────────

  async function fetchAndPopulateModels(selectedModel) {
    const preset = providers[providerEl.value];
    const settings = {
      provider: providerEl.value,
      apiKey: apikeyEl.value.trim(),
      baseUrl: baseurlEl.value.trim() || (preset ? preset.baseUrl : ""),
    };

    // Show loading
    modelLoading.style.display = "flex";
    refreshModelsBtn.classList.add("spinning");
    modelEl.style.opacity = "0.5";

    try {
      const result = await browser.runtime.sendMessage({
        action: "fetchModels",
        settings,
      });

      const models = result.models || [];
      modelEl.innerHTML = "";

      if (models.length > 0) {
        models.forEach((m) => {
          const opt = document.createElement("option");
          opt.value = m;
          opt.textContent = m;
          modelEl.appendChild(opt);
        });

        // Restore selection
        const toSelect =
          selectedModel ||
          currentSettings.model ||
          (preset ? preset.defaultModel : "");
        if (toSelect && models.includes(toSelect)) {
          modelEl.value = toSelect;
        }
      } else {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No models found";
        modelEl.appendChild(opt);
      }
    } catch {
      populateDefaultModels(selectedModel);
    } finally {
      modelLoading.style.display = "none";
      refreshModelsBtn.classList.remove("spinning");
      modelEl.style.opacity = "1";
    }
  }

  function populateDefaultModels(selectedModel) {
    const preset = providers[providerEl.value];
    modelEl.innerHTML = "";

    if (preset && preset.models && preset.models.length > 0) {
      preset.models.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        modelEl.appendChild(opt);
      });

      const toSelect =
        selectedModel || currentSettings.model || preset.defaultModel || "";
      if (toSelect && preset.models.includes(toSelect)) {
        modelEl.value = toSelect;
      }
    } else if (providerEl.value === "custom") {
      const opt = document.createElement("option");
      opt.value = selectedModel || currentSettings.model || "";
      opt.textContent =
        selectedModel || currentSettings.model || "custom-model";
      modelEl.appendChild(opt);
    } else {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Enter API key to load models";
      modelEl.appendChild(opt);
    }
  }

  function updateBaseUrlVisibility() {
    baseurlField.style.display = providerEl.value === "custom" ? "" : "none";
    if (providerEl.value !== "custom") {
      const preset = providers[providerEl.value];
      if (preset) baseurlEl.value = preset.baseUrl;
    }
  }

  // ── Temperature ─────────────────────────────────────────────────────────

  temperatureEl.addEventListener("input", () => {
    tempValueEl.textContent = temperatureEl.value;
  });

  // ── Toggle API Key Visibility ───────────────────────────────────────────

  toggleKeyBtn.addEventListener("click", () => {
    const isPassword = apikeyEl.type === "password";
    apikeyEl.type = isPassword ? "text" : "password";
    // Update icon
    const eyeIcon = document.getElementById("eye-icon");
    if (isPassword) {
      eyeIcon.innerHTML = `<path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" /><circle cx="8" cy="8" r="2" /><line x1="2" y1="14" x2="14" y2="2" />`;
    } else {
      eyeIcon.innerHTML = `<path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" /><circle cx="8" cy="8" r="2" />`;
    }
  });

  // ── Shortcut Recording ──────────────────────────────────────────────────

  shortcutRecordSummaryBtn.addEventListener("click", () => {
    if (isRecording && recordingTarget === shortcutSummaryEl) {
      stopRecording();
    } else {
      startRecording(shortcutSummaryEl);
    }
  });

  shortcutRecordBtn.addEventListener("click", () => {
    if (isRecording && recordingTarget === shortcutSearchEl) {
      stopRecording();
    } else {
      startRecording(shortcutSearchEl);
    }
  });

  shortcutRecordTranslateBtn.addEventListener("click", () => {
    if (isRecording && recordingTarget === shortcutTranslateEl) {
      stopRecording();
    } else {
      startRecording(shortcutTranslateEl);
    }
  });

  function startRecording(targetEl) {
    stopRecording();
    isRecording = true;
    recordingTarget = targetEl;
    targetEl.classList.add("recording");
    targetEl.value = "Press keys...";
    targetEl.focus();
  }

  function stopRecording() {
    isRecording = false;
    if (recordingTarget) {
      recordingTarget.classList.remove("recording");
      recordingTarget = null;
    }
  }

  function handleShortcutKeydown(e) {
    if (!isRecording || !recordingTarget) return;
    e.preventDefault();
    e.stopPropagation();

    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

    const parts = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");
    parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);

    recordingTarget.value = parts.join("+");
    stopRecording();
  }

  shortcutSummaryEl.addEventListener("keydown", handleShortcutKeydown);
  shortcutSearchEl.addEventListener("keydown", handleShortcutKeydown);
  shortcutTranslateEl.addEventListener("keydown", handleShortcutKeydown);

  // ── Manage Shortcuts Link ───────────────────────────────────────────────

  manageShortcutsLink.addEventListener("click", (e) => {
    e.preventDefault();
    // Open Firefox add-ons shortcuts page
    browser.tabs.create({ url: "about:addons" });
  });

  // ── Save ────────────────────────────────────────────────────────────────

  saveBtn.addEventListener("click", async () => {
    const settings = {
      provider: providerEl.value,
      apiKey: apikeyEl.value.trim(),
      model: modelEl.value,
      baseUrl: baseurlEl.value.trim(),
      temperature: parseFloat(temperatureEl.value),
      responseLanguage: languageEl.value,
      translateLanguage: translateLanguageEl.value,
      shortcuts: {
        toggleSummary: shortcutSummaryEl.value || "Ctrl+Shift+S",
        searchInPage: shortcutSearchEl.value || "Ctrl+Shift+F",
        translatePage: shortcutTranslateEl.value || "Ctrl+Shift+T",
      },
    };

    saveBtn.disabled = true;
    try {
      await browser.runtime.sendMessage({ action: "saveSettings", settings });
      currentSettings = settings;
      saveBtn.textContent = "Saved!";
      saveBtn.classList.add("btn-success");
      showStatus("Settings saved", "success");
      setTimeout(() => {
        saveBtn.textContent = "Save settings";
        saveBtn.classList.remove("btn-success");
        saveBtn.disabled = false;
      }, 1500);
    } catch (err) {
      showStatus("Failed to save: " + err.message, "error");
      saveBtn.disabled = false;
    }
  });

  // ── Test Connection ─────────────────────────────────────────────────────

  testBtn.addEventListener("click", async () => {
    const settings = {
      provider: providerEl.value,
      apiKey: apikeyEl.value.trim(),
      model: modelEl.value,
      baseUrl: baseurlEl.value.trim(),
      temperature: parseFloat(temperatureEl.value),
      responseLanguage: languageEl.value,
      translateLanguage: translateLanguageEl.value,
      shortcuts: {
        toggleSummary: shortcutSummaryEl.value || "Ctrl+Shift+S",
        searchInPage: shortcutSearchEl.value || "Ctrl+Shift+F",
        translatePage: shortcutTranslateEl.value || "Ctrl+Shift+T",
      },
    };

    if (!settings.apiKey) {
      showStatus("Enter an API key first", "error");
      return;
    }

    testBtn.disabled = true;
    const origHTML = testBtn.innerHTML;
    testBtn.innerHTML = `<svg class="spinning-inline" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1v5h5"/><path d="M15 15v-5h-5"/><path d="M2.5 6A6.5 6.5 0 0112.3 3.2L15 6M13.5 10A6.5 6.5 0 013.7 12.8L1 10"/></svg> Testing...`;
    showStatus("Connecting...", "info");

    try {
      await browser.runtime.sendMessage({ action: "saveSettings", settings });
      const result = await browser.runtime.sendMessage({
        action: "testConnection",
      });
      showStatus(`Connected — "${result.response}"`, "success");
    } catch (err) {
      showStatus(
        "Connection failed: " + (err.message || "Unknown error"),
        "error",
      );
    } finally {
      testBtn.disabled = false;
      testBtn.innerHTML = origHTML;
    }
  });

  // ── Helpers ─────────────────────────────────────────────────────────────

  function showStatus(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;

    // Auto-hide success/info after 3s
    if (type === "success" || type === "info") {
      setTimeout(() => {
        if (statusMsg.textContent === msg) {
          statusMsg.className = "status-msg hidden";
        }
      }, 3000);
    }
  }
});
