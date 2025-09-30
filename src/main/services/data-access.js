const { getDb } = require('./database');

// Get all apps (excluding hidden if specified)
async function getAllApps(includeHidden = false) {
  const db = getDb();
  const query = includeHidden 
    ? 'SELECT * FROM apps ORDER BY last_used DESC'
    : 'SELECT * FROM apps WHERE hidden = 0 ORDER BY last_used DESC';
  
  return await db.all(query);
}

// Get recent apps (most recently used)
async function getRecentApps(limit = 20) {
  const db = getDb();
  return await db.all(`
    SELECT * FROM apps 
    WHERE hidden = 0 AND last_used IS NOT NULL
    ORDER BY last_used DESC 
    LIMIT ?
  `, limit);
}

// Get apps by category
async function getAppsByCategory(category) {
  const db = getDb();
  return await db.all(`
    SELECT * FROM apps 
    WHERE category = ? AND hidden = 0
    ORDER BY total_time DESC 
  `, category);
}

// Get hidden apps
async function getHiddenApps() {
  const db = getDb();
  return await db.all('SELECT * FROM apps WHERE hidden = 1 ORDER BY name');
}

// Get app by ID
async function getAppById(appId) {
  const db = getDb();
  return await db.get('SELECT * FROM apps WHERE id = ?', appId);
}

// Hide an app
async function hideApp(appId) {
  const db = getDb();
  return await db.run('UPDATE apps SET hidden = 1 WHERE id = ?', appId);
}

// Restore a hidden app
async function restoreApp(appId) {
  const db = getDb();
  return await db.run('UPDATE apps SET hidden = 0 WHERE id = ?', appId);
}

// Delete app and all its sessions
async function deleteAppAndSessions(appId) {
  const db = getDb();
  await db.run('DELETE FROM sessions WHERE app_id = ?', appId);
  await db.run('DELETE FROM apps WHERE id = ?', appId);
}

// Add to blacklist
async function addToBlacklist(blacklistEntry) {
  const db = getDb();
  const { name, path, executable, reason } = blacklistEntry;
  
  return await db.run(`
    INSERT INTO blacklist (name, path, executable, reason, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [name, path, executable, reason, Date.now()]);
}

// Check if app is blacklisted
async function isBlacklisted(executable) {
  const db = getDb();
  const result = await db.get(
    'SELECT * FROM blacklist WHERE executable = ?',
    executable
  );
  return !!result;
}

// Get all categories
async function getAllCategories() {
  const db = getDb();
  return await db.all('SELECT * FROM categories ORDER BY name');
}

// Create category
async function createCategory(category) {
  const db = getDb();
  const { id, name, color, icon } = category;
  
  return await db.run(`
    INSERT INTO categories (id, name, color, icon, is_default, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `, [id, name, color, icon, Date.now()]);
}

// Update category
async function updateCategory(categoryId, updates) {
  const db = getDb();
  const { name, color, icon } = updates;
  
  return await db.run(`
    UPDATE categories 
    SET name = COALESCE(?, name),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon)
    WHERE id = ?
  `, [name, color, icon, categoryId]);
}

// Delete category (moves apps to uncategorized)
async function deleteCategory(categoryId) {
  const db = getDb();
  
  // Move apps to uncategorized
  await db.run(
    'UPDATE apps SET category = ? WHERE category = ?',
    ['uncategorized', categoryId]
  );
  
  // Delete category
  return await db.run(
    'DELETE FROM categories WHERE id = ? AND is_default = 0',
    categoryId
  );
}

// Move app to category
async function moveAppToCategory(appId, categoryId) {
  const db = getDb();
  return await db.run(
    'UPDATE apps SET category = ? WHERE id = ?',
    [categoryId, appId]
  );
}

// Get favorites
async function getFavorites() {
  const db = getDb();
  return await db.all(`
    SELECT a.* FROM apps a
    INNER JOIN favorites f ON a.id = f.app_id
    ORDER BY f.added_at DESC
  `);
}

// Add to favorites
async function addFavorite(appId) {
  const db = getDb();
  return await db.run(`
    INSERT OR IGNORE INTO favorites (app_id, added_at)
    VALUES (?, ?)
  `, [appId, Date.now()]);
}

// Remove from favorites
async function removeFavorite(appId) {
  const db = getDb();
  return await db.run('DELETE FROM favorites WHERE app_id = ?', appId);
}

// Get stats for a specific time range
async function getStatsForRange(startTime, endTime) {
  const db = getDb();
  
  return await db.all(`
    SELECT 
      a.id,
      a.name,
      a.category,
      SUM(s.duration) as total_time,
      COUNT(s.id) as session_count
    FROM apps a
    LEFT JOIN sessions s ON a.id = s.app_id
    WHERE s.start_time >= ? AND s.start_time <= ?
    GROUP BY a.id
    ORDER BY total_time DESC
  `, [startTime, endTime]);
}

// Get daily stats
async function getDailyStats(days = 7) {
  const db = getDb();
  const now = Date.now();
  const startTime = now - (days * 24 * 60 * 60 * 1000);
  
  return await db.all(`
    SELECT 
      DATE(start_time/1000, 'unixepoch') as date,
      SUM(duration) as total_time,
      COUNT(*) as session_count
    FROM sessions
    WHERE start_time >= ?
    GROUP BY date
    ORDER BY date DESC
  `, startTime);
}

// Get today's stats
async function getTodayStats() {
  const db = getDb();
  
  // Get start and end of today (midnight to midnight)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + (24 * 60 * 60 * 1000); // Add 24 hours
  
  // Count apps used today
  const appsToday = await db.get(`
    SELECT COUNT(DISTINCT app_id) as count
    FROM sessions
    WHERE start_time >= ? AND start_time < ?
  `, [startOfToday, endOfToday]);
  
  // Total time today - only count sessions that both started AND ended today
  const timeToday = await db.get(`
    SELECT SUM(duration) as total
    FROM sessions
    WHERE start_time >= ? 
      AND start_time < ?
      AND end_time IS NOT NULL
      AND duration > 0
      AND duration < 86400000
  `, [startOfToday, endOfToday]);
  
  return {
    appCount: appsToday.count || 0,
    totalTime: timeToday.total || 0
  };
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
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  moveAppToCategory,
  getFavorites,
  addFavorite,
  removeFavorite,
  getStatsForRange,
  getDailyStats,
  getTodayStats
};