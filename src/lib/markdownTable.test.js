import assert from "node:assert/strict";
import test from "node:test";
import { parseMarkdownTable } from "./markdownTable.js";

const example = [
  "| Machine | Folder | Purpose |",
  "|---|---|---|",
  "| Linux | `bindcheck-chatgpt-codex` | First place to look for the missing D1 artifacts |",
  "| Linux | `BindCheck` | Second place to look for the original T22 artifacts |",
  "| Linux | `bindcheck-claude-code` | Another possible copy if neither contains them |",
  "| Mac | `bindcheck-d1-paper` | Destination for recovered artifacts |",
];

test("parses the reported table and preserves inline code for rendering", () => {
  const table = parseMarkdownTable(example, 0);
  assert.deepEqual(table.headers, ["Machine", "Folder", "Purpose"]);
  assert.equal(table.rows.length, 4);
  assert.deepEqual(table.rows[0], ["Linux", "`bindcheck-chatgpt-codex`", "First place to look for the missing D1 artifacts"]);
  assert.deepEqual(table.rows[3], ["Mac", "`bindcheck-d1-paper`", "Destination for recovered artifacts"]);
  assert.equal(table.endIndex, 6);
});

test("supports optional outer pipes, alignment, and CRLF input", () => {
  const table = parseMarkdownTable("Left | Center | Right\r\n:--- | :---: | ---:\r\na | **b** | [c](https://example.com)".split("\n"), 0);
  assert.deepEqual(table.alignments, ["left", "center", "right"]);
  assert.deepEqual(table.rows, [["a", "**b**", "[c](https://example.com)"]]);
});

test("keeps escaped pipes in cells, including inline code", () => {
  const table = parseMarkdownTable(["| A | B |", "| --- | --- |", "| a\\|b | `c\\|d` |"], 0);
  assert.deepEqual(table.rows, [["a|b", "`c|d`"]]);
});

test("pads missing cells, ignores extras, and stops before surrounding prose", () => {
  const lines = ["Before", "| A | B |", "| --- | --- |", "| one |", "| two | three | extra |", "After", "- [ ] Task"];
  const table = parseMarkdownTable(lines, 1);
  assert.deepEqual(table.rows, [["one", ""], ["two", "three"]]);
  assert.equal(table.endIndex, 5);
});

test("rejects ordinary pipe text and malformed separators", () => {
  for (const lines of [["a | b", "plain text"], ["| a | b |", "| --- |"], ["| a | b |", "| --- | text |"]]) {
    assert.equal(parseMarkdownTable(lines, 0), null);
  }
});

test("supports an empty cell and a table with no body rows", () => {
  assert.deepEqual(parseMarkdownTable(["| A | B |", "| --- | --- |", "| | value |"], 0).rows, [["", "value"]]);
  assert.deepEqual(parseMarkdownTable(["| A |", "| --- |"], 0).rows, []);
});
