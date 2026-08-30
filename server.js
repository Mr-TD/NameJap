const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Database Setup ───────────────────────────────────────────────────────────
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, "namjap.db");
let db; // sql.js Database instance

async function initDB() {
  const SQL = await initSqlJs();

  // Load existing database if it exists, otherwise create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create table if it doesn't exist (same schema as the Flask version)
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT    NOT NULL UNIQUE,
      count      INTEGER NOT NULL DEFAULT 0,
      notes      TEXT    DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  saveDB();
}

// Persist database to disk
function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// ─── Helper: today's date as ISO string (YYYY-MM-DD) ─────────────────────────
function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Helper: run a query and return all rows as objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run a query and return first row as object (or null)
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET /api/today — get or create today's log
app.get("/api/today", (req, res) => {
  const today = todayISO();
  let row = queryOne("SELECT * FROM daily_logs WHERE date = ?", [today]);

  if (!row) {
    db.run("INSERT INTO daily_logs (date, count, notes) VALUES (?, 0, '')", [today]);
    saveDB();
    row = queryOne("SELECT * FROM daily_logs WHERE date = ?", [today]);
  }

  res.json(formatRow(row));
});

// POST /api/log — create or update a log
app.post("/api/log", (req, res) => {
  const { count = 0, notes = "", date: logDate } = req.body;
  const targetDate = logDate || todayISO();

  let row = queryOne("SELECT * FROM daily_logs WHERE date = ?", [targetDate]);

  if (row) {
    db.run(
      "UPDATE daily_logs SET count = ?, notes = ?, updated_at = datetime('now') WHERE id = ?",
      [count, notes, row.id]
    );
  } else {
    db.run(
      "INSERT INTO daily_logs (date, count, notes) VALUES (?, ?, ?)",
      [targetDate, count, notes]
    );
  }

  saveDB();
  row = queryOne("SELECT * FROM daily_logs WHERE date = ?", [targetDate]);
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
  const rows = queryAll(sql, params);
  res.json(rows.map(formatRow));
});

// PUT /api/log/:id — update a specific log
app.put("/api/log/:id", (req, res) => {
  const { id } = req.params;
  const row = queryOne("SELECT * FROM daily_logs WHERE id = ?", [Number(id)]);

  if (!row) {
    return res.status(404).json({ error: "Not found" });
  }

  const { count, notes } = req.body;
  if (count !== undefined) {
    db.run(
      "UPDATE daily_logs SET count = ?, updated_at = datetime('now') WHERE id = ?",
      [count, Number(id)]
    );
  }
  if (notes !== undefined) {
    db.run(
      "UPDATE daily_logs SET notes = ?, updated_at = datetime('now') WHERE id = ?",
      [notes, Number(id)]
    );
  }

  saveDB();
  const updated = queryOne("SELECT * FROM daily_logs WHERE id = ?", [Number(id)]);
  res.json(formatRow(updated));
});

// DELETE /api/log/:id — delete a log
app.delete("/api/log/:id", (req, res) => {
  const { id } = req.params;
  const row = queryOne("SELECT * FROM daily_logs WHERE id = ?", [Number(id)]);

  if (!row) {
    return res.status(404).json({ error: "Not found" });
  }

  db.run("DELETE FROM daily_logs WHERE id = ?", [Number(id)]);
  saveDB();
  res.json({ message: "Deleted", id: Number(id) });
});

// GET /api/stats — aggregate statistics
app.get("/api/stats", (req, res) => {
  const rows = queryAll("SELECT * FROM daily_logs ORDER BY date DESC");

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
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🕉️  NamJap server running on http://localhost:${PORT}`);
  });
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
