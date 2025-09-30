const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

let db = null;

async function initDatabase() {
  const dbPath = path.join(__dirname, '../../../data/tracker.db');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON');

  // Create tables
  await db.exec(`
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

async function migrateFromJSON() {
  console.log('Starting migration from JSON to SQLite...');
  
  const dataDir = path.join(__dirname, '../../../data');
  const appsFile = path.join(dataDir, 'apps.json');
  const sessionsFile = path.join(dataDir, 'sessions.json');
  const categoriesFile = path.join(dataDir, 'categories.json');
  const favoritesFile = path.join(dataDir, 'favorites.json');
  const blacklistFile = path.join(dataDir, 'blacklist.json');

  await db.exec('BEGIN TRANSACTION');

  try {
    // Migrate categories first
    if (fs.existsSync(categoriesFile)) {
      const categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
      for (const cat of categories) {
        await db.run(`
          INSERT OR IGNORE INTO categories (id, name, color, icon, is_default, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          cat.id,
          cat.name,
          cat.color || '#092442',
          cat.icon || '📁',
          cat.isDefault ? 1 : 0,
          cat.createdAt ? new Date(cat.createdAt).getTime() : Date.now()
        ]);
      }
      console.log(`Migrated ${categories.length} categories`);
    }

    // Migrate apps
    if (fs.existsSync(appsFile)) {
      const apps = JSON.parse(fs.readFileSync(appsFile, 'utf8'));
      let appCount = 0;
      
      for (const [id, app] of Object.entries(apps)) {
        await db.run(`
          INSERT OR REPLACE INTO apps 
          (id, name, path, executable, category, icon_path, hidden, first_used, last_used, total_time, launch_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
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
        ]);
        appCount++;
      }
      console.log(`Migrated ${appCount} apps`);
    }

    // Migrate sessions
    if (fs.existsSync(sessionsFile)) {
      const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
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

        await db.run(`
          INSERT OR IGNORE INTO sessions (id, app_id, start_time, end_time, duration)
          VALUES (?, ?, ?, ?, ?)
        `, [
          session.id,
          session.appId,
          startTime,
          endTime,
          session.duration || 0
        ]);
        sessionCount++;
      }
      console.log(`Migrated ${sessionCount} sessions`);
    }

    // Migrate favorites
    if (fs.existsSync(favoritesFile)) {
      const favorites = JSON.parse(fs.readFileSync(favoritesFile, 'utf8'));
      for (const appId of favorites) {
        await db.run(`
          INSERT OR IGNORE INTO favorites (app_id) VALUES (?)
        `, [appId]);
      }
      console.log(`Migrated ${favorites.length} favorites`);
    }

    // Migrate blacklist
    if (fs.existsSync(blacklistFile)) {
      const blacklist = JSON.parse(fs.readFileSync(blacklistFile, 'utf8'));
      for (const item of blacklist) {
        await db.run(`
          INSERT OR IGNORE INTO blacklist (id, name, path, executable, blacklisted_at, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          item.id || `blacklist_${Date.now()}`,
          item.name,
          item.path,
          item.executable,
          item.blacklistedAt ? new Date(item.blacklistedAt).getTime() : Date.now(),
          item.reason || 'user_removed_permanently'
        ]);
      }
      console.log(`Migrated ${blacklist.length} blacklisted items`);
    }

    await db.exec('COMMIT');
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
    await db.exec('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  }
}

// Check if migration is needed
async function checkMigration() {
  const dataDir = path.join(__dirname, '../../../data');
  const appsFile = path.join(dataDir, 'apps.json');
  const dbFile = path.join(dataDir, 'tracker.db');

  // If database doesn't exist but JSON files do, run migration
  if (!fs.existsSync(dbFile) && fs.existsSync(appsFile)) {
    await migrateFromJSON();
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
