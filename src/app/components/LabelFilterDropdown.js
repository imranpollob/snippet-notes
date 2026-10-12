"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

const LabelFilterDropdown = ({ value, labels, labelCounts = {}, totalCount = 0, onChange }) => {
  const listRef = useRef(null);
  const [navigation, setNavigation] = useState({
    hasOverflow: false,
    canGoBack: false,
    canGoForward: false,
  });

  const options = ["", ...(Array.isArray(labels) ? labels : [])];
  const selectedLabel = value || "";

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
  }, [labels, labelCounts, updateNavigation]);

  // Keep the selected chip visible when the selection changes
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-checked="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedLabel]);

  const moveLabels = (direction) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({
      left: direction * Math.max(120, list.clientWidth * 0.75),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const handleKeyDown = (event) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const items = [...listRef.current.querySelectorAll('[role="radio"]')];
    const index = items.indexOf(document.activeElement);
    const next = items[(index + offset + items.length) % items.length];
    next?.focus();
    next?.click();
  };

  return (
    <div className="label-filter-dropdown modal-labels-scroll">
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
        role="radiogroup"
        aria-label="Filter by label"
        onScroll={updateNavigation}
        onKeyDown={handleKeyDown}
      >
        {options.map((label) => {
          const isSelected = label === selectedLabel;
          const count = label === "" ? totalCount : (labelCounts[label] || 0);
          const text = label === "" ? "All" : `#${label}`;
          return (
            <button
              key={label === "" ? "__all__" : label}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className={`label-filter-chip ${isSelected ? "selected" : ""}`}
              title={text}
              onClick={() => {
                if (!isSelected) onChange(label);
              }}
            >
              <span className="label-chip-text">{text}</span>
              {count > 0 && (
                <span className="filter-count-badge" aria-hidden="true">
                  {count}
                </span>
              )}
            </button>
          );
        })}
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
  );
};

export default LabelFilterDropdown;
