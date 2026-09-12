"use client";

import React, { useState } from "react";
import { RichContent } from "../../lib/syntaxHighlight";
import { exportSnippetAsMarkdown } from "../../lib/storage";

const escapeRegExp = (value) =>
  String(value).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const SnippetsComponent = ({
  snippets,
  onCardClick,
  searchQuery,
  onTogglePin,
  viewMode = "grid", // "grid" | "list"
}) => {
  const [copiedId, setCopiedId] = useState(null);

  const highlightMatch = (text, query) => {
    if (!query || !text) {
      return text;
    }

    const safeQuery = escapeRegExp(query);
    const regex = new RegExp(`(${safeQuery})`, "gi");
    const parts = String(text).split(regex);

    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <mark key={`${part}-${index}`} className="highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleCopyCard = async (e, snippet) => {
    e.stopPropagation();
    try {
      // Extract raw code if fenced or use full content
      const codeMatch = snippet.data?.match(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/);
      const textToCopy = codeMatch ? codeMatch[1].trim() : snippet.data;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(snippet.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy card:", err);
    }
  };

  const handleExportMd = (e, snippet) => {
    e.stopPropagation();
    exportSnippetAsMarkdown(snippet);
  };

  const handlePin = (e, snippetId) => {
    e.stopPropagation();
    if (onTogglePin) {
      onTogglePin(snippetId);
    }
  };

  // Compact List View Mode
  if (viewMode === "list") {
    return (
      <div className="snippets-list-table" role="list">
        {snippets.map((snippet) => {
          const isCopied = copiedId === snippet.id;
          const displayLang = (snippet.language || "text").toUpperCase();
          const lineCount = (snippet.data || "").split("\n").length;

          return (
            <div
              key={snippet.id}
              className={`snippet-row-item ${snippet.pinned ? "is-pinned" : ""}`}
              role="listitem"
              tabIndex={0}
              onClick={() => onCardClick(snippet)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onCardClick(snippet);
                }
              }}
            >
              {/* Row Left: Pin + Lang badge + Title */}
              <div className="row-main-col">
                <button
                  type="button"
                  className={`row-pin-btn ${snippet.pinned ? "active" : ""}`}
                  onClick={(e) => handlePin(e, snippet.id)}
                  title={snippet.pinned ? "Unpin" : "Pin to top"}
                  aria-label={snippet.pinned ? "Unpin snippet" : "Pin snippet"}
                >
                  ★
                </button>
                <span className="lang-badge">{displayLang}</span>
                <span className="row-title">
                  {highlightMatch(snippet.title || "Untitled snippet", searchQuery)}
                </span>
              </div>

              {/* Row Tags */}
              <div className="row-tags-col">
                {snippet.tags && snippet.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="tag-pill">
                    #{highlightMatch(tag, searchQuery)}
                  </span>
                ))}
              </div>

              {/* Row Actions: 1-Click Copy */}
              <div className="row-actions-col">
                <span className="row-meta-lines">{lineCount}L</span>
                <button
                  type="button"
                  className={`row-copy-btn ${isCopied ? "copied" : ""}`}
                  onClick={(e) => handleCopyCard(e, snippet)}
                  title="Copy code to clipboard"
                  aria-label="Copy snippet code"
                >
                  {isCopied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Grid View Mode (Default)
  return (
    <div className="cards-grid" role="list">
      {snippets.map((snippet) => {
        const lineCount = (snippet.data || "").split("\n").length;
        const displayLang = (snippet.language || "text").toUpperCase();
        const isCopied = copiedId === snippet.id;

        return (
          <article
            key={snippet.id}
            className={`snippet-card ${snippet.pinned ? "is-pinned" : ""}`}
            role="listitem"
            tabIndex={0}
            onClick={() => onCardClick(snippet)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onCardClick(snippet);
              }
            }}
          >
            {/* Top row: Language badge, Pin toggle, and Actions */}
            <div className="card-top-bar">
              <div className="card-badges">
                <span className="lang-badge">{displayLang}</span>
                {snippet.pinned && (
                  <span className="pin-indicator" title="Pinned snippet">
                    ★ Pinned
                  </span>
                )}
              </div>

              <div className="card-action-icons">
                <button
                  type="button"
                  className={`card-icon-btn ${snippet.pinned ? "active" : ""}`}
                  title={snippet.pinned ? "Unpin snippet" : "Pin snippet to top"}
                  onClick={(e) => handlePin(e, snippet.id)}
                  aria-label={snippet.pinned ? "Unpin snippet" : "Pin snippet to top"}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={snippet.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>

                <button
                  type="button"
                  className={`card-quick-copy-btn ${isCopied ? "copied" : ""}`}
                  title={isCopied ? "Copied to clipboard!" : "Copy code"}
                  onClick={(e) => handleCopyCard(e, snippet)}
                  aria-label={isCopied ? "Code copied" : "Copy code to clipboard"}
                >
                  {isCopied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

                <button
                  type="button"
                  className="card-icon-btn"
                  title="Export snippet as Markdown file"
                  onClick={(e) => handleExportMd(e, snippet)}
                  aria-label="Export snippet as Markdown file"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Title */}
            <header className="snippet-card-header">
              <h3 className="snippet-card-title">
                {highlightMatch(snippet.title || "Untitled snippet", searchQuery)}
              </h3>
            </header>

            {/* Tags */}
            {snippet.tags && snippet.tags.length > 0 && (
              <div className="card-tags-list">
                {snippet.tags.map((tag) => (
                  <span key={tag} className="tag-pill">
                    #{highlightMatch(tag, searchQuery)}
                  </span>
                ))}
              </div>
            )}

            {/* Formatted Content Preview */}
            <div className="snippet-card-body">
              <RichContent content={snippet.data} isPreview={true} />
            </div>

            {/* Card Footer */}
            <footer className="snippet-card-footer">
              <span className="card-meta-text">
                {lineCount} {lineCount === 1 ? "line" : "lines"}
              </span>
              <span className="card-open-hint">Click to edit →</span>
            </footer>
          </article>
        );
      })}
    </div>
  );
};

export default SnippetsComponent;
