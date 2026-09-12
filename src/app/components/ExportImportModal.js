"use client";

import React, { useRef, useState } from "react";
import Modal from "./Modal";
import { exportSnippetsToJSON, importSnippetsFromJSON } from "../../lib/storage";

export default function ExportImportModal({ isOpen, onClose, onImportSuccess, totalSnippets }) {
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  const handleExport = () => {
    exportSnippetsToJSON();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus(null);
    try {
      const snippets = await importSnippetsFromJSON(file);
      setImportStatus({ type: "success", message: `Successfully restored ${snippets.length} snippets!` });
      if (onImportSuccess) {
        onImportSuccess(snippets);
      }
      setTimeout(() => {
        onClose();
        setImportStatus(null);
      }, 1800);
    } catch (err) {
      setImportStatus({ type: "error", message: err.message || "Failed to parse backup file." });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Modal show={isOpen} onClose={onClose}>
      <div className="export-import-modal-content">
        <div className="modal-header-row">
          <h2 className="modal-heading">Data Backup & Restore</h2>
          <button type="button" className="icon-close-btn" onClick={onClose} aria-label="Close backup modal">
            ✕
          </button>
        </div>
        <p className="modal-subheading">
          All your snippets are saved locally on your device with zero cloud tracking. Keep backups or transfer your library between browsers.
        </p>

        <div className="backup-sections">
          {/* Export card */}
          <div className="backup-card">
            <div className="backup-card-info">
              <h3 className="backup-card-title">Export All Snippets</h3>
              <p className="backup-card-desc">
                Download your entire library ({totalSnippets} snippets) as a standard JSON backup file.
              </p>
            </div>
            <button type="button" className="primary-action" onClick={handleExport}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download Backup (JSON)</span>
            </button>
          </div>

          {/* Import card */}
          <div className="backup-card">
            <div className="backup-card-info">
              <h3 className="backup-card-title">Restore from Backup</h3>
              <p className="backup-card-desc">
                Upload a previously exported `.json` file to restore your snippets.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="ghost-button"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>{importing ? "Importing..." : "Choose File to Restore"}</span>
              </button>
            </div>
          </div>
        </div>

        {importStatus && (
          <div className={`backup-status-banner status-${importStatus.type}`}>
            {importStatus.message}
          </div>
        )}

        <div className="modal-footer-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

