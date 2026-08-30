const API_BASE = "/api";

/**
 * Fetch today's log entry (creates one if it doesn't exist).
 */
export async function fetchToday() {
  const res = await fetch(`${API_BASE}/today`);
  if (!res.ok) throw new Error("Failed to fetch today's entry");
  return res.json();
}

/**
 * Save (create or update) a log entry.
 */
export async function saveLog({ count, notes = "", date = null }) {
  const body = { count, notes };
  if (date) body.date = date;

  const res = await fetch(`${API_BASE}/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to save log");
  return res.json();
}

/**
 * Fetch all log entries.
 */
export async function fetchLogs({ start, end } = {}) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const qs = params.toString() ? `?${params}` : "";

  const res = await fetch(`${API_BASE}/logs${qs}`);
  if (!res.ok) throw new Error("Failed to fetch logs");
  return res.json();
}

/**
 * Fetch aggregate stats.
 */
export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

/**
 * Update an existing log entry.
 */
export async function updateLog(id, { count, notes }) {
  const res = await fetch(`${API_BASE}/log/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count, notes }),
  });
  if (!res.ok) throw new Error("Failed to update log");
  return res.json();
}

/**
 * Delete a log entry.
 */
export async function deleteLog(id) {
  const res = await fetch(`${API_BASE}/log/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete log");
  return res.json();
}
