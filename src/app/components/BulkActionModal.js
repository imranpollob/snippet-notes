"use client";

import { useId } from "react";
import Modal from "./Modal";

export default function BulkActionModal({ action, snippets, availableLabels, label, onLabelChange, busy, error, onClose, onConfirm }) {
  const labelOptionsId = useId();
  const isDelete = action === "delete";
  const count = snippets.length;
  const close = () => { if (!busy) onClose(); };

  return (
    <Modal show={Boolean(action)} onClose={close} maxWidth="520px" ariaLabel={isDelete ? "Delete selected snippets" : "Add label to selected snippets"}>
      <form className="bulk-action-modal" onSubmit={(event) => { event.preventDefault(); onConfirm(); }}>
        <div className="modal-header-row">
          <h2 className="modal-heading">{isDelete ? `Delete ${count} snippet${count === 1 ? "" : "s"}?` : "Add a label"}</h2>
          <button type="button" className="icon-close-btn" onClick={close} disabled={busy} aria-label="Close bulk action">✕</button>
        </div>
        <p className="modal-subheading">
          {isDelete
            ? "These snippets will be permanently deleted. This cannot be undone."
            : `Attach a label to ${count} selected snippet${count === 1 ? "" : "s"}. Existing labels will be kept.`}
        </p>
        <ul className="bulk-snippet-preview">
          {snippets.slice(0, 4).map((snippet) => (
            <li key={snippet.id}>{snippet.title || snippet.data?.split("\n")[0]?.slice(0, 80) || "Untitled snippet"}</li>
          ))}
          {count > 4 && <li className="bulk-preview-more">and {count - 4} more</li>}
        </ul>
        {!isDelete && (
          <label className="bulk-label-field">
            Label name
            <input
              type="text"
              list={labelOptionsId}
              placeholder="Choose an existing label or type a new one"
              value={label}
              onChange={(event) => onLabelChange(event.target.value)}
              disabled={busy}
              data-autofocus="true"
              autoComplete="off"
            />
            <datalist id={labelOptionsId}>{availableLabels.map((name) => <option key={name} value={name} />)}</datalist>
          </label>
        )}
        {error && <p className="bulk-action-error" role="alert">{error}</p>}
        <div className="modal-footer-actions">
          <button type="button" className="ghost-button" onClick={close} disabled={busy} data-autofocus={isDelete ? "true" : undefined}>Cancel</button>
          <button type="submit" className={isDelete ? "danger-button" : "primary-action"} disabled={busy || !count || (!isDelete && !label.trim().replace(/^#+/, "").trim())}>
            {busy ? (isDelete ? "Deleting…" : "Adding label…") : (isDelete ? `Delete ${count} snippet${count === 1 ? "" : "s"}` : "Add label")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
