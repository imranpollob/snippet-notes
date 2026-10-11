"use client";

import React from "react";
import Modal from "./Modal";

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? "⌘" : "Ctrl";
  const altKey = isMac ? "⌥" : "Alt";

  const shortcuts = [
    { key: `C  or  ${altKey} + N`, description: "Create a new snippet" },
    { key: `${modKey} + K  or  /`, description: "Focus instant search" },
    { key: `${modKey} + Enter`, description: "Create snippet or finish editing" },
    { key: `${modKey} + Backspace (×2)`, description: "Delete open snippet (arm, then confirm)" },
    { key: "Esc", description: "Cancel delete confirmation, close modal, or clear search" },
    { key: "?", description: "Open keyboard shortcuts reference" },
    { key: "Enter / Space", description: "Open selected snippet from library" },
  ];

  return (
    <Modal show={isOpen} onClose={onClose}>
      <div className="shortcuts-modal-content">
        <div className="modal-header-row">
          <h2 className="modal-heading">Keyboard Shortcuts</h2>
          <button
            type="button"
            className="icon-close-btn"
            onClick={onClose}
            aria-label="Close shortcuts modal"
          >
            ✕
          </button>
        </div>
        <p className="modal-subheading">
          Boost your productivity with browser-safe, power-user keyboard navigation.
        </p>

        <div className="shortcuts-list">
          {shortcuts.map((item, idx) => (
            <div key={idx} className="shortcut-row">
              <span className="shortcut-desc">{item.description}</span>
              <kbd className="shortcut-kbd">{item.key}</kbd>
            </div>
          ))}
        </div>

        <div className="modal-footer-actions">
          <button type="button" className="primary-action" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
}
