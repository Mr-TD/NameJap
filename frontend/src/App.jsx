import { useState, useEffect, useCallback } from "react";
import "./index.css";
import {
  fetchToday,
  fetchLogs,
  fetchStats,
  saveLog,
  updateLog,
  deleteLog,
} from "./api";

export default function App() {
  const [inputValue, setInputValue] = useState("");
  const [todayLog, setTodayLog] = useState(null);
  const [logs, setLogs] = useState(null);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  // Edit modal state
  const [editingLog, setEditingLog] = useState(null);
  const [editCount, setEditCount] = useState(0);
  const [editNotes, setEditNotes] = useState("");

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [todayData, logsData, statsData] = await Promise.all([
        fetchToday(),
        fetchLogs(),
        fetchStats(),
      ]);
      setTodayLog(todayData);
      setLogs(logsData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load data:", err);
      showToast("Failed to connect to server", "error");
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add number to today's count
  const handleAdd = async () => {
    const num = parseInt(inputValue, 10);
    if (isNaN(num) || num <= 0) {
      showToast("Enter a valid number", "error");
      return;
    }

    setSaving(true);
    try {
      const newCount = (todayLog?.count || 0) + num;
      const saved = await saveLog({ count: newCount });
      setTodayLog(saved);
      setInputValue("");
      showToast(`+${num} added — Today's total: ${newCount}`);
      const [logsData, statsData] = await Promise.all([fetchLogs(), fetchStats()]);
      setLogs(logsData);
      setStats(statsData);
    } catch (err) {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleAdd();
  };

  // Edit
  const openEdit = (log) => {
    setEditingLog(log);
    setEditCount(log.count);
    setEditNotes(log.notes || "");
  };
  const closeEdit = () => setEditingLog(null);
  const handleSaveEdit = async () => {
    await updateLog(editingLog.id, { count: parseInt(editCount, 10), notes: editNotes });
    showToast("✏️ Entry updated");
    closeEdit();
    await loadData();
  };
  const handleDelete = async (log) => {
    if (window.confirm(`Delete entry for ${formatDate(log.date)}?`)) {
      await deleteLog(log.id);
      showToast("🗑️ Deleted");
      await loadData();
    }
  };

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="app-container">
      {/* ─── Header ─── */}
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__icon">📿</div>
          <div>
            <h1 className="app-header__title">NamJap</h1>
            <p className="app-header__subtitle">Daily Counter Tracker</p>
          </div>
        </div>
        <div className="app-header__date">{todayStr}</div>
      </header>

      {/* ─── Log Input (TOP) ─── */}
      <section className="log-section glass-card glass-card--glow">
        <div className="log-section__label">Add today's count</div>
        <div className="log-section__row">
          <input
            type="number"
            className="log-input"
            placeholder="Enter number..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            min="1"
            autoFocus
          />
          <button
            className="log-btn"
            onClick={handleAdd}
            disabled={saving || !inputValue}
          >
            {saving ? "Saving..." : "+ Add"}
          </button>
        </div>
        {todayLog && todayLog.count > 0 && (
          <div className="log-section__today">
            Today so far: <span className="log-section__today-num">{todayLog.count.toLocaleString()}</span>
          </div>
        )}
      </section>

      {/* ─── Metrics (MIDDLE) ─── */}
      {stats && (
        <section className="metrics-grid">
          <div className="metric-card metric-card--hero">
            <div className="metric-card__label">Total Count</div>
            <div className="metric-card__value metric-card__value--big">{stats.total.toLocaleString()}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card__icon">📅</div>
            <div className="metric-card__value">{stats.days_logged}</div>
            <div className="metric-card__label">Days Logged</div>
          </div>
          <div className="metric-card">
            <div className="metric-card__icon">📊</div>
            <div className="metric-card__value">{stats.average}</div>
            <div className="metric-card__label">Daily Average</div>
          </div>
          <div className="metric-card">
            <div className="metric-card__icon">🏆</div>
            <div className="metric-card__value">{stats.max_count.toLocaleString()}</div>
            <div className="metric-card__label">Best Day</div>
          </div>
          <div className="metric-card">
            <div className="metric-card__icon">🔥</div>
            <div className="metric-card__value">{stats.current_streak}</div>
            <div className="metric-card__label">Streak</div>
          </div>
        </section>
      )}

      {/* ─── History (BOTTOM) ─── */}
      <section className="history-section">
        <div className="history-header">
          <h2 className="history-title">📋 Log History</h2>
          {logs && <span className="history-count">{logs.length} entries</span>}
        </div>

        {logs && logs.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">📭</div>
            <div className="empty-state__text">No logs yet. Add your first count above!</div>
          </div>
        )}

        {logs && logs.length > 0 && (
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
                    <td className="notes-cell" title={log.notes}>{log.notes || "—"}</td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn" onClick={() => openEdit(log)}>✏️ Edit</button>
                        <button className="action-btn action-btn--danger" onClick={() => handleDelete(log)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── Edit Modal ─── */}
      {editingLog && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit — {formatDate(editingLog.date)}</h3>
            <div className="modal-field">
              <label className="modal-label">Count</label>
              <input type="number" className="modal-input" value={editCount} onChange={(e) => setEditCount(e.target.value)} min="0" />
            </div>
            <div className="modal-field">
              <label className="modal-label">Notes</label>
              <input type="text" className="modal-input" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional note..." />
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn--cancel" onClick={closeEdit}>Cancel</button>
              <button className="modal-btn modal-btn--save" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast ─── */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

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
