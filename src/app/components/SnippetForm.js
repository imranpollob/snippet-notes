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

const SnippetForm = ({ addSnippet, isSaving = false, onCancel = null, existingLabels = [] }) => {
  const [title, setTitle] = useState("");
  const [data, setData] = useState("");
  const [selectedLangOption, setSelectedLangOption] = useState("auto");
  const [detectedLang, setDetectedLang] = useState("typescript");
  const [labels, setLabels] = useState([]);
  const [labelInput, setLabelInput] = useState("");
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
    setLabels([]);
    setLabelInput("");
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

  const handleAddLabel = () => {
    const clean = labelInput.trim().replace(/^#+/, "");
    if (!clean || labels.some((l) => l.toLowerCase() === clean.toLowerCase())) return;
    setLabels([...labels, clean]);
    setLabelInput("");
  };

  const handleRemoveLabel = (label) => {
    setLabels(labels.filter((l) => l !== label));
  };

  const submitSnippet = useCallback(async () => {
    if (isSaving) return;

    const trimmedData = data.trim();
    if (!trimmedData && !title.trim()) return;

    const finalTitle = title.trim();

    await addSnippet({
      title: finalTitle,
      data: trimmedData,
      language: effectiveLanguage,
      labels,
    });
    resetForm();
  }, [title, data, effectiveLanguage, labels, addSnippet, resetForm, isSaving]);

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
                  ? `Title (optional — leave blank to keep it untitled)`
                  : "Snippet title (optional)..."
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

        {/* Bottom bar: Labels + Shortcuts & Actions */}
        <div className="quick-capture-footer">
          {/* Labels: reuse a previous label or create a new one */}
          <div className="quick-labels-strip">
            <span className="quick-labels-label">Labels:</span>
            {labels.map((label) => (
              <span key={label} className="quick-label-chip">
                #{label}
                <button
                  type="button"
                  className="quick-label-remove"
                  onClick={() => handleRemoveLabel(label)}
                  aria-label={`Remove label ${label}`}
                >
                  ×
                </button>
              </span>
            ))}
            <div className="custom-label-box">
              <input
                type="text"
                className="custom-label-input"
                placeholder="+ add label..."
                value={labelInput}
                list="snippet-label-options"
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddLabel();
                  }
                }}
                onBlur={handleAddLabel}
              />
              <datalist id="snippet-label-options">
                {existingLabels
                  .filter((l) => !labels.includes(l))
                  .map((l) => (
                    <option key={l} value={l} />
                  ))}
              </datalist>
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
