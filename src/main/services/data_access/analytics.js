const { getDb } = require('../database');

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
      DATE(start_time/1000, 'unixepoch', 'localtime') as date,
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


module.exports = {
    getStatsForRange,
    getDailyStats,
    getTodayStats,
    getAnalyticsData,
    getHourlyAppBreakdown,
}