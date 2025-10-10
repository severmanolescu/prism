const { getDb } = require('./database');

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

// Get all categories
function getAllCategories() {
  const db = getDb();
  return db.prepare('SELECT * FROM categories ORDER BY name').all();
}

// Create category
function createCategory(category) {
  const db = getDb();
  const { id, name, color, icon, productivityLevel } = category;

  return db.prepare(`
    INSERT INTO categories (id, name, color, icon, productivity_level, is_default, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run([id, name, color, icon, productivityLevel || 'neutral', Date.now()]);
}

// Update category
function updateCategory(categoryId, updates) {
  const db = getDb();
  const { name, color, icon, productivityLevel, sortPreference } = updates;

  // If name is being changed, we need to update apps table as well
  if (name) {
    // Get the old category name first
    const oldCategory = db.prepare('SELECT name FROM categories WHERE id = ?').get(categoryId);

    if (oldCategory) {
      // Update all apps that reference the old category name
      db.prepare(`
        UPDATE apps
        SET category = ?
        WHERE category = ?
      `).run([name, oldCategory.name]);
    }
  }

  return db.prepare(`
    UPDATE categories
    SET name = COALESCE(?, name),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        productivity_level = COALESCE(?, productivity_level),
        sort_preference = COALESCE(?, sort_preference)
    WHERE id = ?
  `).run([name, color, icon, productivityLevel, sortPreference, categoryId]);
}

// Update category sort preference
function updateCategorySortPreference(categoryName, sortPreference) {
  const db = getDb();
  return db.prepare(`
    UPDATE categories
    SET sort_preference = ?
    WHERE name = ?
  `).run([sortPreference, categoryName]);
}

// Delete category (moves apps to uncategorized)
function deleteCategory(categoryId) {
  const db = getDb();

  // Get the category name first (needed to update apps)
  const category = db.prepare('SELECT name FROM categories WHERE id = ?').get(categoryId);

  if (category) {
    // Move apps to uncategorized using the category name
    db.prepare(
      'UPDATE apps SET category = ? WHERE category = ?'
    ).run(['uncategorized', category.name]);
  }

  // Delete category by id
  return db.prepare(
    'DELETE FROM categories WHERE id = ? AND is_default = 0'
  ).run(categoryId);
}

// Move app to category
function moveAppToCategory(appId, categoryId) {
  const db = getDb();
  return db.prepare(
    'UPDATE apps SET category = ? WHERE id = ?'
  ).run([categoryId, appId]);
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

// Get stats for a specific time range
function getStatsForRange(startTime, endTime) {
  const db = getDb();

  return db.prepare(`
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
  `).all([startTime, endTime]);
}

// Get daily stats
function getDailyStats(days = 7) {
  const db = getDb();
  const now = Date.now();
  const startTime = now - (days * 24 * 60 * 60 * 1000);

  return db.prepare(`
    SELECT
      DATE(start_time/1000, 'unixepoch') as date,
      SUM(duration) as total_time,
      COUNT(*) as session_count
    FROM sessions
    WHERE start_time >= ?
    GROUP BY date
    ORDER BY date DESC
  `).all(startTime);
}

// Get today's stats
function getTodayStats() {
  const db = getDb();

  // Get start and end of today (midnight to midnight)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + (24 * 60 * 60 * 1000); // Add 24 hours

  // Count apps used today
  const appsToday = db.prepare(`
    SELECT COUNT(DISTINCT app_id) as count
    FROM sessions
    WHERE start_time >= ? AND start_time < ?
  `).get([startOfToday, endOfToday]);

  // Total time today - only count sessions that both started AND ended today
  const timeToday = db.prepare(`
    SELECT SUM(duration) as total
    FROM sessions
    WHERE start_time >= ?
      AND start_time < ?
      AND end_time IS NOT NULL
      AND duration > 0
      AND duration < 86400000
  `).get([startOfToday, endOfToday]);

  return {
    appCount: appsToday.count || 0,
    totalTime: timeToday.total || 0
  };
}

// Get analytics data for a given period
function getAnalyticsData(startDate, endDate) {
  const db = getDb();
  const startTime = new Date(startDate).setHours(0, 0, 0, 0);
  const endTime = new Date(endDate).setHours(23, 59, 59, 999);

  // Get overall stats
  const overallStats = db.prepare(`
    SELECT
      COUNT(DISTINCT app_id) as unique_apps,
      COUNT(*) as total_sessions,
      SUM(duration) as total_time,
      AVG(duration) as avg_session_duration
    FROM sessions
    WHERE start_time >= ? AND start_time <= ?
      AND end_time IS NOT NULL
      AND duration > 0
  `).get([startTime, endTime]);

  // Get daily breakdown
  const dailyBreakdown = db.prepare(`
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
  `).all([startTime, endTime]);

  // Get top applications
  const topApps = db.prepare(`
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
      AND a.hidden = 0
    GROUP BY a.id
    ORDER BY total_time DESC
  `).all([startTime, endTime]);

  // Get category breakdown
  const categoryBreakdown = db.prepare(`
    SELECT
      CASE
        WHEN LOWER(a.category) = 'uncategorized' THEN 'Uncategorized'
        ELSE a.category
      END as category,
      c.color as color,
      SUM(s.duration) as total_time,
      COUNT(DISTINCT a.id) as app_count,
      COUNT(s.id) as session_count
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    LEFT JOIN categories c ON a.category = c.name
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
    GROUP BY LOWER(a.category)
    ORDER BY total_time DESC
  `).all([startTime, endTime]);

  // Get most/least active days
  const mostActiveDay = db.prepare(`
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
  `).get([startTime, endTime]);

  const leastActiveDay = db.prepare(`
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
  `).get([startTime, endTime]);

  // Get longest session (Focus Time)
  const longestSession = db.prepare(`
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
  `).get([startTime, endTime]);

  // Get hourly breakdown (Time of Day Pattern)
  const hourlyBreakdown = db.prepare(`
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
  `).all([startTime, endTime]);

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
function getHourlyAppBreakdown(startDate, endDate) {
  const db = getDb();
  const startTime = new Date(startDate).setHours(0, 0, 0, 0);
  const endTime = new Date(endDate).setHours(23, 59, 59, 999);

  return db.prepare(`
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
      AND a.hidden = 0
    GROUP BY a.id, hour
    ORDER BY a.id, hour ASC
  `).all([startTime, endTime]);
}

// =====================
// Productivity Functions
// =====================

// Set productivity level for a category
function setCategoryProductivityLevel(categoryId, level) {
  const db = getDb();
  const validLevels = ['productive', 'neutral', 'unproductive'];

  if (!validLevels.includes(level)) {
    throw new Error(`Invalid productivity level: ${level}`);
  }

  return db.prepare(`
    UPDATE categories
    SET productivity_level = ?
    WHERE id = ?
  `).run([level, categoryId]);
}

// Get productivity level for a category
function getCategoryProductivityLevel(categoryId) {
  const db = getDb();
  const result = db.prepare(`
    SELECT productivity_level
    FROM categories
    WHERE id = ?
  `).get([categoryId]);

  return result ? result.productivity_level : 'neutral';
}

// Set productivity level override for an app
function setAppProductivityOverride(appId, level) {
  const db = getDb();
  const validLevels = ['productive', 'neutral', 'unproductive'];

  if (level !== null && !validLevels.includes(level)) {
    throw new Error(`Invalid productivity level: ${level}`);
  }

  return db.prepare(`
    UPDATE apps
    SET productivity_level_override = ?
    WHERE id = ?
  `).run([level, appId]);
}

// Get effective productivity level for an app (override or category default)
function getAppProductivityLevel(appId) {
  const db = getDb();
  const result = db.prepare(`
    SELECT
      a.productivity_level_override,
      c.productivity_level as category_level
    FROM apps a
    LEFT JOIN categories c ON a.category = c.name
    WHERE a.id = ?
  `).get([appId]);

  if (!result) {
    return 'neutral';
  }

  // Use override if set, otherwise use category level
  return result.productivity_level_override || result.category_level || 'neutral';
}

// Get productivity stats for a date range
function getProductivityStats(startDate, endDate) {
  const db = getDb();
  const startTime = new Date(startDate).setHours(0, 0, 0, 0);
  const endTime = new Date(endDate).setHours(23, 59, 59, 999);

  // Get total time per productivity level
  const rawBreakdown = db.prepare(`
    SELECT
      CASE
        WHEN a.productivity_level_override IS NOT NULL THEN a.productivity_level_override
        WHEN c.productivity_level IS NOT NULL THEN c.productivity_level
        ELSE 'neutral'
      END as productivity_level,
      s.duration,
      a.id as app_id,
      s.id as session_id
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    LEFT JOIN categories c ON a.category = c.name
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
  `).all([startTime, endTime]);

  // Manually aggregate by productivity level
  const breakdownMap = {};
  const appSets = {};

  rawBreakdown.forEach(row => {
    const level = row.productivity_level;
    if (!breakdownMap[level]) {
      breakdownMap[level] = { productivity_level: level, total_time: 0, session_count: 0 };
      appSets[level] = new Set();
    }
    breakdownMap[level].total_time += row.duration;
    breakdownMap[level].session_count++;
    appSets[level].add(row.app_id);
  });

  const breakdown = Object.values(breakdownMap).map(item => ({
    ...item,
    app_count: appSets[item.productivity_level].size
  }));

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
  const topProductive = db.prepare(`
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
  `).all([startTime, endTime]);

  const topUnproductive = db.prepare(`
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
  `).all([startTime, endTime]);

  // Get category breakdown
  const categoryBreakdown = db.prepare(`
    SELECT
      CASE
        WHEN LOWER(a.category) = 'uncategorized' THEN 'Uncategorized'
        ELSE a.category
      END as category,
      c.color as color,
      SUM(s.duration) as total_time,
      COUNT(DISTINCT a.id) as app_count
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    LEFT JOIN categories c ON a.category = c.name
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
    GROUP BY LOWER(a.category)
    ORDER BY total_time DESC
  `).all([startTime, endTime]);

  // Get daily productivity trend
  const dailyTrend = db.prepare(`
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
  `).all([startTime, endTime]);

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

  // Calculate deep work sessions (productive sessions >= 25 minutes)
  const deepWorkThreshold = 25 * 60 * 1000; // 25 minutes in milliseconds
  const deepWorkSessions = db.prepare(`
    SELECT
      COUNT(*) as count,
      SUM(s.duration) as total_time,
      AVG(s.duration) as avg_duration
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    LEFT JOIN categories c ON a.category = c.name
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration >= ?
      AND COALESCE(a.productivity_level_override, c.productivity_level, 'neutral') = 'productive'
  `).get([startTime, endTime, deepWorkThreshold]);

  // Calculate peak productivity hour
  const hourlyProductivity = db.prepare(`
    SELECT
      strftime('%H', s.start_time / 1000, 'unixepoch', 'localtime') as hour,
      SUM(CASE
        WHEN COALESCE(a.productivity_level_override, c.productivity_level, 'neutral') = 'productive'
        THEN s.duration
        ELSE 0
      END) as productive_time,
      SUM(s.duration) as total_time
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    LEFT JOIN categories c ON a.category = c.name
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
    GROUP BY hour
    ORDER BY productive_time DESC
    LIMIT 1
  `).get([startTime, endTime]);

  const peakProductivityHour = hourlyProductivity ? {
    hour: parseInt(hourlyProductivity.hour),
    productiveTime: hourlyProductivity.productive_time,
    totalTime: hourlyProductivity.total_time,
    percentage: hourlyProductivity.total_time > 0
      ? Math.round((hourlyProductivity.productive_time / hourlyProductivity.total_time) * 100)
      : 0
  } : null;

  // Get hourly heatmap data (date + hour)
  const heatmapData = db.prepare(`
    SELECT
      DATE(s.start_time / 1000, 'unixepoch', 'localtime') as date,
      CAST(strftime('%H', s.start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
      CASE
        WHEN a.productivity_level_override IS NOT NULL THEN a.productivity_level_override
        WHEN c.productivity_level IS NOT NULL THEN c.productivity_level
        ELSE 'neutral'
      END as productivity_level,
      SUM(s.duration) as total_time
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    LEFT JOIN categories c ON a.category = c.name
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
    GROUP BY date, hour, productivity_level
    ORDER BY date ASC, hour ASC
  `).all([startTime, endTime]);

  // Get session length distribution (buckets: 0-15m, 15-30m, 30-60m, 1-2h, 2-4h, 4h+)
  const sessionLengthDistribution = db.prepare(`
    SELECT
      CASE
        WHEN duration < 900000 THEN '0-15m'
        WHEN duration < 1800000 THEN '15-30m'
        WHEN duration < 3600000 THEN '30-60m'
        WHEN duration < 7200000 THEN '1-2h'
        WHEN duration < 14400000 THEN '2-4h'
        ELSE '4h+'
      END as bucket,
      COUNT(*) as count
    FROM sessions
    WHERE start_time >= ? AND start_time <= ?
      AND end_time IS NOT NULL
      AND duration > 0
    GROUP BY bucket
    ORDER BY
      CASE bucket
        WHEN '0-15m' THEN 1
        WHEN '15-30m' THEN 2
        WHEN '30-60m' THEN 3
        WHEN '1-2h' THEN 4
        WHEN '2-4h' THEN 5
        WHEN '4h+' THEN 6
      END
  `).all([startTime, endTime]);

  // Get app switching frequency over time (by date)
  const appSwitchingFrequency = db.prepare(`
    SELECT
      DATE(start_time / 1000, 'unixepoch', 'localtime') as date,
      COUNT(*) as switches
    FROM sessions
    WHERE start_time >= ? AND start_time <= ?
      AND end_time IS NOT NULL
      AND duration > 0
    GROUP BY date
    ORDER BY date ASC
  `).all([startTime, endTime]);

  // Get productivity by time of day (hourly breakdown)
  const productivityByHour = db.prepare(`
    SELECT
      CAST(strftime('%H', s.start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
      CASE
        WHEN a.productivity_level_override IS NOT NULL THEN a.productivity_level_override
        WHEN c.productivity_level IS NOT NULL THEN c.productivity_level
        ELSE 'neutral'
      END as productivity_level,
      SUM(s.duration) as total_time
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    LEFT JOIN categories c ON a.category = c.name
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
    GROUP BY hour, productivity_level
    ORDER BY hour ASC
  `).all([startTime, endTime]);

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
    deepWorkSessions: {
      count: deepWorkSessions.count || 0,
      totalTime: deepWorkSessions.total_time || 0,
      avgDuration: deepWorkSessions.avg_duration || 0
    },
    peakProductivityHour,
    totalTime,
    topProductive,
    topUnproductive,
    categoryBreakdown,
    dailyScores,
    heatmapData,
    sessionLengthDistribution,
    appSwitchingFrequency,
    productivityByHour
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
  updateCategorySortPreference,
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