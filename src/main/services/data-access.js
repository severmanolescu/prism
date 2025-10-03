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
  const { id, name, color, icon, productivityLevel } = category;

  return await db.run(`
    INSERT INTO categories (id, name, color, icon, productivity_level, is_default, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `, [id, name, color, icon, productivityLevel || 'neutral', Date.now()]);
}

// Update category
async function updateCategory(categoryId, updates) {
  const db = getDb();
  const { name, color, icon, productivityLevel } = updates;

  return await db.run(`
    UPDATE categories
    SET name = COALESCE(?, name),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        productivity_level = COALESCE(?, productivity_level)
    WHERE id = ?
  `, [name, color, icon, productivityLevel, categoryId]);
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
      CASE
        WHEN LOWER(a.category) = 'uncategorized' THEN 'Uncategorized'
        ELSE a.category
      END as category,
      SUM(s.duration) as total_time,
      COUNT(DISTINCT a.id) as app_count,
      COUNT(s.id) as session_count
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
    GROUP BY LOWER(a.category)
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
    dateRange: {
      start: startDate,
      end: endDate,
      days: Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24))
    }
  };
}

// Get hourly breakdown per app (for heatmap) - separate function for async loading
async function getHourlyAppBreakdown(startDate, endDate) {
  const db = getDb();
  const startTime = new Date(startDate).setHours(0, 0, 0, 0);
  const endTime = new Date(endDate).setHours(23, 59, 59, 999);

  return await db.all(`
    SELECT
      a.id,
      a.name,
      a.category,
      CAST(strftime('%H', datetime(s.start_time/1000, 'unixepoch', 'localtime')) AS INTEGER) as hour,
      SUM(s.duration) as total_time
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
    GROUP BY a.id, hour
    ORDER BY a.id, hour ASC
  `, [startTime, endTime]);
}

// =====================
// Productivity Functions
// =====================

// Set productivity level for a category
async function setCategoryProductivityLevel(categoryId, level) {
  const db = getDb();
  const validLevels = ['productive', 'neutral', 'unproductive'];

  if (!validLevels.includes(level)) {
    throw new Error(`Invalid productivity level: ${level}`);
  }

  return await db.run(`
    UPDATE categories
    SET productivity_level = ?
    WHERE id = ?
  `, [level, categoryId]);
}

// Get productivity level for a category
async function getCategoryProductivityLevel(categoryId) {
  const db = getDb();
  const result = await db.get(`
    SELECT productivity_level
    FROM categories
    WHERE id = ?
  `, [categoryId]);

  return result ? result.productivity_level : 'neutral';
}

// Set productivity level override for an app
async function setAppProductivityOverride(appId, level) {
  const db = getDb();
  const validLevels = ['productive', 'neutral', 'unproductive'];

  if (level !== null && !validLevels.includes(level)) {
    throw new Error(`Invalid productivity level: ${level}`);
  }

  const result = await db.run(`
    UPDATE apps
    SET productivity_level_override = ?
    WHERE id = ?
  `, [level, appId]);

  // Verify the update
  const app = await db.get('SELECT productivity_level_override FROM apps WHERE id = ?', [appId]);

  return result;
}

// Get effective productivity level for an app (override or category default)
async function getAppProductivityLevel(appId) {
  const db = getDb();
  const result = await db.get(`
    SELECT
      a.productivity_level_override,
      c.productivity_level as category_level
    FROM apps a
    LEFT JOIN categories c ON a.category = c.name
    WHERE a.id = ?
  `, [appId]);

  if (!result) {
    return 'neutral';
  }

  // Use override if set, otherwise use category level
  return result.productivity_level_override || result.category_level || 'neutral';
}

// Get productivity stats for a date range
async function getProductivityStats(startDate, endDate) {
  const db = getDb();
  const startTime = new Date(startDate).setHours(0, 0, 0, 0);
  const endTime = new Date(endDate).setHours(23, 59, 59, 999);

  // Get total time per productivity level
  const breakdown = await db.all(`
    SELECT
      COALESCE(a.productivity_level_override, c.productivity_level, 'neutral') as productivity_level,
      SUM(s.duration) as total_time,
      COUNT(DISTINCT a.id) as app_count,
      COUNT(s.id) as session_count
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    LEFT JOIN categories c ON a.category = c.name
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
    GROUP BY productivity_level
  `, [startTime, endTime]);

  // Calculate overall stats
  const totalTime = breakdown.reduce((sum, item) => sum + item.total_time, 0);

  const productive = breakdown.find(b => b.productivity_level === 'productive') || { total_time: 0, app_count: 0, session_count: 0 };
  const neutral = breakdown.find(b => b.productivity_level === 'neutral') || { total_time: 0, app_count: 0, session_count: 0 };
  const unproductive = breakdown.find(b => b.productivity_level === 'unproductive') || { total_time: 0, app_count: 0, session_count: 0 };

  // Calculate productivity score (0-100)
  const score = totalTime > 0
    ? Math.round((productive.total_time * 100 + neutral.total_time * 50) / totalTime)
    : 0;

  // Get top productive and unproductive apps
  const topProductive = await db.all(`
    SELECT
      a.id,
      a.name,
      a.category,
      SUM(s.duration) as total_time,
      COUNT(s.id) as session_count
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    LEFT JOIN categories c ON a.category = c.name
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
      AND COALESCE(a.productivity_level_override, c.productivity_level, 'neutral') = 'productive'
    GROUP BY a.id
    ORDER BY total_time DESC
    LIMIT 10
  `, [startTime, endTime]);

  const topUnproductive = await db.all(`
    SELECT
      a.id,
      a.name,
      a.category,
      SUM(s.duration) as total_time,
      COUNT(s.id) as session_count
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    LEFT JOIN categories c ON a.category = c.name
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
      AND COALESCE(a.productivity_level_override, c.productivity_level, 'neutral') = 'unproductive'
    GROUP BY a.id
    ORDER BY total_time DESC
    LIMIT 10
  `, [startTime, endTime]);

  // Get daily productivity trend
  const dailyTrend = await db.all(`
    SELECT
      DATE(s.start_time/1000, 'unixepoch', 'localtime') as date,
      SUM(CASE WHEN COALESCE(a.productivity_level_override, c.productivity_level, 'neutral') = 'productive' THEN s.duration ELSE 0 END) as productive_time,
      SUM(CASE WHEN COALESCE(a.productivity_level_override, c.productivity_level, 'neutral') = 'neutral' THEN s.duration ELSE 0 END) as neutral_time,
      SUM(CASE WHEN COALESCE(a.productivity_level_override, c.productivity_level, 'neutral') = 'unproductive' THEN s.duration ELSE 0 END) as unproductive_time,
      SUM(s.duration) as total_time
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    LEFT JOIN categories c ON a.category = c.name
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
    GROUP BY date
    ORDER BY date ASC
  `, [startTime, endTime]);

  // Calculate productivity score for each day
  const dailyScores = dailyTrend.map(day => ({
    date: day.date,
    score: day.total_time > 0
      ? Math.round((day.productive_time * 100 + day.neutral_time * 50) / day.total_time)
      : 0,
    productive_time: day.productive_time,
    neutral_time: day.neutral_time,
    unproductive_time: day.unproductive_time,
    total_time: day.total_time
  }));

  return {
    score,
    breakdown: {
      productive: {
        time: productive.total_time,
        percentage: totalTime > 0 ? Math.round((productive.total_time / totalTime) * 100) : 0,
        apps: productive.app_count,
        sessions: productive.session_count
      },
      neutral: {
        time: neutral.total_time,
        percentage: totalTime > 0 ? Math.round((neutral.total_time / totalTime) * 100) : 0,
        apps: neutral.app_count,
        sessions: neutral.session_count
      },
      unproductive: {
        time: unproductive.total_time,
        percentage: totalTime > 0 ? Math.round((unproductive.total_time / totalTime) * 100) : 0,
        apps: unproductive.app_count,
        sessions: unproductive.session_count
      }
    },
    totalTime,
    topProductive,
    topUnproductive,
    dailyScores
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
  getAnalyticsData,
  getHourlyAppBreakdown,
  setCategoryProductivityLevel,
  getCategoryProductivityLevel,
  setAppProductivityOverride,
  getAppProductivityLevel,
  getProductivityStats
};