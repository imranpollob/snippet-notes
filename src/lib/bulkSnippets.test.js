import assert from "node:assert/strict";
import test from "node:test";
import { applyBulkChanges, buildBulkChanges, commitBulkChanges } from "./bulkSnippets.js";
import { getLocalSnippets, setLocalSnippets } from "./storage.js";

const snippets = [
  { id: "a", title: "First", data: "Keep this", labels: ["Research"], pinned: true },
  { id: "b", title: "Second", data: "And this", labels: ["work", "Ready"] },
  { id: "c", title: "Third", labels: [] },
];

test("attaches labels only to selected snippets and preserves existing content and labels", () => {
  const changes = buildBulkChanges(snippets, new Set(["a", "b"]), { type: "label", label: "#ready" }, 123);
  assert.deepEqual(changes, [{ id: "a", updates: { labels: ["Research", "ready"], updatedAt: 123 } }]);
  const updated = applyBulkChanges(snippets, changes);
  assert.deepEqual(updated[0], { ...snippets[0], labels: ["Research", "ready"], updatedAt: 123 });
  assert.equal(updated[1], snippets[1]);
  assert.equal(updated[2], snippets[2]);
  assert.deepEqual(snippets[0].labels, ["Research"]);
});

test("deletes exactly the selection, including filtered-out IDs, and ignores missing IDs", () => {
  const changes = buildBulkChanges(snippets, new Set(["a", "c", "missing"]), { type: "delete" });
  assert.deepEqual(applyBulkChanges(snippets, changes), [snippets[1]]);
});

test("handles empty selections, missing labels, and repeated label application", () => {
  assert.deepEqual(buildBulkChanges(snippets, new Set(), { type: "delete" }), []);
  assert.throws(() => buildBulkChanges(snippets, new Set(["a"]), { type: "label", label: " ## " }), /label name/);
  const initial = buildBulkChanges(snippets, new Set(["c"]), { type: "label", label: "new" });
  const updated = applyBulkChanges(snippets, initial);
  assert.deepEqual(buildBulkChanges(updated, new Set(["c"]), { type: "label", label: "NEW" }), []);
});

test("handles legacy snippets without labels", () => {
  const changes = buildBulkChanges([{ id: "legacy" }], new Set(["legacy"]), { type: "label", label: "new" }, 456);
  assert.deepEqual(changes, [{ id: "legacy", updates: { labels: ["new"], updatedAt: 456 } }]);
});

test("cloud writes stay within 500 operations and become visible only after persistence", async () => {
  const changes = Array.from({ length: 1001 }, (_, index) => ({ id: `${index}`, updates: null }));
  const events = [];
  await commitBulkChanges(changes, {
    saveChunk: async (chunk) => { events.push(`save:${chunk.length}`); },
    onCommitted: (chunk) => { events.push(`commit:${chunk.length}`); },
  });
  assert.deepEqual(events, ["save:500", "commit:500", "save:500", "commit:500", "save:1", "commit:1"]);
});

test("partial cloud failures preserve committed progress and leave failed snippets retryable", async () => {
  const changes = buildBulkChanges(snippets, new Set(["a", "b", "c"]), { type: "delete" });
  let library = snippets;
  let writes = 0;
  await assert.rejects(commitBulkChanges(changes, {
    chunkSize: 2,
    saveChunk: async () => { if (++writes === 2) throw new Error("Offline"); },
    onCommitted: (chunk) => { library = applyBulkChanges(library, chunk); },
  }), /Offline/);
  assert.deepEqual(library, [snippets[2]]);
  const retry = buildBulkChanges(library, new Set(["a", "b", "c"]), { type: "delete" });
  assert.deepEqual(retry, [{ id: "c", updates: null }]);
});

test("failed storage writes cannot trigger optimistic changes", async () => {
  let committed = false;
  await assert.rejects(commitBulkChanges([{ id: "a", updates: null }], {
    saveChunk: async () => { throw new Error("Quota exceeded"); },
    onCommitted: () => { committed = true; },
  }), /Quota exceeded/);
  assert.equal(committed, false);
});

test("local bulk deletion persists only the intended removal in one write", async () => {
  const originalWindow = globalThis.window;
  let serialized = JSON.stringify(snippets);
  let writes = 0;
  try {
    globalThis.window = { localStorage: {
      getItem() { return serialized; },
      setItem(key, value) { serialized = value; writes++; },
    } };
    let visible = snippets;
    const changes = buildBulkChanges(visible, new Set(["a", "c"]), { type: "delete" });
    await commitBulkChanges(changes, {
      chunkSize: changes.length,
      saveChunk: async (chunk) => setLocalSnippets(applyBulkChanges(getLocalSnippets(), chunk), { throwOnError: true }),
      onCommitted: (chunk) => { visible = applyBulkChanges(visible, chunk); },
    });
    assert.equal(writes, 1);
    assert.deepEqual(visible, [snippets[1]]);
    assert.deepEqual(getLocalSnippets(), [snippets[1]]);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("bulk local writes surface storage errors while existing callers retain their behavior", () => {
  const originalWindow = globalThis.window;
  const originalError = console.error;
  try {
    globalThis.window = { localStorage: { setItem() { throw new Error("Quota exceeded"); } } };
    console.error = () => {};
    assert.throws(() => setLocalSnippets([], { throwOnError: true }), /Quota exceeded/);
    assert.doesNotThrow(() => setLocalSnippets([]));
  } finally {
    console.error = originalError;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
