"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { RichContent } from "../../lib/syntaxHighlight";
import { detectLanguage, extractSmartTitle } from "../../lib/storage";

const COMMON_LANGUAGES = [
  { id: "auto", label: "Auto Detect" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "html", label: "HTML/CSS" },
  { id: "sql", label: "SQL" },
  { id: "bash", label: "Bash / Shell" },
  { id: "yaml", label: "YAML / Docker" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "markdown", label: "Markdown / Notes" },
];

const POPULAR_TAGS = ["React", "TypeScript", "Python", "SQL", "DevOps", "Hooks", "API", "Workflow"];

const SnippetForm = ({ addSnippet, isSaving = false, onCancel = null }) => {
  const [title, setTitle] = useState("");
  const [data, setData] = useState("");
  const [selectedLangOption, setSelectedLangOption] = useState("auto");
  const [detectedLang, setDetectedLang] = useState("typescript");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [activeTab, setActiveTab] = useState("write"); // "write" | "preview"
  const textareaRef = useRef(null);
  const titleInputRef = useRef(null);

  // Auto-detect language in real-time as user types/pastes
  useEffect(() => {
    if (data) {
      const detected = detectLanguage(data);
      setDetectedLang(detected);
    }
  }, [data]);

  // Focus textarea immediately on mount for instant typing
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const effectiveLanguage = selectedLangOption === "auto" ? detectedLang : selectedLangOption;

  // Compute smart suggested title
  const suggestedTitle = data.trim() ? extractSmartTitle(data, effectiveLanguage) : "";

  const resetForm = useCallback(() => {
    setTitle("");
    setData("");
    setTags([]);
    setTagInput("");
    setSelectedLangOption("auto");
    setActiveTab("write");
    if (textareaRef.current) {
      textareaRef.current.style.height = "";
    }
  }, []);

  const handleResize = useCallback(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.max(160, textareaRef.current.scrollHeight)}px`;
  }, []);

  const toggleTag = (tag) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const clean = tagInput.trim().replace(/^#/, "");
    if (!clean || tags.includes(clean)) return;
    setTags([...tags, clean]);
    setTagInput("");
  };

  const submitSnippet = useCallback(async () => {
    if (isSaving) return;

    const trimmedData = data.trim();
    if (!trimmedData && !title.trim()) return;

    const finalTitle = title.trim() || suggestedTitle || "Untitled snippet";

    await addSnippet({
      title: finalTitle,
      data: trimmedData,
      language: effectiveLanguage,
      tags,
    });
    resetForm();
  }, [title, data, suggestedTitle, effectiveLanguage, tags, addSnippet, resetForm, isSaving]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitSnippet();
  };

  const handleKeyDown = async (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      await submitSnippet();
    }
    if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
    }
  };

  const isDisabled = isSaving || (!title.trim() && !data.trim());

  return (
    <section className="quick-capture-dock" aria-label="Create new snippet">
      <form className="quick-capture-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        {/* Top bar: Title + Language Badge + Tabs */}
        <div className="quick-capture-top">
          <div className="quick-capture-title-wrap">
            <input
              ref={titleInputRef}
              className="quick-capture-title-input"
              type="text"
              placeholder={
                suggestedTitle
                  ? `Title: "${suggestedTitle}" (or type custom label)`
                  : "Snippet title (or leave blank for auto-title)..."
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="quick-capture-meta-controls">
            {/* Language auto-badge & selector */}
            <div className="lang-auto-chip" title="Active language">
              <span className="lang-chip-dot" />
              <select
                className="lang-inline-select"
                value={selectedLangOption}
                onChange={(e) => setSelectedLangOption(e.target.value)}
                aria-label="Language selector"
              >
                <option value="auto">Auto ({detectedLang})</option>
                {COMMON_LANGUAGES.filter((l) => l.id !== "auto").map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Write vs Preview tab toggle */}
            <div className="quick-view-toggle">
              <button
                type="button"
                className={`quick-tab-btn ${activeTab === "write" ? "active" : ""}`}
                onClick={() => setActiveTab("write")}
              >
                Write
              </button>
              <button
                type="button"
                className={`quick-tab-btn ${activeTab === "preview" ? "active" : ""}`}
                onClick={() => setActiveTab("preview")}
              >
                Preview
              </button>
            </div>
          </div>
        </div>

        {/* Editor Body */}
        <div className="quick-capture-editor">
          {activeTab === "write" ? (
            <textarea
              ref={textareaRef}
              className="quick-capture-textarea"
              rows={5}
              placeholder="Paste code or type markdown notes here..."
              value={data}
              onChange={(e) => {
                setData(e.target.value);
                handleResize();
              }}
              onInput={handleResize}
            />
          ) : (
            <div className="quick-capture-preview">
              {data.trim() ? (
                <RichContent content={data} isPreview={true} />
              ) : (
                <div className="preview-placeholder">
                  Live syntax-highlighted preview will appear here as you type...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom bar: Quick tags + Shortcuts & Actions */}
        <div className="quick-capture-footer">
          {/* Quick-toggle tags */}
          <div className="quick-tags-strip">
            <span className="quick-tags-label">Tags:</span>
            {POPULAR_TAGS.map((t) => {
              const active = tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  className={`quick-tag-chip ${active ? "active" : ""}`}
                  onClick={() => toggleTag(t)}
                >
                  {active ? `✓ #${t}` : `+${t}`}
                </button>
              );
            })}
            <div className="custom-tag-box">
              <input
                type="text"
                className="custom-tag-input"
                placeholder="+ custom..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="quick-actions-strip">
            {onCancel && (
              <button type="button" className="ghost-button" onClick={onCancel}>
                Cancel <kbd>Esc</kbd>
              </button>
            )}
            <button
              type="submit"
              className="primary-action"
              disabled={isDisabled}
              aria-disabled={isDisabled}
            >
              <span>{isSaving ? "Saving..." : "Save Snippet"}</span>
              <kbd className="btn-kbd">⌘↵</kbd>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

export default SnippetForm;
