import { useState } from "react";

export default function History({ logs, onEdit, onDelete }) {
  const [editingLog, setEditingLog] = useState(null);
  const [editCount, setEditCount] = useState(0);
  const [editNotes, setEditNotes] = useState("");

  const openEdit = (log) => {
    setEditingLog(log);
    setEditCount(log.count);
    setEditNotes(log.notes || "");
  };

  const closeEdit = () => {
    setEditingLog(null);
  };

  const handleSaveEdit = async () => {
    await onEdit(editingLog.id, { count: parseInt(editCount, 10), notes: editNotes });
    closeEdit();
  };

  const handleDelete = async (log) => {
    if (window.confirm(`Delete the entry for ${formatDate(log.date)}?`)) {
      await onDelete(log.id);
    }
  };

  if (!logs) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📭</div>
        <div className="empty-state__text">No logs yet. Start counting!</div>
      </div>
    );
  }

  return (
    <div className="history-section">
      <div className="history-header">
        <h3 className="history-title">📋 Log History</h3>
        <span className="history-count">{logs.length} entries</span>
      </div>

      <div className="glass-card history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Count</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="date-cell">{formatDate(log.date)}</td>
                <td className="count-cell">{log.count.toLocaleString()}</td>
                <td className="notes-cell" title={log.notes}>
                  {log.notes || "—"}
                </td>
                <td>
                  <div className="action-btns">
                    <button
                      className="action-btn"
                      onClick={() => openEdit(log)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="action-btn action-btn--danger"
                      onClick={() => handleDelete(log)}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingLog && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">
              Edit — {formatDate(editingLog.date)}
            </h3>
            <div className="modal-field">
              <label className="modal-label">Count</label>
              <input
                type="number"
                className="modal-input"
                value={editCount}
                onChange={(e) => setEditCount(e.target.value)}
                min="0"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Notes</label>
              <input
                type="text"
                className="modal-input"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional note..."
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn--cancel" onClick={closeEdit}>
                Cancel
              </button>
              <button className="modal-btn modal-btn--save" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Format an ISO date string to a friendly display.
 */
function formatDate(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";

  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
