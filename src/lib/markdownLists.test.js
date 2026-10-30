import assert from "node:assert/strict";
import test from "node:test";
import { toggleMarkdownList } from "./markdownLists.js";

test("list buttons toggle selected lines back to text", () => {
  for (const style of ["bullet", "numbered", "task"]) {
    const original = "first\nsecond";
    const added = toggleMarkdownList(original, 0, original.length, style);
    const removed = toggleMarkdownList(added.value, added.selectionStart, added.selectionEnd, style);
    assert.equal(removed.value, original);
  }
});

test("recognizes alternate markers, checked tasks, indentation and selection boundaries", () => {
  assert.equal(toggleMarkdownList("  * one\n  + two\nuntouched", 0, 16, "bullet").value, "  one\n  two\nuntouched");
  assert.equal(toggleMarkdownList("3) one\n4. two", 0, 13, "numbered").value, "one\ntwo");
  assert.equal(toggleMarkdownList("- [x] done\n* [ ] todo", 0, 21, "task").value, "done\ntodo");
});

test("converts mixed list styles without stacking markers", () => {
  const input = "- one\n2. two\n- [x] three\nfour";
  assert.equal(toggleMarkdownList(input, 0, input.length, "task").value,
    "- [ ] one\n- [ ] two\n- [ ] three\n- [ ] four");
  assert.equal(toggleMarkdownList("- [x] done", 0, 10, "bullet").value, "- done");
});
