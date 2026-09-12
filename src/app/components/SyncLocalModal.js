"use client";

import React from "react";
import Modal from "./Modal";

export default function SyncLocalModal({
  isOpen,
  onClose,
  localSnippets = [],
  onSync,
  onDiscard,
  isSyncing = false,
  userEmail = "",
}) {
  const count = localSnippets.length;

  return (
    <Modal show={isOpen} onClose={onClose} maxWidth="520px">
      <div className="sync-modal-content">
        <div className="modal-header-row">
          <div className="sync-modal-title-group">
            <div className="sync-modal-icon-badge" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                <polyline points="12 13 12 7 9 10" />
                <polyline points="12 7 15 10" />
              </svg>
            </div>
            <div>
              <h2 className="modal-heading">Sync Local Snippets</h2>
              <p className="sync-modal-user-subtitle">
                Account: <span>{userEmail || "Google Account"}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-close-btn"
            onClick={onClose}
            aria-label="Close sync modal"
            disabled={isSyncing}
          >
            ✕
          </button>
        </div>

        <p className="modal-subheading">
          You created <strong>{count} {count === 1 ? "snippet" : "snippets"}</strong> on this device while signed out.
          Choose how you want to handle these local snippets:
        </p>

        {/* Snippet Preview List */}
        <div className="sync-preview-container">
          <div className="sync-preview-header">
            <span>Local Snippets to Process ({count})</span>
          </div>
          <div className="sync-preview-list">
            {localSnippets.map((snippet) => (
              <div key={snippet.id} className="sync-preview-item">
                <div className="sync-preview-item-info">
                  <span className="sync-preview-title">{snippet.title || "Untitled Snippet"}</span>
                  <span className="sync-preview-meta">
                    {snippet.createdAt
                      ? new Date(snippet.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                      : "Recently added"}
                  </span>
                </div>
                {snippet.language && (
                  <span className="sync-preview-badge">{snippet.language}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="sync-modal-actions">
          <button
            type="button"
            className="sync-btn-upload"
            onClick={onSync}
            onKeyDown={(e) => {
              // Explicit click only: prevent accidental keyboard trigger
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <span className="sync-btn-spinner" aria-hidden="true" />
                <span>Uploading & Merging...</span>
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  <polyline points="12 13 12 7 9 10" />
                  <polyline points="12 7 15 10" />
                </svg>
                <span>Upload & Merge ({count})</span>
              </>
            )}
          </button>

          <div className="sync-modal-secondary-row">
            <button
              type="button"
              className="sync-btn-discard"
              onClick={onDiscard}
              disabled={isSyncing}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Discard Local Notes</span>
            </button>

            <button
              type="button"
              className="sync-btn-later"
              onClick={onClose}
              disabled={isSyncing}
            >
              Decide Later
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

