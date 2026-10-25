"use client";

import React from "react";
import { RichContent } from "../../lib/syntaxHighlight";

const escapeRegExp = (value) =>
  String(value).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const SnippetsComponent = ({
  snippets,
  onCardClick,
  searchQuery,
  viewMode = "grid", // "grid" | "list"
  onToggleCheckbox,
  isSelecting = false,
  selectedIds = new Set(),
  onToggleSelection,
}) => {
  const selectionControl = (snippet) => (
    <label className="snippet-selection-control" onClick={(event) => event.stopPropagation()}>
      <input
        type="checkbox"
        checked={selectedIds.has(snippet.id)}
        onChange={() => onToggleSelection(snippet.id)}
        aria-label={`Select ${snippet.title || snippet.data?.split("\n")[0]?.slice(0, 60) || "untitled snippet"}`}
      />
      <span>{selectedIds.has(snippet.id) ? "Selected" : "Select"}</span>
    </label>
  );
  const activate = (snippet) => isSelecting ? onToggleSelection(snippet.id) : onCardClick(snippet);
  const handleKeyDown = (event, snippet) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(snippet);
    }
  };
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

  // Compact List View Mode (no action buttons — pin/copy/export live in the modal)
  if (viewMode === "list") {
    return (
      <div className="snippets-list-table" role="list">
        {snippets.map((snippet) => {
          const displayLang = (snippet.language || "text").toUpperCase();
          const lineCount = (snippet.data || "").split("\n").length;

          return (
            <div
              key={snippet.id}
              className={`snippet-row-item ${snippet.pinned ? "is-pinned" : ""} ${isSelecting ? "is-selecting" : ""} ${selectedIds.has(snippet.id) ? "is-selected" : ""}`}
              role="listitem"
              tabIndex={isSelecting ? -1 : 0}
              onClick={() => activate(snippet)}
              onKeyDown={(event) => handleKeyDown(event, snippet)}
            >
              {/* Row top: Lang badge + Title + meta */}
              <div className="row-top-line">
                <div className="row-main-col">
                  {isSelecting && selectionControl(snippet)}
                  {snippet.pinned && (
                    <span className="pin-indicator" title="Pinned snippet">
                      ★
                    </span>
                  )}
                  <span className="lang-badge">{displayLang}</span>
                  <span className="row-title">
                    {snippet.title ? highlightMatch(snippet.title, searchQuery) : null}
                  </span>
                </div>
                <span className="row-meta-lines">{lineCount}L</span>
              </div>

              {/* Row bottom: Labels */}
              {snippet.labels && snippet.labels.length > 0 && (
                <div className="row-labels-bottom">
                  {snippet.labels.slice(0, 3).map((label) => (
                    <span key={label} className="label-pill">
                      #{highlightMatch(label, searchQuery)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Grid View Mode (Default, no action buttons — pin/copy/export live in the modal)
  return (
    <div className="cards-grid" role="list">
      {snippets.map((snippet) => {
        return (
          <article
            key={snippet.id}
            className={`snippet-card ${snippet.pinned ? "is-pinned" : ""} ${isSelecting ? "is-selecting" : ""} ${selectedIds.has(snippet.id) ? "is-selected" : ""}`}
            role="listitem"
            tabIndex={isSelecting ? -1 : 0}
            onClick={() => activate(snippet)}
            onKeyDown={(event) => handleKeyDown(event, snippet)}
          >
            {isSelecting && selectionControl(snippet)}
            {snippet.pinned && (
              <div className="card-pinned-row">
                <span className="pin-indicator" title="Pinned snippet">
                  ★ Pinned
                </span>
              </div>
            )}

            {/* Title */}
            {snippet.title ? (<header className="snippet-card-header">
              <h3 className="snippet-card-title">
                {highlightMatch(snippet.title, searchQuery)}
              </h3>
            </header>) : null}

            {/* Formatted Content Preview */}
            <div className="snippet-card-body" inert={isSelecting ? "" : undefined}>
              <RichContent
                content={snippet.data}
                isPreview={true}
                onToggleCheckbox={!isSelecting && onToggleCheckbox ? ((index, checked) => onToggleCheckbox(snippet, index, checked)) : null}
              />
            </div>

            {/* Labels at the bottom of the card */}
            {snippet.labels && snippet.labels.length > 0 && (
              <div className="card-labels-bottom">
                {snippet.labels.slice(0, 3).map((label) => (
                  <span key={label} className="label-pill" title={label}>
                    #{highlightMatch(label, searchQuery)}
                  </span>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};

export default SnippetsComponent;
