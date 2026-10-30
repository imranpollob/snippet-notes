"use client";

import React from "react";
import { toggleMarkdownList } from "../../lib/markdownLists";

const commands = [
  { label: "Heading", text: "H", prefix: "## ", line: true },
  { label: "Bold", text: "B", before: "**", after: "**", placeholder: "bold text" },
  { label: "Italic", text: "I", before: "*", after: "*", placeholder: "italic text" },
  { label: "Link", text: "Link", before: "[", after: "](https://example.com)", placeholder: "link text" },
  { label: "Image", text: "Image", before: "![", after: "](https://example.com/image.png)", placeholder: "image description", selectUrl: true },
  { label: "Inline code", text: "Code", before: "`", after: "`", placeholder: "code" },
  { label: "Code block", text: "Code block", before: "```\n", after: "\n```", placeholder: "code", block: true },
  { label: "Bulleted list", text: "• List", listStyle: "bullet" },
  { label: "Numbered list", text: "1. List", listStyle: "numbered" },
  { label: "Checkbox list", text: "☐ Checkbox", listStyle: "task" },
  { label: "Quote", text: "Quote", prefix: "> ", line: true },
];

export default function MarkdownToolbar({ textareaRef, onChange, disabled = false, onApplied }) {
  const apply = (command) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const value = textarea.value;
    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;
    let replacement;
    let selectionStart;
    let selectionEnd;

    if (command.listStyle) {
      const result = toggleMarkdownList(value, start, end, command.listStyle);
      onChange(result.value);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(result.selectionEnd, result.selectionEnd);
        onApplied?.();
      });
      return;
    } else if (command.line) {
      start = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
      // A selection ending at the start of a line should not format that line.
      if (end > start && value[end - 1] === "\n") end--;
      const lineEnd = value.indexOf("\n", end);
      end = lineEnd === -1 ? value.length : lineEnd;
      const lines = value.slice(start, end).split("\n");
      replacement = lines.map((line) => `${command.prefix}${line}`).join("\n");
      selectionStart = start + command.prefix.length;
      selectionEnd = start + replacement.length;
    } else {
      const selected = value.slice(start, end) || command.placeholder;
      const leading = command.block && start > 0 && value[start - 1] !== "\n" ? "\n" : "";
      const trailing = command.block && end < value.length && value[end] !== "\n" ? "\n" : "";
      replacement = leading + command.before + selected + command.after + trailing;
      selectionStart = start + leading.length + command.before.length;
      selectionEnd = selectionStart + selected.length;
      if (command.selectUrl) {
        selectionStart = selectionEnd + 2; // Skip ](
        selectionEnd = selectionStart + command.after.length - 3;
      }
    }

    onChange(value.slice(0, start) + replacement + value.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
      onApplied?.();
    });
  };

  return (
    <div className="markdown-toolbar" role="group" aria-label="Markdown formatting">
      {commands.map((command) => (
        <button key={command.label} type="button" title={command.label} aria-label={command.label}
          disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => apply(command)}>
          {command.text}
        </button>
      ))}
    </div>
  );
}
