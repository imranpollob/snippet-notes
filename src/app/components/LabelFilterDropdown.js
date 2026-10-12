"use client";

import React, { useEffect, useRef, useState } from "react";

const LabelFilterDropdown = ({ value, labels, labelCounts = {}, totalCount = 0, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const options = ["", ...(Array.isArray(labels) ? labels : [])];
  const selectedLabel = value || "";
  const selectedCount = selectedLabel === "" ? totalCount : (labelCounts[selectedLabel] || 0);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  // Focus the selected option when the menu opens
  useEffect(() => {
    if (isOpen) {
      menuRef.current?.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  const selectOption = (next) => {
    if (next !== selectedLabel) {
      onChange(next);
    }
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const focusOptionByOffset = (currentTarget, offset) => {
    const items = [...menuRef.current.querySelectorAll('[role="option"]')];
    const index = items.indexOf(currentTarget);
    const next = items[(index + offset + items.length) % items.length];
    next?.focus();
  };

  const handleMenuKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOptionByOffset(event.target, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOptionByOffset(event.target, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      menuRef.current?.querySelector('[role="option"]')?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      const items = menuRef.current?.querySelectorAll('[role="option"]');
      items?.[items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="label-filter-dropdown">
      <button
        ref={triggerRef}
        type="button"
        className="label-filter-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Filter by label"
        title="Filter by label"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
          } else if (event.key === "Escape" && isOpen) {
            setIsOpen(false);
          }
        }}
      >
        <span className="label-filter-trigger-text">
          {selectedLabel === "" ? "All labels" : `#${selectedLabel}`}
        </span>
        {selectedCount > 0 && (
          <span className="filter-count-badge" aria-hidden="true">
            {selectedCount}
          </span>
        )}
        <svg
          className="label-filter-chevron"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="label-filter-menu"
          role="listbox"
          aria-label="Filter by label"
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
        >
          {options.map((label) => {
            const isSelected = label === selectedLabel;
            const count = label === "" ? totalCount : (labelCounts[label] || 0);
            return (
              <button
                key={label === "" ? "__all__" : label}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`label-filter-option ${isSelected ? "selected" : ""}`}
                onClick={() => selectOption(label)}
              >
                <span className="label-filter-option-text">
                  {label === "" ? "All labels" : `#${label}`}
                </span>
                {count > 0 && (
                  <span className="filter-count-badge" aria-hidden="true">
                    {count}
                  </span>
                )}
                <span className="label-filter-check" aria-hidden="true">
                  {isSelected && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LabelFilterDropdown;
