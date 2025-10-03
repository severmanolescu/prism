const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

async function initDatabase() {
  // Use userData directory in production, or project data directory in development
  const isDev = !app.isPackaged;
  const dataDir = isDev
    ? path.join(__dirname, '../../../data')
    : path.join(app.getPath('userData'), 'data');
  const dbPath = path.join(dataDir, 'tracker.db');

  // Create data directory if it doesn't exist
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    } else {
      // Check if it's actually a directory and not a file
      const stats = fs.statSync(dataDir);
      if (!stats.isDirectory()) {
        // If it's a file, remove it and create directory
        fs.unlinkSync(dataDir);
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Directory created successfully after removing file');
      } else {
        console.log('Data directory is valid');
      }
    }
  } catch (err) {
    console.error('Error creating data directory:', err);
    throw new Error(`Failed to create data directory: ${err.message}`);
  }

  db = new Database(dbPath);

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT,
      executable TEXT,
      category TEXT DEFAULT 'Uncategorized',
      icon_path TEXT,
      hidden INTEGER DEFAULT 0,
      first_used INTEGER,
      last_used INTEGER,
      total_time INTEGER DEFAULT 0,
      launch_count INTEGER DEFAULT 0,
      productivity_level_override TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER DEFAULT 0,
      FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT,
      icon TEXT,
      productivity_level TEXT DEFAULT 'neutral',
      is_default INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      app_id TEXT PRIMARY KEY,
      added_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blacklist (
      id TEXT PRIMARY KEY,
      name TEXT,
      path TEXT,
      executable TEXT,
      blacklisted_at INTEGER,
      reason TEXT
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_sessions_app_id ON sessions(app_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_sessions_app_date ON sessions(app_id, start_time);
    CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
    CREATE INDEX IF NOT EXISTS idx_apps_hidden ON apps(hidden);
  `);

  console.log('Database initialized successfully');
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

module.exports = {
  initDatabase,
  getDb
};
