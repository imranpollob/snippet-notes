import { normalizeLabels } from "./storage.js";

// Plan only actual changes; adding a label never replaces existing labels.
export const buildBulkChanges = (snippets, selectedIds, action, now = Date.now()) => {
  if (!["label", "delete"].includes(action.type)) throw new Error("Unknown bulk action.");
  const label = String(action.label || "").trim().replace(/^#+/, "").trim();
  if (action.type === "label" && !label) throw new Error("Enter a label name.");
  return snippets.flatMap((snippet) => {
    if (!selectedIds.has(snippet.id)) return [];
    if (action.type === "delete") return [{ id: snippet.id, updates: null }];
    const labels = normalizeLabels(snippet.labels);
    if (labels.some((existing) => existing.toLowerCase() === label.toLowerCase())) return [];
    return [{ id: snippet.id, updates: { labels: [...labels, label], updatedAt: now } }];
  });
};

export const applyBulkChanges = (snippets, changes) => {
  const byId = new Map(changes.map((change) => [change.id, change.updates]));
  return snippets.flatMap((snippet) => {
    if (!byId.has(snippet.id)) return [snippet];
    const updates = byId.get(snippet.id);
    return updates === null ? [] : [{ ...snippet, ...updates }];
  });
};

// Reflect each successful chunk immediately, including if a later cloud batch fails.
export const commitBulkChanges = async (changes, { saveChunk, onCommitted, chunkSize = 500 }) => {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new Error("Invalid batch size.");
  for (let index = 0; index < changes.length; index += chunkSize) {
    const chunk = changes.slice(index, index + chunkSize);
    await saveChunk(chunk);
    onCommitted(chunk);
  }
};
