import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "activity.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL,
    ts INTEGER NOT NULL,
    tab_id INTEGER,
    url TEXT,
    title TEXT,
    payload_json TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);
  CREATE INDEX IF NOT EXISTS idx_events_type ON events (type);
  CREATE INDEX IF NOT EXISTS idx_events_session ON events (session_id);
`);

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO events (id, session_id, type, ts, tab_id, url, title, payload_json)
  VALUES (@id, @sessionId, @type, @ts, @tabId, @url, @title, @payloadJson)
`);

export function insertEvents(events) {
  const tx = db.transaction((rows) => {
    for (const e of rows) {
      insertStmt.run({
        id: e.id,
        sessionId: e.sessionId,
        type: e.type,
        ts: e.ts,
        tabId: e.tabId ?? null,
        url: e.url ?? null,
        title: e.title ?? null,
        payloadJson: JSON.stringify(e),
      });
    }
  });
  tx(events);
}

export function queryEvents({ limit = 200, type, sessionId } = {}) {
  let sql = "SELECT * FROM events";
  const clauses = [];
  const params = {};
  if (type) {
    clauses.push("type = @type");
    params.type = type;
  }
  if (sessionId) {
    clauses.push("session_id = @sessionId");
    params.sessionId = sessionId;
  }
  if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
  sql += " ORDER BY ts DESC LIMIT @limit";
  params.limit = limit;
  return db.prepare(sql).all(params);
}

export function getStats() {
  const totalEvents = db.prepare("SELECT COUNT(*) AS n FROM events").get().n;
  const totalSessions = db
    .prepare("SELECT COUNT(DISTINCT session_id) AS n FROM events")
    .get().n;
  const byType = db
    .prepare("SELECT type, COUNT(*) AS n FROM events GROUP BY type ORDER BY n DESC")
    .all();
  const topUrls = db
    .prepare(
      `SELECT url, COUNT(*) AS n FROM events
       WHERE url IS NOT NULL GROUP BY url ORDER BY n DESC LIMIT 10`
    )
    .all();
  return { totalEvents, totalSessions, byType, topUrls };
}

export default db;
