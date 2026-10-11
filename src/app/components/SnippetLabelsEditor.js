"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function SnippetLabelsEditor({
  labels,
  availableLabels,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  disabled = false,
}) {
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const pickerRef = useRef(null);
  const inputBoxRef = useRef(null);
  const listboxId = useId();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(0);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0, width: 300, maxHeight: 300 });
  const cleanQuery = inputValue.trim().replace(/^#+/, "");
  const selectedNames = new Set(labels.map((label) => label.toLowerCase()));
  const matches = availableLabels
    .filter((label) => !selectedNames.has(label.toLowerCase()) && label.toLowerCase().includes(cleanQuery.toLowerCase()))
    .slice(0, 6);
  const canCreate = cleanQuery && !selectedNames.has(cleanQuery.toLowerCase()) &&
    !availableLabels.some((label) => label.toLowerCase() === cleanQuery.toLowerCase());
  const options = [...matches.map((label) => ({ label, isNew: false })),
    ...(canCreate ? [{ label: cleanQuery, isNew: true }] : [])];
  const highlightedOption = Math.min(activeOption, Math.max(0, options.length - 1));
  const [navigation, setNavigation] = useState({
    hasOverflow: false,
    canGoBack: false,
    canGoForward: false,
  });

  const updateNavigation = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    setNavigation({
      hasOverflow: list.scrollWidth > list.clientWidth + 1,
      canGoBack: list.scrollLeft > 1,
      canGoForward: list.scrollLeft + list.clientWidth < list.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(updateNavigation);
    observer.observe(list);
    updateNavigation();
    return () => observer.disconnect();
  }, [labels, updateNavigation]);

  useLayoutEffect(() => {
    if (!isPickerOpen || disabled) return;
    const positionPicker = () => {
      const bounds = inputBoxRef.current.getBoundingClientRect();
      const below = window.innerHeight - bounds.bottom - 16;
      const above = bounds.top - 16;
      const desiredHeight = Math.min(340, Math.max(116, options.length * 40 + 100));
      const showAbove = below < desiredHeight && above > below;
      const maxHeight = Math.max(80, Math.min(desiredHeight, showAbove ? above : below));
      const width = Math.min(300, window.innerWidth - 16);
      setPickerPosition({
        width,
        maxHeight,
        left: Math.max(8, Math.min(bounds.right - width, window.innerWidth - width - 8)),
        top: showAbove ? undefined : bounds.bottom + 8,
        bottom: showAbove ? window.innerHeight - bounds.top + 8 : undefined,
      });
    };
    positionPicker();
    window.addEventListener("resize", positionPicker);
    window.addEventListener("scroll", positionPicker, true);
    return () => {
      window.removeEventListener("resize", positionPicker);
      window.removeEventListener("scroll", positionPicker, true);
    };
  }, [isPickerOpen, disabled, options.length]);

  useEffect(() => {
    if (!isPickerOpen) return;
    const closeOutside = (event) => {
      if (!inputBoxRef.current?.contains(event.target) && !pickerRef.current?.contains(event.target)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [isPickerOpen]);

  useEffect(() => {
    if (isPickerOpen) {
      document.getElementById(`${listboxId}-${highlightedOption}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [isPickerOpen, listboxId, highlightedOption, cleanQuery]);

  const selectLabel = (label) => {
    onAdd(label);
    setActiveOption(0);
    inputRef.current?.focus();
  };

  const moveLabels = (direction) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({
      left: direction * Math.max(120, list.clientWidth * 0.75),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <div className="modal-labels-row">
      <span className="modal-labels-heading">Labels</span>
      <div className="modal-labels-scroll">
        {navigation.hasOverflow && (
          <button
            type="button"
            className="modal-label-nav"
            aria-label="Show previous labels"
            disabled={!navigation.canGoBack}
            onClick={() => moveLabels(-1)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        <div
          ref={listRef}
          className="labels-active-list"
          role="list"
          aria-label="Snippet labels"
          tabIndex={navigation.hasOverflow ? 0 : -1}
          onScroll={updateNavigation}
        >
          {labels.length === 0 && <span className="modal-labels-empty">No labels yet</span>}
          {labels.map((label) => (
            <span key={label} className="label-chip" role="listitem">
              <span className="label-chip-text" title={label}>#{label}</span>
              <button
                type="button"
                className="label-chip-remove"
                onClick={() => onRemove(label)}
                disabled={disabled}
                aria-label={`Remove label ${label}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {navigation.hasOverflow && (
          <button
            type="button"
            className="modal-label-nav"
            aria-label="Show next labels"
            disabled={!navigation.canGoForward}
            onClick={() => moveLabels(1)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}
      </div>
      <div ref={inputBoxRef} className="modal-label-add-box">
        <input
          ref={inputRef}
          type="text"
          className="modal-label-input"
          placeholder="Add label…"
          aria-label="Find or create a label"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isPickerOpen && !disabled}
          aria-controls={isPickerOpen && !disabled ? listboxId : undefined}
          aria-activedescendant={isPickerOpen && options.length ? `${listboxId}-${highlightedOption}` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={inputValue}
          onFocus={() => setIsPickerOpen(true)}
          onChange={(event) => {
            onInputChange(event.target.value);
            setActiveOption(0);
            setIsPickerOpen(true);
          }}
          onBlur={(event) => {
            if (!pickerRef.current?.contains(event.relatedTarget)) setIsPickerOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.metaKey || event.ctrlKey) return;
            if (event.key === "Escape" && isPickerOpen) {
              event.preventDefault();
              event.stopPropagation();
              setIsPickerOpen(false);
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setIsPickerOpen(true);
              if (options.length) {
                setActiveOption((highlightedOption + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
              }
            } else if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              if (options.length && isPickerOpen) selectLabel(options[highlightedOption].label);
              else if (cleanQuery) selectLabel(cleanQuery);
            }
          }}
        />
      </div>
      {isPickerOpen && !disabled && createPortal(
        <div
          ref={pickerRef}
          className="label-picker"
          style={pickerPosition}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              inputRef.current?.focus();
              setIsPickerOpen(false);
            }
          }}
        >
          <div id={listboxId} role="listbox" aria-label="Label suggestions">
            {matches.length > 0 && <p className="label-picker-heading">Existing labels</p>}
            {options.map((option, index) => (
              <button
                key={option.label}
                id={`${listboxId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === highlightedOption}
                className={`label-picker-option ${index === highlightedOption ? "is-highlighted" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectLabel(option.label)}
              >
                <span className="label-picker-option-icon" aria-hidden="true">{option.isNew ? "+" : "#"}</span>
                <span className="label-picker-option-text">{option.isNew ? `Create label “${option.label}”` : option.label}</span>
                {!option.isNew && <span className="label-picker-option-action">Add</span>}
              </button>
            ))}
            {options.length === 0 && (
              <p className="label-picker-empty">
                {cleanQuery && selectedNames.has(cleanQuery.toLowerCase())
                  ? "This label is already added."
                  : "Type a name to create a label."}
              </p>
            )}
          </div>
          <p className="label-picker-hint">Search for a label or type a new name.</p>
        </div>, inputBoxRef.current?.closest(".modal-backdrop") || document.body
      )}
    </div>
  );
}
