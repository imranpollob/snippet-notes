import assert from "node:assert/strict";
import test from "node:test";
import { continueListOnEnter } from "./listContinuation.js";

function enter(value) {
  let result = value;
  let caret;
  let prevented = false;
  const target = {
    value,
    selectionStart: value.length,
    selectionEnd: value.length,
    setSelectionRange(start) { caret = start; },
  };
  continueListOnEnter({ key: "Enter", target, preventDefault() { prevented = true; } }, (next) => { result = next; });
  return { result, caret, prevented };
}

test("continues unchecked and completed tasks with an unchecked checkbox", () => {
  const previous = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => callback();
  try {
    for (const value of ["- [ ] first", "- [x] first", "  2. [X] first"]) {
      const { result, caret, prevented } = enter(value);
      const prefix = value.startsWith("  ") ? "\n  3. [ ] " : "\n- [ ] ";
      assert.equal(result, value + prefix);
      assert.equal(caret, result.length);
      assert.equal(prevented, true);
    }
    assert.equal(enter("- [ ] ").result, "");
    assert.equal(enter("- regular item").result, "- regular item\n- ");
    assert.equal(enter("```\n- [ ] code").prevented, false);
  } finally {
    globalThis.requestAnimationFrame = previous;
  }
});
