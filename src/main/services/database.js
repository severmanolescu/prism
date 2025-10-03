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

  console.log('Data directory path:', dataDir);
  console.log('Database path:', dbPath);

  // Create data directory if it doesn't exist
  try {
    if (!fs.existsSync(dataDir)) {
      console.log('Data directory does not exist, creating...');
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('Data directory created successfully');
    } else {
      console.log('Data directory exists, checking if it is a directory...');
      // Check if it's actually a directory and not a file
      const stats = fs.statSync(dataDir);
      if (!stats.isDirectory()) {
        console.log('Data path is a file, not a directory. Removing and creating directory...');
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

  console.log('Creating database at:', dbPath);
  db = new Database(dbPath);
  console.log('Database created successfully');

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

  // Run migrations for productivity levels
  migrateProductivityLevels();

  console.log('Database initialized successfully');
  return db;
}

function migrateFromJSON() {
  console.log('Starting migration from JSON to SQLite...');

  const isDev = !app.isPackaged;
  const dataDir = isDev
    ? path.join(__dirname, '../../../data')
    : path.join(app.getPath('userData'), 'data');
  const appsFile = path.join(dataDir, 'apps.json');
  const sessionsFile = path.join(dataDir, 'sessions.json');
  const categoriesFile = path.join(dataDir, 'categories.json');
  const favoritesFile = path.join(dataDir, 'favorites.json');
  const blacklistFile = path.join(dataDir, 'blacklist.json');

  db.exec('BEGIN TRANSACTION');

  try {
    // Migrate categories first
    if (fs.existsSync(categoriesFile)) {
      const categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO categories (id, name, color, icon, is_default, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const cat of categories) {
        stmt.run(
          cat.id,
          cat.name,
          cat.color || '#092442',
          cat.icon || '📁',
          cat.isDefault ? 1 : 0,
          cat.createdAt ? new Date(cat.createdAt).getTime() : Date.now()
        );
      }
      console.log(`Migrated ${categories.length} categories`);
    }

    // Migrate apps
    if (fs.existsSync(appsFile)) {
      const apps = JSON.parse(fs.readFileSync(appsFile, 'utf8'));
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO apps
        (id, name, path, executable, category, icon_path, hidden, first_used, last_used, total_time, launch_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let appCount = 0;
      for (const [id, app] of Object.entries(apps)) {
        stmt.run(
          id,
          app.name,
          app.path || null,
          app.executable || null,
          app.category || 'Uncategorized',
          app.iconPath || null,
          app.hidden ? 1 : 0,
          app.firstUsed ? new Date(app.firstUsed).getTime() : null,
          app.lastUsed ? new Date(app.lastUsed).getTime() : null,
          app.totalTime || 0,
          app.launchCount || 0
        );
        appCount++;
      }
      console.log(`Migrated ${appCount} apps`);
    }

    // Migrate sessions
    if (fs.existsSync(sessionsFile)) {
      const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO sessions (id, app_id, start_time, end_time, duration)
        VALUES (?, ?, ?, ?, ?)
      `);

      let sessionCount = 0;
      for (const session of sessions) {
        const startTime = typeof session.startTime === 'string'
          ? new Date(session.startTime).getTime()
          : session.startTime;

        const endTime = session.endTime
          ? (typeof session.endTime === 'string'
              ? new Date(session.endTime).getTime()
              : session.endTime)
          : null;

        stmt.run(
          session.id,
          session.appId,
          startTime,
          endTime,
          session.duration || 0
        );
        sessionCount++;
      }
      console.log(`Migrated ${sessionCount} sessions`);
    }

    // Migrate favorites
    if (fs.existsSync(favoritesFile)) {
      const favorites = JSON.parse(fs.readFileSync(favoritesFile, 'utf8'));
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO favorites (app_id) VALUES (?)
      `);

      for (const appId of favorites) {
        stmt.run(appId);
      }
      console.log(`Migrated ${favorites.length} favorites`);
    }

    // Migrate blacklist
    if (fs.existsSync(blacklistFile)) {
      const blacklist = JSON.parse(fs.readFileSync(blacklistFile, 'utf8'));
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO blacklist (id, name, path, executable, blacklisted_at, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of blacklist) {
        stmt.run(
          item.id || `blacklist_${Date.now()}`,
          item.name,
          item.path,
          item.executable,
          item.blacklistedAt ? new Date(item.blacklistedAt).getTime() : Date.now(),
          item.reason || 'user_removed_permanently'
        );
      }
      console.log(`Migrated ${blacklist.length} blacklisted items`);
    }

    db.exec('COMMIT');
    console.log('Migration completed successfully!');

    // Backup JSON files
    const backupDir = path.join(dataDir, 'json_backup_' + Date.now());
    fs.mkdirSync(backupDir, { recursive: true });
    
    if (fs.existsSync(appsFile)) fs.renameSync(appsFile, path.join(backupDir, 'apps.json'));
    if (fs.existsSync(sessionsFile)) fs.renameSync(sessionsFile, path.join(backupDir, 'sessions.json'));
    if (fs.existsSync(categoriesFile)) fs.renameSync(categoriesFile, path.join(backupDir, 'categories.json'));
    if (fs.existsSync(favoritesFile)) fs.renameSync(favoritesFile, path.join(backupDir, 'favorites.json'));
    if (fs.existsSync(blacklistFile)) fs.renameSync(blacklistFile, path.join(backupDir, 'blacklist.json'));
    
    console.log(`JSON files backed up to: ${backupDir}`);

  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  }
}

// Check if migration is needed
function checkMigration() {
  const isDev = !app.isPackaged;
  const dataDir = isDev
    ? path.join(__dirname, '../../../data')
    : path.join(app.getPath('userData'), 'data');
  const appsFile = path.join(dataDir, 'apps.json');
  const dbFile = path.join(dataDir, 'tracker.db');

  // If database doesn't exist but JSON files do, run migration
  if (!fs.existsSync(dbFile) && fs.existsSync(appsFile)) {
    migrateFromJSON();
  }
}

// Migration for adding productivity level columns
function migrateProductivityLevels() {
  try {
    // Check if columns already exist
    const categoriesInfo = db.pragma('table_info(categories)');
    const appsInfo = db.pragma('table_info(apps)');

    const hasProductivityInCategories = categoriesInfo.some(col => col.name === 'productivity_level');
    const hasProductivityInApps = appsInfo.some(col => col.name === 'productivity_level_override');

    // Add productivity_level to categories if it doesn't exist
    if (!hasProductivityInCategories) {
      db.exec(`
        ALTER TABLE categories ADD COLUMN productivity_level TEXT DEFAULT 'neutral';
      `);
      console.log('Added productivity_level column to categories table');
    }

    // Add productivity_level_override to apps if it doesn't exist
    if (!hasProductivityInApps) {
      db.exec(`
        ALTER TABLE apps ADD COLUMN productivity_level_override TEXT;
      `);
      console.log('Added productivity_level_override column to apps table');
    }
  } catch (error) {
    console.error('Error migrating productivity levels:', error);
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

module.exports = {
  initDatabase,
  migrateFromJSON,
  checkMigration,
  getDb
};
