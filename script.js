const form = document.getElementById("leadForm");
const statusDiv = document.getElementById("status");
const payloadPreview = document.getElementById("payloadPreview");

const locationInput = document.getElementById("locationInput");
const keywordInput = document.getElementById("keywordInput");
const keywordTagsEl = document.getElementById("keywordTags");
const locationSuggestionsEl = document.getElementById("locationSuggestions");
const keywordSuggestionsEl = document.getElementById("keywordSuggestions");

const addKeywordBtn = document.getElementById("addKeywordBtn");
const saveDefaultsBtn = document.getElementById("saveDefaultsBtn");
const submitBtn = document.getElementById("submitBtn");

const STORAGE_KEY = "leadGeneratorDefaults.v1";
const WEBHOOK_URL = "https://n8n.srv1300653.hstgr.cloud/webhook/elei-lead";

const locationSuggestions = [
  "Ontario, Canada",
  "Toronto, Canada",
  "Texas, USA",
  "California, USA",
  "New York, USA",
  "Florida, USA",
  "London, UK",
  "Sydney, Australia"
];

const keywordSuggestions = [
  "HVAC contractor",
  "Plumber",
  "Electrician",
  "Heating contractor",
  "Air conditioning contractor",
  "Furnace repair service",
  "Roofing contractor",
  "Cleaning service"
];

const state = {
  location: "",
  keywords: []
};

function normalizeValue(value) {
  return String(value || "").trim();
}

function addKeyword(value) {
  const normalized = normalizeValue(value);
  if (!normalized) return;

  const alreadyExists = state.keywords.some(
    (item) => item.toLowerCase() === normalized.toLowerCase()
  );
  if (alreadyExists) return;

  state.keywords.push(normalized);
  renderTags();
  renderPayloadPreview();
}

function removeKeyword(index) {
  state.keywords.splice(index, 1);
  renderTags();
  renderPayloadPreview();
}

function createTag(text, onRemove) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = text;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "tag-remove";
  removeBtn.textContent = "×";
  removeBtn.title = "Remove";
  removeBtn.addEventListener("click", onRemove);

  tag.appendChild(removeBtn);
  return tag;
}

function renderTags() {
  keywordTagsEl.innerHTML = "";

  state.keywords.forEach((keyword, index) => {
    keywordTagsEl.appendChild(
      createTag(keyword, () => removeKeyword(index))
    );
  });
}

function createSuggestionChip(label, onClick) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "suggestion-chip";
  chip.textContent = label;
  chip.addEventListener("click", onClick);
  return chip;
}

function renderSuggestions() {
  locationSuggestionsEl.innerHTML = "";
  keywordSuggestionsEl.innerHTML = "";

  locationSuggestions.forEach((location) => {
    locationSuggestionsEl.appendChild(
      createSuggestionChip(location, () => {
        locationInput.value = location;
        state.location = location;
        renderPayloadPreview();
      })
    );
  });

  keywordSuggestions.forEach((keyword) => {
    keywordSuggestionsEl.appendChild(
      createSuggestionChip(keyword, () => addKeyword(keyword))
    );
  });
}

function getFormValues() {
  const maxLeadsValue = Number(document.getElementById("maxLeads").value || 5);
  const maxCrawledValue = Number(
    document.getElementById("maxCrawledPlacesPerSearch").value || 1
  );

  return {
    webhookUrl: WEBHOOK_URL,
    maxLeads: Number.isFinite(maxLeadsValue) ? maxLeadsValue : 5,
    language: document.getElementById("language").value,
    apifyToken: normalizeValue(document.getElementById("apifyToken").value),
    apifyActor: normalizeValue(document.getElementById("apifyActor").value),
    maxCrawledPlacesPerSearch: Number.isFinite(maxCrawledValue) ? maxCrawledValue : 1
  };
}

function buildPayload() {
  const values = getFormValues();
  return {
    locationQuery: state.location,
    searchStringsArray: state.keywords,
    maxLeads: values.maxLeads,
    workflowConfig: {
      apify: {
        actor: values.apifyActor || "compass~google-maps-extractor",
        token: values.apifyToken,
        language: values.language,
        maxCrawledPlacesPerSearch: values.maxCrawledPlacesPerSearch
      }
    },
    metadata: {
      source: "lead-generator-ui",
      requestedAt: new Date().toISOString()
    }
  };
}

function renderPayloadPreview() {
  payloadPreview.textContent = JSON.stringify(buildPayload(), null, 2);
}

function updateStatus(text, isError = false) {
  statusDiv.textContent = text;
  statusDiv.classList.toggle("error", isError);
  statusDiv.classList.toggle("success", !isError && text.includes("Success"));
}

function saveDefaults() {
  const values = getFormValues();
  const serializable = {
    ...values,
    location: state.location,
    keywords: state.keywords
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  updateStatus("Success: defaults saved locally.");
}

function loadDefaults() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.location = "Ontario, Canada";
    locationInput.value = state.location;
    state.keywords = ["HVAC contractor"];
    return;
  }

  try {
    const saved = JSON.parse(raw);
    const setValue = (id, value) => {
      if (value === undefined || value === null) return;
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === "checkbox") {
        el.checked = Boolean(value);
      } else {
        el.value = String(value);
      }
    };

    setValue("maxLeads", saved.maxLeads);
    setValue("language", saved.language);
    setValue("apifyToken", saved.apifyToken);
    setValue("apifyActor", saved.apifyActor);
    setValue("maxCrawledPlacesPerSearch", saved.maxCrawledPlacesPerSearch);

    const migratedLocation = Array.isArray(saved.locations)
      ? saved.locations.find(Boolean)
      : saved.location;
    state.location = normalizeValue(migratedLocation || "Ontario, Canada");
    locationInput.value = state.location;
    state.keywords = Array.isArray(saved.keywords)
      ? saved.keywords.filter(Boolean)
      : ["HVAC contractor"];
  } catch (_error) {
    state.location = "Ontario, Canada";
    locationInput.value = state.location;
    state.keywords = ["HVAC contractor"];
  }
}

function addKeywordFromInput(inputEl) {
  const value = normalizeValue(inputEl.value);
  if (!value) return;
  addKeyword(value);
  inputEl.value = "";
  inputEl.focus();
}

addKeywordBtn.addEventListener("click", () => addKeywordFromInput(keywordInput));

keywordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addKeywordFromInput(keywordInput);
  }
});

locationInput.addEventListener("input", () => {
  state.location = normalizeValue(locationInput.value);
  renderPayloadPreview();
});

saveDefaultsBtn.addEventListener("click", saveDefaults);

form.addEventListener("input", renderPayloadPreview);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = buildPayload();

  if (!payload.locationQuery || !payload.searchStringsArray.length) {
    updateStatus("Please provide one location and at least one category.", true);
    return;
  }

  const webhookUrl = getFormValues().webhookUrl;
  if (!webhookUrl) {
    updateStatus("Webhook URL is not configured.", true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";
  updateStatus("Sending request to n8n...");

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let responseData = {};

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (_error) {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      throw new Error(responseData.message || responseData.error || "Webhook request failed");
    }

    const message = responseData.message || "Success: lead generation started.";
    updateStatus(message);
  } catch (error) {
    updateStatus(`Error: ${error.message}`, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Start Lead Generation";
  }
});

loadDefaults();
renderSuggestions();
renderTags();
renderPayloadPreview();
