const express = require("express");
const cors = require("cors");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Database Setup ───────────────────────────────────────────────────────────
const dataDir = path.join(__dirname, "data");
const fs = require("fs");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "namjap.db"));

// Enable WAL mode for better concurrent performance
db.pragma("journal_mode = WAL");

// Create table if it doesn't exist (same schema as the Flask version)
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    date      TEXT    NOT NULL UNIQUE,
    count     INTEGER NOT NULL DEFAULT 0,
    notes     TEXT    DEFAULT '',
    created_at TEXT   NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT   NOT NULL DEFAULT (datetime('now'))
  )
`);

// ─── Helper: today's date as ISO string (YYYY-MM-DD) ─────────────────────────
function todayISO() {
  const now = new Date();
  // Use local date so it matches the user's day
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET /api/today — get or create today's log
app.get("/api/today", (req, res) => {
  const today = todayISO();
  let row = db.prepare("SELECT * FROM daily_logs WHERE date = ?").get(today);

  if (!row) {
    const stmt = db.prepare(
      "INSERT INTO daily_logs (date, count, notes) VALUES (?, 0, '')"
    );
    const info = stmt.run(today);
    row = db.prepare("SELECT * FROM daily_logs WHERE id = ?").get(info.lastInsertRowid);
  }

  res.json(formatRow(row));
});

// POST /api/log — create or update a log
app.post("/api/log", (req, res) => {
  const { count = 0, notes = "", date: logDate } = req.body;
  const targetDate = logDate || todayISO();

  let row = db.prepare("SELECT * FROM daily_logs WHERE date = ?").get(targetDate);

  if (row) {
    db.prepare(
      "UPDATE daily_logs SET count = ?, notes = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(count, notes, row.id);
    row = db.prepare("SELECT * FROM daily_logs WHERE id = ?").get(row.id);
  } else {
    const info = db.prepare(
      "INSERT INTO daily_logs (date, count, notes) VALUES (?, ?, ?)"
    ).run(targetDate, count, notes);
    row = db.prepare("SELECT * FROM daily_logs WHERE id = ?").get(info.lastInsertRowid);
  }

  res.json(formatRow(row));
});

// GET /api/logs — get all logs (optional ?start=&end= filters)
app.get("/api/logs", (req, res) => {
  const { start, end } = req.query;
  let sql = "SELECT * FROM daily_logs WHERE 1=1";
  const params = [];

  if (start) {
    sql += " AND date >= ?";
    params.push(start);
  }
  if (end) {
    sql += " AND date <= ?";
    params.push(end);
  }

  sql += " ORDER BY date DESC";
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(formatRow));
});

// PUT /api/log/:id — update a specific log
app.put("/api/log/:id", (req, res) => {
  const { id } = req.params;
  const row = db.prepare("SELECT * FROM daily_logs WHERE id = ?").get(id);

  if (!row) {
    return res.status(404).json({ error: "Not found" });
  }

  const { count, notes } = req.body;
  if (count !== undefined) {
    db.prepare("UPDATE daily_logs SET count = ?, updated_at = datetime('now') WHERE id = ?").run(
      count,
      id
    );
  }
  if (notes !== undefined) {
    db.prepare("UPDATE daily_logs SET notes = ?, updated_at = datetime('now') WHERE id = ?").run(
      notes,
      id
    );
  }

  const updated = db.prepare("SELECT * FROM daily_logs WHERE id = ?").get(id);
  res.json(formatRow(updated));
});

// DELETE /api/log/:id — delete a log
app.delete("/api/log/:id", (req, res) => {
  const { id } = req.params;
  const row = db.prepare("SELECT * FROM daily_logs WHERE id = ?").get(id);

  if (!row) {
    return res.status(404).json({ error: "Not found" });
  }

  db.prepare("DELETE FROM daily_logs WHERE id = ?").run(id);
  res.json({ message: "Deleted", id: Number(id) });
});

// GET /api/stats — aggregate statistics
app.get("/api/stats", (req, res) => {
  const rows = db.prepare("SELECT * FROM daily_logs ORDER BY date DESC").all();

  if (rows.length === 0) {
    return res.json({
      total: 0,
      average: 0,
      max_count: 0,
      max_date: null,
      days_logged: 0,
      current_streak: 0,
    });
  }

  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const daysLogged = rows.length;
  const average = Math.round((total / daysLogged) * 10) / 10;

  // Best day
  const maxRow = rows.reduce((best, r) => (r.count > best.count ? r : best), rows[0]);

  // Current streak — consecutive days ending today
  const today = new Date(todayISO());
  const logDates = new Set(rows.map((r) => r.date));
  let streak = 0;
  let checkDate = new Date(today);

  while (true) {
    const iso = checkDate.toISOString().slice(0, 10);
    if (logDates.has(iso)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  res.json({
    total,
    average,
    max_count: maxRow.count,
    max_date: maxRow.date,
    days_logged: daysLogged,
    current_streak: streak,
  });
});

// ─── Serve React Frontend (production build) ─────────────────────────────────
const distPath = path.join(__dirname, "frontend", "dist");
app.use(express.static(distPath));

// Catch-all: serve index.html for any non-API route (SPA routing)
app.get("*", (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).json({
      error: "Frontend not built yet. Run: npm run build",
    });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🕉️  NamJap server running on http://localhost:${PORT}`);
});

// ─── Utility ──────────────────────────────────────────────────────────────────
function formatRow(row) {
  return {
    id: row.id,
    date: row.date,
    count: row.count,
    notes: row.notes || "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
