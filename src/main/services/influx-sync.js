/**
 * Automatic sync of completed sessions to InfluxDB 2.x.
 *
 * Configured via <dataDir>/influx.json (a disabled template is created on first run).
 * - Each session is pushed shortly after it ends.
 * - On startup and every `intervalSeconds`, any sessions not yet synced are pushed
 *   (covers the Pi / Tailscale being offline, or the app closing before a push finished).
 * Progress is stored in the `sync_state` table, so nothing is sent twice or skipped.
 *
 * App metadata: every app's CURRENT category, productivity level and category colour is also sent as
 * `app_meta` (one series per app, string fields), whenever it changes. Session points keep the category
 * they had when they were synced; readers (the Pi dashboard) use the latest app_meta instead, so
 * recategorising an app in Prism also applies to its history.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { app } = require('electron');
const { getDb } = require('./database');

const BATCH = 5000;
const DEBOUNCE_MS = 2000;
const STATE_KEY = 'influx_last_session_id';
const META_KEY = 'influx_app_meta_signature';

const DEFAULT_CONFIG = {
  enabled: false,
  url: 'http://raspberrypi:8086',
  token: '',
  org: '',
  bucket: 'prism',
  host: os.hostname(),
  intervalSeconds: 60,
};

let config = null;
let timer = null;
let debounce = null;
let running = false;
let pending = false;
let lastError = null;

function getConfigPath() {
  const dataDir = app.isPackaged
    ? path.join(app.getPath('userData'), 'data')
    : path.join(__dirname, '../../../data');
  return path.join(dataDir, 'influx.json');
}

function log(msg) {
  const line = `[${new Date().toISOString()}] [influx-sync] ${msg}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(path.join(app.getPath('userData'), 'tracking-log.txt'), line);
  } catch { /* ignore */ }
}

function loadConfig() {
  const file = getConfigPath();
  if (!fs.existsSync(file)) {
    try {
      fs.writeFileSync(file, JSON.stringify(DEFAULT_CONFIG, null, 2));
      log(`Created config template at ${file} (disabled)`);
    } catch (e) {
      log(`Could not create config template: ${e.message}`);
    }
    return { ...DEFAULT_CONFIG };
  }
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (e) {
    log(`Invalid ${file}: ${e.message}`);
    return { ...DEFAULT_CONFIG, enabled: false };
  }
}

// Line protocol tag escaping; empty tag values are not allowed
function tag(v) {
  const s = String(v ?? '').trim();
  return (s || 'unknown').replace(/[,= \\]/g, (c) => '\\' + c);
}

// Line protocol string field value
function str(v) {
  return '"' + String(v ?? '').replace(/[\\"]/g, (c) => '\\' + c) + '"';
}

function getLastId(db) {
  const row = db.prepare('SELECT value FROM sync_state WHERE key = ?').get(STATE_KEY);
  return row ? Number(row.value) : 0;
}

function setLastId(db, id) {
  db.prepare(`
    INSERT INTO sync_state (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(STATE_KEY, String(id));
}

async function writeLines(lines) {
  const url = `${config.url.replace(/\/$/, '')}/api/v2/write` +
    `?org=${encodeURIComponent(config.org)}&bucket=${encodeURIComponent(config.bucket)}&precision=ms`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${config.token}`,
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: lines.join('\n'),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

// Push every app's current category / productivity / colour when anything changed since the last push
async function syncAppMeta(db) {
  const rows = db.prepare(`
    SELECT a.name AS app, a.category AS category,
           COALESCE(a.productivity_level_override, c.productivity_level, 'neutral') AS productivity,
           COALESCE(c.color, '') AS color
    FROM apps a
    LEFT JOIN categories c ON c.name = a.category OR c.id = a.category
    ORDER BY a.name
  `).all();
  if (!rows.length) return;
  const signature = JSON.stringify(rows);
  const prev = db.prepare('SELECT value FROM sync_state WHERE key = ?').get(META_KEY);
  if (prev && prev.value === signature) return;
  const now = Date.now();
  const lines = rows.map((r) =>
    `app_meta,host=${tag(config.host)},app=${tag(r.app)}` +
    ` category=${str(r.category || 'Uncategorized')},productivity=${str(r.productivity)},color=${str(r.color)} ${now}`
  );
  for (let i = 0; i < lines.length; i += BATCH) await writeLines(lines.slice(i, i + BATCH));
  db.prepare(`
    INSERT INTO sync_state (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(META_KEY, signature);
  log(`Synced app metadata (${rows.length} apps)`);
}

async function syncNow() {
  if (!config || !config.enabled) return;
  if (running) { pending = true; return; }
  const db = getDb();
  if (!db) return;

  running = true;
  try {
    await syncAppMeta(db);
    const stmt = db.prepare(`
      SELECT s.id, s.start_time, s.duration,
             a.name AS app, a.category AS category,
             COALESCE(a.productivity_level_override, c.productivity_level, 'neutral') AS productivity
      FROM sessions s
      JOIN apps a ON a.id = s.app_id
      LEFT JOIN categories c ON c.name = a.category OR c.id = a.category
      WHERE s.id > ? AND s.end_time IS NOT NULL
      ORDER BY s.id
      LIMIT ?
    `);

    let lastId = getLastId(db);
    let total = 0;
    for (;;) {
      const rows = stmt.all(lastId, BATCH);
      if (!rows.length) break;
      const lines = rows.map((r) =>
        `app_session,host=${tag(config.host)},app=${tag(r.app)},category=${tag(r.category)},productivity=${tag(r.productivity)}` +
        ` duration_s=${(r.duration || 0) / 1000},session_id=${r.id}i ${r.start_time}`
      );
      await writeLines(lines);
      lastId = rows[rows.length - 1].id;
      setLastId(db, lastId);
      total += rows.length;
    }
    if (lastError) log('Connection restored');
    lastError = null;
    if (total > 1) log(`Synced ${total} sessions (last id ${lastId})`);
  } catch (e) {
    const msg = e.cause?.message || e.message;
    if (msg !== lastError) log(`Sync failed, will retry: ${msg}`); // log each distinct error once
    lastError = msg;
  } finally {
    running = false;
    if (pending) { pending = false; requestSync(); }
  }
}

// Called when a session ends; debounced so rapid app switching batches up
function requestSync() {
  if (!config || !config.enabled) return;
  clearTimeout(debounce);
  debounce = setTimeout(syncNow, DEBOUNCE_MS);
}

function startInfluxSync() {
  config = loadConfig();
  const db = getDb();
  db.exec('CREATE TABLE IF NOT EXISTS sync_state (key TEXT PRIMARY KEY, value TEXT)');

  if (!config.enabled) {
    log(`Disabled. Edit ${getConfigPath()} to enable.`);
    return;
  }
  if (!config.token || !config.org) {
    log('Enabled but token/org missing in influx.json; not starting');
    config.enabled = false;
    return;
  }

  log(`Enabled -> ${config.url} (bucket "${config.bucket}")`);
  syncNow();
  timer = setInterval(syncNow, Math.max(10, config.intervalSeconds) * 1000);
}

function stopInfluxSync() {
  clearInterval(timer);
  clearTimeout(debounce);
  timer = debounce = null;
}

module.exports = { startInfluxSync, stopInfluxSync, requestSync, syncNow };
