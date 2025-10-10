const { getDb } = require('../database');

// Get all apps (excluding hidden if specified)
function getAllApps(includeHidden = false) {
    const db = getDb();
    const query = includeHidden
        ? 'SELECT * FROM apps ORDER BY last_used DESC'
        : 'SELECT * FROM apps WHERE hidden = 0 ORDER BY last_used DESC';

    return db.prepare(query).all();
}

// Get recent apps (most recently used)
function getRecentApps(limit = 20) {
    const db = getDb();
    return db.prepare(`
    SELECT * FROM apps
    WHERE hidden = 0 AND last_used IS NOT NULL
    ORDER BY last_used DESC
    LIMIT ?
  `).all(limit);
}

// Get apps by category
function getAppsByCategory(category) {
    const db = getDb();
    return db.prepare(`
    SELECT * FROM apps
    WHERE category = ? AND hidden = 0
    ORDER BY total_time DESC
  `).all(category);
}

// Get hidden apps
function getHiddenApps() {
    const db = getDb();
    return db.prepare('SELECT * FROM apps WHERE hidden = 1 ORDER BY name').all();
}

// Get app by ID
function getAppById(appId) {
    const db = getDb();
    return db.prepare('SELECT * FROM apps WHERE id = ?').get(appId);
}

// Hide an app
function hideApp(appId) {
    const db = getDb();
    return db.prepare('UPDATE apps SET hidden = 1 WHERE id = ?').run(appId);
}

// Restore a hidden app
function restoreApp(appId) {
    const db = getDb();
    return db.prepare('UPDATE apps SET hidden = 0 WHERE id = ?').run(appId);
}

// Delete app and all its sessions
function deleteAppAndSessions(appId) {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE app_id = ?').run(appId);
    db.prepare('DELETE FROM apps WHERE id = ?').run(appId);
}

// Add to blacklist
function addToBlacklist(blacklistEntry) {
    const db = getDb();
    const { name, path, executable, reason } = blacklistEntry;

    return db.prepare(`
    INSERT INTO blacklist (name, path, executable, reason, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run([name, path, executable, reason, Date.now()]);
}

// Check if app is blacklisted
function isBlacklisted(executable) {
    const db = getDb();
    const result = db.prepare(
        'SELECT * FROM blacklist WHERE executable = ?'
    ).get(executable);
    return !!result;
}

// Get favorites
function getFavorites() {
    const db = getDb();
    return db.prepare(`
    SELECT a.* FROM apps a
    INNER JOIN favorites f ON a.id = f.app_id
    ORDER BY f.added_at DESC
  `).all();
}

// Add to favorites
function addFavorite(appId) {
    const db = getDb();
    return db.prepare(`
    INSERT OR IGNORE INTO favorites (app_id, added_at)
    VALUES (?, ?)
  `).run([appId, Date.now()]);
}

// Remove from favorites
function removeFavorite(appId) {
    const db = getDb();
    return db.prepare('DELETE FROM favorites WHERE app_id = ?').run(appId);
}

module.exports = {
    getAllApps,
    getRecentApps,
    getAppsByCategory,
    getHiddenApps,
    getAppById,
    hideApp,
    restoreApp,
    deleteAppAndSessions,
    addToBlacklist,
    isBlacklisted,
    getFavorites,
    addFavorite,
    removeFavorite
}