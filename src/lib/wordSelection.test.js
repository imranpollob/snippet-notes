import assert from "node:assert/strict";
import test from "node:test";
import { trimDoubleClickSelection } from "./wordSelection.js";

test("trims trailing spaces from a double-clicked word only", () => {
  function selection(value) {
    let result = null;
    const currentTarget = { value, selectionStart: 0, selectionEnd: value.length,
      setSelectionRange(start, end) { result = [start, end]; } };
    trimDoubleClickSelection({ currentTarget });
    return result;
  }
  assert.deepEqual(selection("word  "), [0, 4]);
  assert.deepEqual(selection("word\t"), [0, 4]);
  assert.equal(selection("word"), null);
  assert.equal(selection("two words "), null);
  assert.equal(selection("word\n"), null);
});
