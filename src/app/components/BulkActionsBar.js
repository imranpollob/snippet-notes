"use client";

export default function BulkActionsBar({ count, hiddenCount, allShownSelected, visibleCount, onSelectAll, onClear, onLabel, onDelete }) {
  return (
    <div className="bulk-actions-bar" role="region" aria-label="Bulk snippet actions">
      <div className="bulk-selection-summary">
        <span className="bulk-selection-count" role="status">
          {count} selected{hiddenCount > 0 && <span className="bulk-hidden-count"> · {hiddenCount} hidden by filters</span>}
        </span>
        <span className="bulk-selection-links">
          <button type="button" onClick={onSelectAll} disabled={!visibleCount}>
            {allShownSelected ? "Deselect all shown" : "Select all shown"}
          </button>
          {count > 0 && <button type="button" onClick={onClear}>Clear selection</button>}
        </span>
      </div>
      <div className="bulk-action-buttons">
        <button type="button" className="ghost-button" onClick={onLabel} disabled={!count}>
          <span aria-hidden="true">#</span> Add label
        </button>
        <button type="button" className="danger-button" onClick={onDelete} disabled={!count}>
          Delete selected
        </button>
      </div>
    </div>
  );
}
