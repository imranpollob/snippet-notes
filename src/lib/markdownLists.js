const LIST_MARKER = /^([ \t]*)(?:(?:[-*+]|\d+[.)])[ \t]+)(\[[ xX]\][ \t]+)?/;

/** Toggle a list style across the lines touched by a textarea selection. */
export function toggleMarkdownList(value, selectionStart, selectionEnd, style) {
  const start = selectionStart === 0 ? 0 : value.lastIndexOf("\n", selectionStart - 1) + 1;
  let end = selectionEnd;
  if (end > start && value[end - 1] === "\n") end--;
  const lineEnd = value.indexOf("\n", end);
  end = lineEnd === -1 ? value.length : lineEnd;
  const lines = value.slice(start, end).split("\n");

  const getStyle = (line) => {
    const match = line.match(LIST_MARKER);
    if (!match) return null;
    if (match[2]) return "task";
    return /^\s*\d/.test(line) ? "numbered" : "bullet";
  };
  const remove = lines.every((line) => getStyle(line) === style);
  const replacement = lines.map((line, index) => {
    const match = line.match(LIST_MARKER);
    const indent = match ? match[1] : (line.match(/^[ \t]*/) || [""])[0];
    const content = match ? line.slice(match[0].length) : line.slice(indent.length);
    if (remove) return indent + content;
    const marker = style === "numbered" ? `${index + 1}. ` : style === "task" ? "- [ ] " : "- ";
    return indent + marker + content;
  }).join("\n");

  return {
    value: value.slice(0, start) + replacement + value.slice(end),
    selectionStart: start,
    selectionEnd: start + replacement.length,
  };
}
