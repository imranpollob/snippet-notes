"use client";

import React from "react";
import Modal from "./Modal";

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const shortcuts = [
    { key: "C", description: "Create a new snippet" },
    { key: "Shift + K  or  /", description: "Focus instant search" },
    { key: "Shift + Enter", description: "Create snippet or finish editing" },
    { key: "Shift + Backspace (×2)", description: "Delete open snippet (arm, then confirm)" },
    { key: "Esc", description: "Cancel delete confirmation, close modal, or clear search" },
    { key: "?", description: "Open keyboard shortcuts reference" },
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
