"use client";

import React, { useEffect, useState } from "react";
import Modal from "./Modal";

export default function ManageLabelsModal({ isOpen, onClose, labels, labelCounts, onRename, onDelete }) {
  const [editingName, setEditingName] = useState(null);
  const [draft, setDraft] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setEditingName(null);
      setDraft("");
      setConfirmingDelete(null);
      setBusy(false);
      setError(null);
    }
  }, [isOpen]);

  const startRename = (label) => {
    setEditingName(label);
    setDraft(label);
    setConfirmingDelete(null);
    setError(null);
  };

  const cancelRename = () => {
    setEditingName(null);
    setDraft("");
    setError(null);
  };

  const saveRename = async () => {
    const clean = draft.trim().replace(/^#+/, "");
    if (!clean) {
      setError("Label name cannot be empty.");
      return;
    }
    if (clean.toLowerCase() === editingName.toLowerCase()) {
      cancelRename();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onRename(editingName, clean);
      setEditingName(null);
      setDraft("");
    } catch (err) {
      setError(err?.message || "Failed to rename label.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async (label) => {
    setBusy(true);
    setError(null);
    try {
      await onDelete(label);
      setConfirmingDelete(null);
    } catch (err) {
      setError(err?.message || "Failed to delete label.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={isOpen} onClose={onClose} maxWidth="560px">
      <div className="manage-labels-content">
        <div className="modal-header-row">
          <h2 className="modal-heading">Manage Labels</h2>
          <button type="button" className="icon-close-btn" onClick={onClose} aria-label="Close manage labels">
            ✕
          </button>
        </div>
        <p className="modal-subheading">
          Renaming or deleting a label applies to every snippet that uses it.
        </p>

        {labels.length === 0 ? (
          <p className="manage-labels-empty">No labels yet. Add labels while creating or editing a snippet.</p>
        ) : (
          <div className="manage-labels-list">
            {labels.map((label) => (
              <div key={label} className="manage-label-row">
                {editingName === label ? (
                  <div className="manage-label-rename-box">
                    <input
                      type="text"
                      className="manage-label-input"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveRename();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelRename();
                        }
                      }}
                      disabled={busy}
                      autoFocus
                    />
                    <button type="button" className="primary-action" onClick={saveRename} disabled={busy}>
                      Save
                    </button>
                    <button type="button" className="ghost-button" onClick={cancelRename} disabled={busy}>
                      Cancel
                    </button>
                  </div>
                ) : confirmingDelete === label ? (
                  <div className="manage-label-delete-box">
                    <span className="delete-confirm-text">
                      Remove &ldquo;{label}&rdquo; from {labelCounts[label] || 0} snippet{(labelCounts[label] || 0) === 1 ? "" : "s"}?
                    </span>
                    <button type="button" className="danger-button" onClick={() => confirmDelete(label)} disabled={busy}>
                      Yes, delete
                    </button>
                    <button type="button" className="ghost-button" onClick={() => setConfirmingDelete(null)} disabled={busy}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="manage-label-name">#{label}</span>
                    <span className="manage-label-count">
                      {labelCounts[label] || 0} snippet{(labelCounts[label] || 0) === 1 ? "" : "s"}
                    </span>
                    <span className="manage-label-actions">
                      <button type="button" className="ghost-button" onClick={() => startRename(label)} disabled={busy}>
                        Rename
                      </button>
                      <button type="button" className="danger-button" onClick={() => setConfirmingDelete(label)} disabled={busy}>
                        Delete
                      </button>
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {error && <div className="backup-status-banner status-error">{error}</div>}

        <div className="modal-footer-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
