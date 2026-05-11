const STORAGE_KEY = "legacy-rebuild-knowledgetransfer-v1";

const DEFAULT_PACKETS = [
  {
    id: crypto.randomUUID(),
    title: "Q1 architecture handoff",
    owner: "KnowledgeOps",
    topic: "architecture",
    status: "Shared",
    tags: ["handoff", "design", "ownership"],
    summary: "High-level architecture notes, design decisions, and migration caveats captured for support transfer.",
    updatedAt: "2026-05-11T16:20:00.000Z",
  },
  {
    id: crypto.randomUUID(),
    title: "Release readiness checklist",
    owner: "Infra Team",
    topic: "ops",
    status: "Draft",
    tags: ["release", "risk", "runbook"],
    summary: "Checklist for dependency lock drift, rollback plan, and post-deploy smoke checks.",
    updatedAt: "2026-05-10T11:00:00.000Z",
  },
  {
    id: crypto.randomUUID(),
    title: "Security handoff notes",
    owner: "Trust",
    topic: "infra",
    status: "Needs review",
    tags: ["security", "privacy", "audit"],
    summary: "Contains permission boundaries, sensitive data handling notes, and escalation routes.",
    updatedAt: "2026-05-09T16:15:00.000Z",
  },
];

const cards = document.getElementById("pack-grid");
const queryInput = document.getElementById("query");
const topicFilter = document.getElementById("topic");
const sortSelect = document.getElementById("sort");

const form = document.getElementById("pack-form");
const editingId = document.getElementById("editing-id");
const titleInput = document.getElementById("title");
const ownerInput = document.getElementById("owner");
const topicInput = document.getElementById("topic-input");
const statusInput = document.getElementById("status");
const tagsInput = document.getElementById("tags");
const summaryInput = document.getElementById("summary");
const statusLine = document.getElementById("status-line");

const exportButton = document.getElementById("export-json");
const importButton = document.getElementById("import-json");
const resetButton = document.getElementById("seed-reset");
const copyButton = document.getElementById("copy-summary");
const clearButton = document.getElementById("clear-form");
const importFile = document.getElementById("import-file");

function normalizeTagList(value) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function loadPackets() {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (!cached) {
    return [...DEFAULT_PACKETS];
  }

  try {
    const parsed = JSON.parse(cached);
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid payload");
    }
    return parsed;
  } catch {
    return [...DEFAULT_PACKETS];
  }
}

function savePackets(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function createStatusClass(status) {
  const normalized = status.toLowerCase();
  if (normalized.includes("review")) return "review";
  if (normalized.includes("draft")) return "draft";
  return "ok";
}

function cardMarkup(packet) {
  const updated = new Date(packet.updatedAt).toLocaleString();
  const tagHtml = packet.tags.map((tag) => `<span class="tag">#${tag}</span>`).join(" ");

  return `
    <article class="packet-card" data-id="${packet.id}">
      <h3>${packet.title}</h3>
      <p class="meta">
        <span>${packet.owner}</span>
        <span>${packet.topic}</span>
        <span>${updated}</span>
      </p>
      <p>${packet.summary}</p>
      <p class="tags">${tagHtml}</p>
      <div class="card-actions">
        <span class="status-pill ${createStatusClass(packet.status)}">${packet.status}</span>
        <button data-action="edit">Edit</button>
        <button data-action="delete" data-danger>Delete</button>
      </div>
    </article>
  `;
}

function renderPackets() {
  const query = queryInput.value.trim().toLowerCase();
  const topic = topicFilter.value;
  const sortMode = sortSelect.value;
  const items = getPackets()
    .filter((packet) => {
      const haystack = `${packet.title} ${packet.owner} ${packet.summary} ${packet.tags.join(" ")} ${packet.topic}`.toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (topic !== "all" && packet.topic !== topic) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortMode === "title") return a.title.localeCompare(b.title);
      if (sortMode === "owner") return a.owner.localeCompare(b.owner);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  cards.innerHTML = items.map(cardMarkup).join("") || `<p>No packets match your filters.</p>`;
}

function getPackets() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

function setPackets(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function writeStatus(message, isError = false) {
  statusLine.textContent = message;
  statusLine.style.color = isError ? "var(--danger)" : "var(--accent-2)";
}

function setForm(packet) {
  editingId.value = packet?.id || "";
  titleInput.value = packet?.title || "";
  ownerInput.value = packet?.owner || "";
  topicInput.value = packet?.topic || "ops";
  statusInput.value = packet?.status || "Draft";
  tagsInput.value = packet?.tags?.join(", ") || "";
  summaryInput.value = packet?.summary || "";
}

function resetForm() {
  setForm(null);
  statusLine.textContent = "";
}

function upsertPacket(evt) {
  evt.preventDefault();
  const next = getPackets();

  const packet = {
    id: editingId.value || crypto.randomUUID(),
    title: titleInput.value.trim(),
    owner: ownerInput.value.trim(),
    topic: topicInput.value,
    status: statusInput.value,
    tags: normalizeTagList(tagsInput.value),
    summary: summaryInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (!packet.title || !packet.owner || !packet.summary) {
    writeStatus("Title, owner, and summary are required.", true);
    return;
  }

  const nextIdx = next.findIndex((entry) => entry.id === packet.id);
  if (nextIdx >= 0) {
    next[nextIdx] = packet;
  } else {
    next.push(packet);
  }

  setPackets(next);
  renderPackets();
  resetForm();
  writeStatus("Packet saved. You can continue editing or export this set.");
}

function wireCardActions(evt) {
  const btn = evt.target.closest("button");
  if (!btn) return;
  const card = evt.target.closest("[data-id]");
  if (!card) return;

  const packetId = card.dataset.id;
  const items = getPackets();
  const itemIndex = items.findIndex((entry) => entry.id === packetId);
  if (itemIndex < 0) return;

  if (btn.dataset.action === "edit") {
    setForm(items[itemIndex]);
    writeStatus("Editing selected packet.");
    return;
  }

  items.splice(itemIndex, 1);
  setPackets(items);
  renderPackets();
  writeStatus("Packet removed.");
}

function exportPackets() {
  const data = getPackets();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "knowledgetransfer-packets.json";
  link.click();
  URL.revokeObjectURL(url);
  writeStatus("Export ready.");
}

function applyImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) throw new Error("Not an array.");
      setPackets(parsed);
      renderPackets();
      writeStatus("Import complete.");
    } catch {
      writeStatus("Invalid JSON format for import.", true);
    }
  };
  reader.readAsText(file);
}

function copyActiveSummary() {
  const items = getPackets();
  if (!items.length) {
    writeStatus("No packets to summarize.", true);
    return;
  }
  const text = items
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((entry) => `• ${entry.title} (${entry.owner}, ${entry.status})`)
    .join("\n");
  navigator.clipboard.writeText(text).then(
    () => writeStatus("Summary copied to clipboard."),
    () => writeStatus("Clipboard blocked by browser policy.", true),
  );
}

function seedDefaults() {
  setPackets([...DEFAULT_PACKETS]);
  renderPackets();
  resetForm();
  writeStatus("Reset to seeded packets.");
}

function load() {
  const initial = loadPackets();
  savePackets(initial);
  renderPackets();
}

queryInput.addEventListener("input", renderPackets);
topicFilter.addEventListener("change", renderPackets);
sortSelect.addEventListener("change", renderPackets);
cards.addEventListener("click", wireCardActions);

form.addEventListener("submit", upsertPacket);
copyButton.addEventListener("click", copyActiveSummary);
clearButton.addEventListener("click", resetForm);
exportButton.addEventListener("click", exportPackets);
resetButton.addEventListener("click", seedDefaults);
importButton.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  applyImport(file);
  importFile.value = "";
});

load();
