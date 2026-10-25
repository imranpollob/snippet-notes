// Split on unescaped pipes, preserving empty cells and optional outer pipes.
const splitRow = (line) => {
  const text = line.trim();
  const cells = [];
  let cell = "";
  let lastPipe = -1;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === "\\" && ["\\", "|"].includes(text[index + 1])) {
      cell += text[index + 1] === "|" ? "|" : "\\\\";
      index++;
    } else if (character === "|") {
      cells.push(cell.trim());
      cell = "";
      lastPipe = index;
    } else {
      cell += character;
    }
  }

  if (lastPipe === -1) return null;
  cells.push(cell.trim());
  if (text.startsWith("|")) cells.shift();
  if (lastPipe === text.length - 1) cells.pop();
  return cells;
};

export const parseMarkdownTable = (lines, startIndex) => {
  const headers = splitRow(lines[startIndex]);
  const separator = splitRow(lines[startIndex + 1] || "");
  if (!headers?.length || separator?.length !== headers.length ||
      !separator.every((cell) => /^:?-{3,}:?$/.test(cell))) return null;

  const alignments = separator.map((cell) => {
    if (cell.startsWith(":") && cell.endsWith(":")) return "center";
    if (cell.endsWith(":")) return "right";
    return "left";
  });
  const rows = [];
  let endIndex = startIndex + 2;
  while (endIndex < lines.length) {
    const cells = splitRow(lines[endIndex]);
    if (!cells) break;
    rows.push(headers.map((_, column) => cells[column] || ""));
    endIndex++;
  }

  return { headers, alignments, rows, endIndex };
};
