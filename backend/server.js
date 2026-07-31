import express from "express";
import cors from "cors";
import { insertEvents, queryEvents, getStats } from "./db.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// --- API -------------------------------------------------------------

app.post("/events/bulk", (req, res) => {
  const { events } = req.body || {};
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: "events[] required" });
  }
  try {
    insertEvents(events);
    res.json({ ok: true, inserted: events.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "insert failed" });
  }
});

app.get("/api/events", (req, res) => {
  const { limit, type, sessionId } = req.query;
  res.json(queryEvents({ limit: limit ? Number(limit) : undefined, type, sessionId }));
});

app.get("/api/stats", (req, res) => {
  res.json(getStats());
});

// --- Minimal dashboard -------------------------------------------------

app.get("/", (req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Activity Agent Dashboard</title>
<style>
  body { font-family: -apple-system, sans-serif; margin: 0; padding: 24px; background: #fafafa; color: #1f2328; }
  h1 { font-size: 20px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0 24px; }
  .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
  .card .num { font-size: 24px; font-weight: 700; }
  .card .label { font-size: 12px; color: #666; }
  table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  th, td { text-align: left; padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
  th { background: #f7f7f8; }
  code { background: #f0f0f0; padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
  <h1>Visual AI Activity Agent — Dashboard</h1>
  <div class="grid" id="stats"></div>
  <h3>Recent events</h3>
  <table>
    <thead><tr><th>Time</th><th>Type</th><th>URL</th><th>Tab</th></tr></thead>
    <tbody id="rows"></tbody>
  </table>
  <script>
    async function load() {
      const [stats, events] = await Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/events?limit=100').then(r => r.json())
      ]);
      document.getElementById('stats').innerHTML = \`
        <div class="card"><div class="num">\${stats.totalEvents}</div><div class="label">Total events</div></div>
        <div class="card"><div class="num">\${stats.totalSessions}</div><div class="label">Sessions</div></div>
        <div class="card"><div class="num">\${stats.byType.length}</div><div class="label">Event types</div></div>
      \`;
      document.getElementById('rows').innerHTML = events.map(e => \`
        <tr>
          <td>\${new Date(e.ts).toLocaleTimeString()}</td>
          <td><code>\${e.type}</code></td>
          <td>\${(e.url || '').slice(0, 80)}</td>
          <td>\${e.tab_id ?? ''}</td>
        </tr>
      \`).join('');
    }
    load();
    setInterval(load, 5000);
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`Activity Agent backend listening on http://localhost:${PORT}`);
});
