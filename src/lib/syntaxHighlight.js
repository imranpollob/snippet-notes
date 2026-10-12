"use client";

import React, { useState } from "react";

// Token patterns for multi-language syntax highlighting
const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "do", "switch", "case", "break", "continue", "default", "import", "export",
  "from", "as", "class", "extends", "super", "this", "new", "async", "await",
  "try", "catch", "finally", "throw", "typeof", "instanceof", "in", "of",
  "void", "yield", "interface", "type", "enum", "implements", "public",
  "private", "protected", "readonly", "static", "abstract", "namespace",
  // Python
  "def", "elif", "is", "lambda", "not", "pass", "raise", "with", "assert",
  "except", "global", "nonlocal",
  // SQL
  "select", "from", "where", "join", "inner", "left", "right", "outer", "full",
  "group", "by", "order", "having", "limit", "offset", "insert", "into",
  "values", "update", "set", "delete", "create", "table", "alter", "drop",
  "index", "distinct", "union", "all", "exists", "between", "like", "case",
  "when", "then", "end", "and", "or", "over", "partition", "first_value",
  // Bash
  "echo", "sudo", "grep", "cat", "chmod", "chown", "mkdir", "rm", "cp", "mv",
  "git", "npm", "npx", "yarn", "pnpm", "docker", "compose", "curl", "wget",
  // YAML/JSON
  "version", "services", "image", "ports", "environment", "volumes", "restart"
]);

const BUILTINS = new Set([
  "console", "window", "document", "process", "Math", "JSON", "Date", "Promise",
  "Array", "Object", "String", "Number", "Boolean", "RegExp", "Error", "Map", "Set",
  "useState", "useEffect", "useCallback", "useMemo", "useRef", "useContext",
  "useReducer", "React", "NextResponse", "null", "undefined", "true", "false",
  "string", "number", "boolean", "any", "unknown", "never"
]);

/**
 * Tokenizes a line of code into styled spans
 */
export const highlightCodeLine = (line, language = "javascript") => {
  const tokens = [];
  let i = 0;
  const len = line.length;
  const isBash = language === "bash" || language === "sh" || language === "shell";
  const isPython = language === "python" || language === "py";
  const isSql = language === "sql";
  const isYaml = language === "yaml" || language === "yml";

  while (i < len) {
    const char = line[i];
    const rest = line.slice(i);

    // Comments
    if (rest.startsWith("//") || (rest.startsWith("#") && (isBash || isPython || isYaml)) || (rest.startsWith("--") && isSql)) {
      tokens.push({ type: "comment", text: rest });
      break;
    }

    // Strings (Double quoted)
    if (char === '"') {
      let str = '"';
      let j = i + 1;
      while (j < len && line[j] !== '"') {
        if (line[j] === "\\" && j + 1 < len) {
          str += line[j] + line[j + 1];
          j += 2;
        } else {
          str += line[j];
          j++;
        }
      }
      if (j < len) {
        str += '"';
        j++;
      }
      tokens.push({ type: "string", text: str });
      i = j;
      continue;
    }

    // Strings (Single quoted)
    if (char === "'") {
      let str = "'";
      let j = i + 1;
      while (j < len && line[j] !== "'") {
        if (line[j] === "\\" && j + 1 < len) {
          str += line[j] + line[j + 1];
          j += 2;
        } else {
          str += line[j];
          j++;
        }
      }
      if (j < len) {
        str += "'";
        j++;
      }
      tokens.push({ type: "string", text: str });
      i = j;
      continue;
    }

    // Strings (Template literals)
    if (char === "`") {
      let str = "`";
      let j = i + 1;
      while (j < len && line[j] !== "`") {
        if (line[j] === "\\" && j + 1 < len) {
          str += line[j] + line[j + 1];
          j += 2;
        } else {
          str += line[j];
          j++;
        }
      }
      if (j < len) {
        str += "`";
        j++;
      }
      tokens.push({ type: "string", text: str });
      i = j;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char) && (i === 0 || /[^a-zA-Z0-9_$]/.test(line[i - 1]))) {
      const numMatch = rest.match(/^[0-9]+(\.[0-9]+)?/);
      if (numMatch) {
        tokens.push({ type: "number", text: numMatch[0] });
        i += numMatch[0].length;
        continue;
      }
    }

    // Words (Keywords, Builtins, Identifiers, Functions)
    if (/[a-zA-Z_$]/.test(char)) {
      const wordMatch = rest.match(/^[a-zA-Z0-9_$-]+/);
      if (wordMatch) {
        const word = wordMatch[0];
        const lowerWord = word.toLowerCase();
        const nextChar = line[i + word.length];

        if (KEYWORDS.has(lowerWord)) {
          tokens.push({ type: "keyword", text: word });
        } else if (BUILTINS.has(word)) {
          tokens.push({ type: "builtin", text: word });
        } else if (nextChar === "(") {
          tokens.push({ type: "function", text: word });
        } else if (isYaml && line[i + word.length] === ":") {
          tokens.push({ type: "property", text: word });
        } else {
          tokens.push({ type: "identifier", text: word });
        }
        i += word.length;
        continue;
      }
    }

    // Punctuation / Operators
    if (/[{}()[\].,;:?!=<>+*/&|^~%-]/.test(char)) {
      tokens.push({ type: "punctuation", text: char });
      i++;
      continue;
    }

    // Whitespace / other
    tokens.push({ type: "plain", text: char });
    i++;
  }

  return tokens;
};

/**
 * Modern Code Block with line numbers, language badge, and 1-click Copy
 */
export const CodeBlock = ({ code, language = "javascript" }) => {
  const [copied, setCopied] = useState(false);

  const cleanCode = (code || "").trim();
  const lines = cleanCode.split("\n");

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const displayLang = (language || "code").toUpperCase();

  return (
    <div className="code-block-container" onClick={(e) => e.stopPropagation()}>
      <div className="code-block-header">
        <div className="code-block-meta">
          <span className="code-block-lang">{displayLang}</span>
          <span className="code-block-lines">{lines.length} {lines.length === 1 ? "line" : "lines"}</span>
        </div>
        <button
          type="button"
          className={`copy-code-btn ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          aria-label={copied ? "Code copied to clipboard" : "Copy code"}
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="code-block-content">
        <pre className="code-block-pre">
          <code>
            {lines.map((line, lineIdx) => (
              <div key={lineIdx} className="code-line">
                <span className="line-number" aria-hidden="true">
                  {lineIdx + 1}
                </span>
                <span className="line-content">
                  {highlightCodeLine(line, language).map((token, tokenIdx) => (
                    <span key={tokenIdx} className={`tok-${token.type}`}>
                      {token.text}
                    </span>
                  ))}
                  {line.length === 0 ? " " : null}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

/**
 * Rich Content Renderer
 * Parses markdown paragraphs, headings, bullet lists, inline bold/code, and fenced code blocks
 */
export const RichContent = ({ content, isPreview = false, maxLines = null, onToggleCheckbox = null }) => {
  if (!content) return null;

  // Split by fenced code blocks: ```lang ... ```
  const parts = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "prose",
        text: content.slice(lastIndex, match.index),
        offset: lastIndex,
      });
    }
    parts.push({
      type: "code",
      language: match[1] || "text",
      code: match[2],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: "prose",
      text: content.slice(lastIndex),
      offset: lastIndex,
    });
  }

  // If no code block found, check if content looks like raw code
  if (parts.length === 1 && parts[0].type === "prose") {
    const raw = parts[0].text.trim();
    if (
      raw.startsWith("import ") ||
      raw.startsWith("export ") ||
      raw.startsWith("const ") ||
      raw.startsWith("function ") ||
      raw.startsWith("def ") ||
      raw.startsWith("SELECT ") ||
      raw.startsWith("#!/") ||
      raw.startsWith("docker") ||
      raw.startsWith("version:")
    ) {
      return <CodeBlock code={raw} language="auto" />;
    }
  }

  return (
    <div className={`rich-content ${isPreview ? "preview-mode" : ""}`}>
      {parts.map((part, index) => {
        if (part.type === "code") {
          return <CodeBlock key={index} code={part.code} language={part.language} />;
        }

        // Render prose lines
        const lines = part.text.split("\n");
        let lineOffset = part.offset;
        return (
          <div key={index} className="prose-segment">
            {lines.map((line, lineIdx) => {
              const lineStart = lineOffset;
              lineOffset += line.length + 1;
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={lineIdx} className="prose-empty-line" />;
              }

              // Headings
              if (trimmed.startsWith("### ")) {
                return <h4 key={lineIdx} className="prose-h3">{renderInlineFormatted(trimmed.slice(4))}</h4>;
              }
              if (trimmed.startsWith("## ")) {
                return <h3 key={lineIdx} className="prose-h2">{renderInlineFormatted(trimmed.slice(3))}</h3>;
              }
              if (trimmed.startsWith("# ")) {
                return <h2 key={lineIdx} className="prose-h1">{renderInlineFormatted(trimmed.slice(2))}</h2>;
              }

              // Task list items: - [ ] todo / - [x] done
              const task = line.match(/^(\s*)[-*+]\s+\[([ xX]?)\](?:\s+(.*))?$/);
              if (task) {
                const checked = task[2] !== " " && task[2] !== "";
                const boxIndex = lineStart + line.indexOf("[") + 1;
                return (
                  <div key={lineIdx} className={`prose-list-item prose-task ${checked ? "is-done" : ""}`}>
                    <input
                      type="checkbox"
                      className="prose-checkbox"
                      checked={checked}
                      disabled={!onToggleCheckbox}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => onToggleCheckbox?.(boxIndex, !checked)}
                      aria-label={task[3] || "Task"}
                    />
                    <span>{renderInlineFormatted(task[3] || "")}</span>
                  </div>
                );
              }

              // Bullet lists
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={lineIdx} className="prose-list-item">
                    <span className="prose-bullet">•</span>
                    <span>{renderInlineFormatted(trimmed.slice(2))}</span>
                  </div>
                );
              }

              // Normal paragraph line
              return (
                <p key={lineIdx} className="prose-p">
                  {renderInlineFormatted(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Formats inline bold (**text**), italic (*text*), and code (`code`)
 */
const renderInlineFormatted = (text) => {
  if (!text) return "";
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(<code key={key++} className="inline-code-pill">{codeMatch[1]}</code>);
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text*
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Link: [label](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      parts.push(
        <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="prose-link">
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Plain text until next special token
    const nextSpecial = remaining.search(/[`*[]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts;
};

