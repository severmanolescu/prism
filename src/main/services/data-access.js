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

// Get analytics data for a given period
async function getAnalyticsData(startDate, endDate) {
  const db = getDb();
  const startTime = new Date(startDate).setHours(0, 0, 0, 0);
  const endTime = new Date(endDate).setHours(23, 59, 59, 999);

  // Get overall stats
  const overallStats = await db.get(`
    SELECT
      COUNT(DISTINCT app_id) as unique_apps,
      COUNT(*) as total_sessions,
      SUM(duration) as total_time,
      AVG(duration) as avg_session_duration
    FROM sessions
    WHERE start_time >= ? AND start_time <= ?
      AND end_time IS NOT NULL
      AND duration > 0
  `, [startTime, endTime]);

  // Get daily breakdown
  const dailyBreakdown = await db.all(`
    SELECT
      DATE(start_time/1000, 'unixepoch', 'localtime') as date,
      SUM(duration) as total_time,
      COUNT(*) as session_count,
      COUNT(DISTINCT app_id) as app_count
    FROM sessions
    WHERE start_time >= ? AND start_time <= ?
      AND end_time IS NOT NULL
      AND duration > 0
    GROUP BY date
    ORDER BY date ASC
  `, [startTime, endTime]);

  // Get top applications
  const topApps = await db.all(`
    SELECT
      a.id,
      a.name,
      a.category,
      a.icon_path,
      SUM(s.duration) as total_time,
      COUNT(s.id) as session_count
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
    GROUP BY a.id
    ORDER BY total_time DESC
  `, [startTime, endTime]);

  // Get category breakdown
  const categoryBreakdown = await db.all(`
    SELECT
      a.category,
      SUM(s.duration) as total_time,
      COUNT(DISTINCT a.id) as app_count,
      COUNT(s.id) as session_count
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
    GROUP BY a.category
    ORDER BY total_time DESC
  `, [startTime, endTime]);

  // Get most/least active days
  const mostActiveDay = await db.get(`
    SELECT
      DATE(start_time/1000, 'unixepoch', 'localtime') as date,
      SUM(duration) as total_time
    FROM sessions
    WHERE start_time >= ? AND start_time <= ?
      AND end_time IS NOT NULL
      AND duration > 0
    GROUP BY date
    ORDER BY total_time DESC
    LIMIT 1
  `, [startTime, endTime]);

  const leastActiveDay = await db.get(`
    SELECT
      DATE(start_time/1000, 'unixepoch', 'localtime') as date,
      SUM(duration) as total_time
    FROM sessions
    WHERE start_time >= ? AND start_time <= ?
      AND end_time IS NOT NULL
      AND duration > 0
    GROUP BY date
    ORDER BY total_time ASC
    LIMIT 1
  `, [startTime, endTime]);

  // Get longest session (Focus Time)
  const longestSession = await db.get(`
    SELECT
      a.name as app_name,
      s.duration,
      s.start_time
    FROM sessions s
    INNER JOIN apps a ON s.app_id = a.id
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
    ORDER BY s.duration DESC
    LIMIT 1
  `, [startTime, endTime]);

  // Get hourly breakdown (Time of Day Pattern)
  const hourlyBreakdown = await db.all(`
    SELECT
      CAST(strftime('%H', datetime(start_time/1000, 'unixepoch', 'localtime')) AS INTEGER) as hour,
      SUM(duration) as total_time,
      COUNT(*) as session_count
    FROM sessions
    WHERE start_time >= ? AND start_time <= ?
      AND end_time IS NOT NULL
      AND duration > 0
    GROUP BY hour
    ORDER BY hour ASC
  `, [startTime, endTime]);

  // Get overlapping sessions for multitasking analysis
  const overlappingSessions = await db.all(`
    SELECT
      DATE(s1.start_time/1000, 'unixepoch', 'localtime') as date,
      COUNT(DISTINCT s2.id) as overlapping_count
    FROM sessions s1
    INNER JOIN sessions s2 ON
      s1.id != s2.id AND
      s1.start_time < s2.end_time AND
      s1.end_time > s2.start_time AND
      DATE(s1.start_time/1000, 'unixepoch', 'localtime') = DATE(s2.start_time/1000, 'unixepoch', 'localtime')
    WHERE s1.start_time >= ? AND s1.start_time <= ?
      AND s1.end_time IS NOT NULL
      AND s2.end_time IS NOT NULL
      AND s1.duration > 0
      AND s2.duration > 0
    GROUP BY date
  `, [startTime, endTime]);

  return {
    overallStats: {
      totalTime: overallStats.total_time || 0,
      uniqueApps: overallStats.unique_apps || 0,
      totalSessions: overallStats.total_sessions || 0,
      avgSessionDuration: overallStats.avg_session_duration || 0
    },
    dailyBreakdown,
    topApps,
    categoryBreakdown,
    mostActiveDay,
    leastActiveDay,
    longestSession,
    hourlyBreakdown,
    overlappingSessions,
    dateRange: {
      start: startDate,
      end: endDate,
      days: Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24))
    }
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
  getTodayStats,
  getAnalyticsData
};