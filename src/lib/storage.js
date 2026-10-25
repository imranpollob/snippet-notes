// Local-First Storage Service for Snippet Notes
// Provides standalone persistence with zero backend dependency.

const STORAGE_KEY = "ip_snippets_v1";

export const STARTER_SNIPPETS = [];

// Normalize a labels value into a deduped array of clean label names.
export const normalizeLabels = (value) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const labels = [];
  value.forEach((raw) => {
    const clean = String(raw ?? "").trim().replace(/^#+/, "");
    if (!clean || seen.has(clean.toLowerCase())) return;
    seen.add(clean.toLowerCase());
    labels.push(clean);
  });
  return labels;
};

export const getLocalSnippets = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Purge any legacy starter snippets previously saved in browser localStorage
      let userSnippets = parsed.filter((s) => !s.id?.startsWith("starter-"));
      // Drop the legacy tags field: labels replace tags entirely with no migration
      let needsRewrite = userSnippets.length !== parsed.length;
      userSnippets = userSnippets.map((snippet) => {
        if (snippet && typeof snippet === "object" && "tags" in snippet) {
          needsRewrite = true;
          const rest = { ...snippet };
          delete rest.tags;
          return { ...rest, labels: normalizeLabels(rest.labels) };
        }
        if (snippet && typeof snippet === "object" && !Array.isArray(snippet.labels)) {
          needsRewrite = true;
          return { ...snippet, labels: [] };
        }
        return snippet;
      });
      if (needsRewrite) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userSnippets));
      }
      return userSnippets;
    }
    return [];
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return [];
  }
};

export const setLocalSnippets = (snippets, { throwOnError = false } = {}) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch (error) {
    console.error("Error writing to localStorage:", error);
    if (throwOnError) throw error;
  }
};

export const addLocalSnippet = (snippet) => {
  const snippets = getLocalSnippets();
  const detectedLang = snippet.language || detectLanguage(snippet.data || "");
  const effectiveTitle = snippet.title && snippet.title.trim()
    ? snippet.title.trim()
    : "";

  const newSnippet = {
    id: `snippet-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    title: effectiveTitle,
    data: snippet.data || "",
    language: detectedLang,
    labels: normalizeLabels(snippet.labels),
    pinned: Boolean(snippet.pinned),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updated = [newSnippet, ...snippets];
  setLocalSnippets(updated);
  return newSnippet;
};

export const updateLocalSnippet = (id, updates) => {
  const snippets = getLocalSnippets();
  let updatedSnippet = null;
  const updated = snippets.map((snippet) => {
    if (snippet.id === id) {
      updatedSnippet = {
        ...snippet,
        ...updates,
        updatedAt: Date.now(),
      };
      return updatedSnippet;
    }
    return snippet;
  });

  setLocalSnippets(updated);
  return updatedSnippet;
};

export const deleteLocalSnippet = (id) => {
  const snippets = getLocalSnippets();
  const updated = snippets.filter((snippet) => snippet.id !== id);
  setLocalSnippets(updated);
  return updated;
};

export const togglePinLocalSnippet = (id) => {
  const snippets = getLocalSnippets();
  const updated = snippets.map((snippet) =>
    snippet.id === id ? { ...snippet, pinned: !snippet.pinned } : snippet
  );
  setLocalSnippets(updated);
  return updated;
};

// Smart Title Extractor: extracts title from code comments, function/class, or command
export const extractSmartTitle = (text, defaultLanguage = "snippet") => {
  if (!text || !text.trim()) return "Untitled snippet";

  const lines = text.trim().split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check for comment titles: // title, # title, -- title, /* title */
    const commentMatch = line.match(/^(?:\/\/\s*|#\s*|--\s*|\/\*\s*)([A-Za-z0-9_ -]{3,60})(?:\*\/)?$/);
    if (commentMatch && !commentMatch[1].startsWith("!/bin")) {
      return commentMatch[1].trim();
    }

    // Check for function definitions: function foo(...), const foo = (...) =>, def foo(...)
    const funcMatch = line.match(/(?:function|def|const|let|var)\s+([a-zA-Z0-9_$]+)/);
    if (funcMatch && funcMatch[1]) {
      return `${funcMatch[1]}()`;
    }

    // Check for class: class Foo
    const classMatch = line.match(/class\s+([a-zA-Z0-9_$]+)/);
    if (classMatch && classMatch[1]) {
      return `${classMatch[1]} Class`;
    }

    // Check for SQL queries: SELECT ... FROM table
    if (line.toUpperCase().startsWith("SELECT") || line.toUpperCase().startsWith("WITH")) {
      return "SQL Query";
    }

    // Check for docker compose
    if (line.startsWith("services:") || line.startsWith("version:")) {
      return "Docker Compose Stack";
    }

    // Check for git or shell commands: git ..., npm ...
    if (line.startsWith("git ") || line.startsWith("npm ") || line.startsWith("docker ")) {
      return line.slice(0, 45);
    }
  }

  // Fallback: first non-empty line truncated
  const firstLine = lines.find((l) => l.trim().length > 0) || "";
  const cleaned = firstLine.replace(/^[#/*\s-]+/, "").trim();
  if (cleaned.length > 0) {
    return cleaned.slice(0, 40);
  }

  return `${defaultLanguage.charAt(0).toUpperCase() + defaultLanguage.slice(1)} snippet`;
};

// Automatic language detection from code content
export const detectLanguage = (text) => {
  if (!text) return "markdown";
  const codeBlockMatch = text.match(/```([a-zA-Z0-9_-]+)/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].toLowerCase();
  }

  const trimmed = text.trim();

  // TypeScript / JavaScript
  if (
    trimmed.includes("import ") && (trimmed.includes("from '") || trimmed.includes('from "')) ||
    trimmed.includes("export ") ||
    trimmed.includes("const ") && trimmed.includes("=>") ||
    trimmed.includes("interface ") ||
    trimmed.includes("type ") && trimmed.includes("=")
  ) {
    return trimmed.includes(": ") || trimmed.includes("<T>") || trimmed.includes("interface ")
      ? "typescript"
      : "javascript";
  }

  // SQL
  if (
    /\b(SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|WITH)\b/i.test(trimmed) &&
    /\b(FROM|WHERE|JOIN|GROUP BY|ORDER BY)\b/i.test(trimmed)
  ) {
    return "sql";
  }

  // Python
  if (
    /\b(def |class |elif |import os|import sys|print\(|__name__|lambda )\b/.test(trimmed) ||
    trimmed.startsWith("import ") && !trimmed.includes("from '")
  ) {
    return "python";
  }

  // Docker / YAML
  if (
    trimmed.includes("services:") ||
    trimmed.includes("version:") ||
    trimmed.includes("image:") ||
    trimmed.includes("apiVersion:") ||
    trimmed.startsWith("FROM ") ||
    trimmed.startsWith("WORKDIR ")
  ) {
    return "yaml";
  }

  // Bash / Shell
  if (
    trimmed.startsWith("#!/bin") ||
    trimmed.startsWith("git ") ||
    trimmed.startsWith("npm ") ||
    trimmed.startsWith("docker ") ||
    trimmed.startsWith("curl ") ||
    trimmed.startsWith("sudo ") ||
    trimmed.includes("echo ")
  ) {
    return "bash";
  }

  // Rust
  if (trimmed.includes("fn main()") || trimmed.includes("let mut ") || trimmed.includes("pub fn ")) {
    return "rust";
  }

  // Go
  if (trimmed.includes("package main") || trimmed.includes("func main()") || trimmed.includes("fmt.Print")) {
    return "go";
  }

  // HTML / CSS
  if (trimmed.includes("<!DOCTYPE") || trimmed.includes("<html") || trimmed.includes("</div>") || trimmed.includes("</")) {
    return "html";
  }

  return "markdown";
};

// Data Portability: Export full JSON
export const exportSnippetsToJSON = () => {
  const snippets = getLocalSnippets();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snippets, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `ip-snippets-backup-${new Date().toISOString().split("T")[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

// Data Portability: Import JSON
export const importSnippetsFromJSON = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!Array.isArray(imported)) {
          throw new Error("Invalid backup format. Expected a JSON array of snippets.");
        }
        // Normalize (legacy tags are dropped: labels replace tags entirely)
        const valid = imported
          .filter((item) => item && (item.title || item.data))
          .map((item) => {
            const rest = { ...item };
            delete rest.tags;
            return { ...rest, labels: normalizeLabels(rest.labels) };
          });
        setLocalSnippets(valid);
        resolve(valid);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

// Data Portability: Export single snippet to Markdown
export const exportSnippetAsMarkdown = (snippet) => {
  const content = `# ${snippet.title || "Untitled snippet"}
${snippet.labels && snippet.labels.length ? `\n**Labels:** ${snippet.labels.map((t) => `#${t}`).join(" ")}\n` : ""}
${snippet.data || ""}
`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(snippet.title || "snippet").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};


// Flip the task checkbox whose "[ ]"/"[x]" marker character sits at `index`
export const setCheckboxAt = (text, index, checked) =>
  text.slice(0, index) + (checked ? "x" : " ") + text.slice(text[index] === "]" ? index : index + 1);
