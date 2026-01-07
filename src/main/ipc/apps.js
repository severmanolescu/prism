const { ipcMain, shell } = require('electron');
const { spawn } = require('child_process');

const {
  getAllApps,
  getRecentApps,
  getAppsByCategory,
  getHiddenApps,
  hideApp,
  restoreApp,
  deleteAppAndSessions,
  addToBlacklist,
} = require('../services/data_access/apps');

const { formatTime, formatLastUsed } = require('../utils/utils');
const { getDb } = require('../services/database');

function mapAppFromDb(app) {
  return {
    id: app.id,
    name: app.name,
    path: app.path,
    executable: app.executable,
    category: app.category,
    iconPath: app.icon_path,
    hidden: app.hidden === 1,
    firstUsed: app.first_used,
    lastUsed: app.last_used,
    totalTime: app.total_time,
    launchCount: app.launch_count,
    productivity_level_override: app.productivity_level_override,
    totalTimeFormatted: formatTime(app.total_time),
    lastUsedFormatted: formatLastUsed(app.last_used)
  };
}

function initializeAppHandlers() {
  ipcMain.handle('get-all-apps', async () => {
    try {
      // Verify database connection
      const db = getDb();
      if (!db) {
        console.error('Database not available in get-all-apps');
        return [];
      }
      const apps = await getAllApps(false);
      
      return apps.map(mapAppFromDb);
    } catch (error) {
      console.error('Error in get-all-apps handler:', error);
      console.error('Stack:', error.stack);
      // Return empty array instead of throwing to prevent renderer crash
      return [];
    }
  });

  ipcMain.handle('get-recent-apps', async () => {
    try {
      const db = getDb();
      if (!db) {
        console.error('Database not available in get-recent-apps');
        return [];
      }
      const apps = await getRecentApps(20);
  
      return apps.map(mapAppFromDb);
    } catch (error) {
      console.error('Error in get-recent-apps handler:', error);
      console.error('Stack:', error.stack);
      return [];
    }
  });

  ipcMain.handle('get-apps-by-category', async (event, category) => {
    try {
      const db = getDb();
      if (!db) {
        console.error('Database not available in get-apps-by-category');
        return [];
      }
      const apps = await getAppsByCategory(category);
      
      return apps.map(mapAppFromDb);
    } catch (error) {
      console.error('Error in get-apps-by-category handler:', error);
      console.error('Stack:', error.stack);
      return [];
    }
  });

  ipcMain.handle('get-hidden-apps', async () => {
    try {
      const db = getDb();
      if (!db) {
        console.error('Database not available in get-hidden-apps');
        return [];
      }
      const apps = await getHiddenApps();
      
      return apps.map(mapAppFromDb);
    } catch (error) {
      console.error('Error in get-hidden-apps handler:', error);
      console.error('Stack:', error.stack);
      return [];
    }
  });

  ipcMain.handle('hide-app-from-library', async (event, appId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      console.log(`Hiding app: ${appId}`);
      await hideApp(appId);
      return { success: true };
    } catch (error) {
      console.error('Error hiding app:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('restore-hidden-app', async (event, appId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      console.log(`Restoring app: ${appId}`);
      await restoreApp(appId);
      return { success: true };
    } catch (error) {
      console.error('Error restoring app:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('remove-app-from-tracker', async (event, appId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      console.log(`Removing app from tracker: ${appId}`);
      await deleteAppAndSessions(appId);
      return { success: true };
    } catch (error) {
      console.error('Error removing app:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('remove-app-permanently', async (event, appId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const { getAppById } = require('../services/data_access/apps');
      const app = await getAppById(appId);
      
      if (!app) {
        return { success: false, error: 'App not found' };
      }
      
      console.log(`Removing app permanently: ${app.name}`);
      await addToBlacklist({
        name: app.name,
        path: app.path,
        executable: app.executable,
        reason: 'user_removed_permanently'
      });
      
      await deleteAppAndSessions(appId);
      
      return { success: true };
    } catch (error) {
      console.error('Error removing app permanently:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-app-by-id', async (event, appId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const { getAppById } = require('../services/data_access/apps');
      const app = await getAppById(appId);

      if (!app) {
        return null;
      }

      return mapAppFromDb(app);
    } catch (error) {
      console.error('Error getting app by id:', error);
      return null;
    }
  });

  ipcMain.handle('open-file-location', async (event, filePath) => {
    if (!filePath) return;
    shell.showItemInFolder(filePath);
  });

  ipcMain.handle('launch-app', async (event, appId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const { getAppById } = require('../services/data_access/apps');
      const app = await getAppById(appId);
      
      if (!app || !app.path) {
        throw new Error('App not found or no executable path');
      }
      
      console.log(`Launching app: ${app.name} from ${app.path}`);

      // Use spawn instead of exec to prevent command injection
      let child;
      if (process.platform === 'win32') {
        // Use cmd.exe with /C start for Windows
        child = spawn('cmd.exe', ['/c', 'start', '', app.path], {
          detached: true,
          stdio: 'ignore'
        });
      } else if (process.platform === 'darwin') {
        // Use open command for macOS
        child = spawn('open', [app.path], {
          detached: true,
          stdio: 'ignore'
        });
      } else {
        // Direct execution for Linux
        child = spawn(app.path, [], {
          detached: true,
          stdio: 'ignore'
        });
      }

      child.on('error', (error) => {
        console.error('Failed to launch app:', error);
      });

      child.unref(); // Allow parent to exit independently
      
      return { success: true };
      
    } catch (error) {
      console.error('Error launching app:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-app-details-by-date-range', async (event, appId, startDate, endDate) => {
    const db = getDb();

    try {
      // Get app info
      const app = db.prepare(`
        SELECT * FROM apps WHERE id = ?
      `).get([appId]);

      if (!app) {
        throw new Error('App not found');
      }

      // Convert date strings to timestamps
      const startTimestamp = new Date(startDate).setHours(0, 0, 0, 0);
      const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);

      // Get total sessions count for the date range
      const sessionCount = db.prepare(`
        SELECT COUNT(*) as count FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time <= ?
      `).get([appId, startTimestamp, endTimestamp]);

      // Get usage data for the date range (this replaces weeklyUsage)
      const weeklyUsage = db.prepare(`
        SELECT
          DATE(start_time / 1000, 'unixepoch', 'localtime') as date,
          SUM(duration) as total_duration
        FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time <= ?
        GROUP BY date
        ORDER BY date ASC
      `).all([appId, startTimestamp, endTimestamp]);

      // Get this week's total time (last 7 days from end date)
      const sevenDaysBeforeEnd = new Date(endDate);
      sevenDaysBeforeEnd.setDate(sevenDaysBeforeEnd.getDate() - 6);
      const sevenDaysBeforeEndTimestamp = sevenDaysBeforeEnd.setHours(0, 0, 0, 0);

      const thisWeek = db.prepare(`
        SELECT SUM(duration) as total FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time <= ?
      `).get([appId, sevenDaysBeforeEndTimestamp, endTimestamp]);

      // Get longest session in date range
      const longestSession = db.prepare(`
        SELECT MAX(duration) as longest FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time <= ?
      `).get([appId, startTimestamp, endTimestamp]);

      // Get average session in date range
      const avgSession = db.prepare(`
        SELECT AVG(duration) as average FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time <= ?
      `).get([appId, startTimestamp, endTimestamp]);

      // Get current streak (consecutive days)
      const streak = calculateStreak(db, appId);

      // Get recent sessions (last 10 in date range)
      const recentSessions = db.prepare(`
        SELECT * FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time <= ?
        ORDER BY start_time DESC
        LIMIT 10
      `).all([appId, startTimestamp, endTimestamp]);

      // Get today's activity by hour (or end date's activity)
      const todayDate = new Date(endDate);
      todayDate.setHours(0, 0, 0, 0);
      const todayStart = todayDate.getTime();
      const todayEnd = new Date(endDate).setHours(23, 59, 59, 999);

      const todayActivity = db.prepare(`
        SELECT
          CAST(strftime('%H', start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
          SUM(duration) as total_duration
        FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time <= ?
        GROUP BY hour
        ORDER BY hour
      `).all([appId, todayStart, todayEnd]);

      // Get monthly usage (30 days worth within the date range)
      const monthlyUsage = db.prepare(`
        SELECT
          DATE(start_time / 1000, 'unixepoch', 'localtime') as date,
          SUM(duration) as total_duration,
          COUNT(*) as session_count
        FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time <= ?
        GROUP BY date
        ORDER BY date ASC
      `).all([appId, startTimestamp, endTimestamp]);

      // Get usage by day of week (filtered by date range)
      const dayOfWeekUsage = db.prepare(`
        SELECT
          CAST(strftime('%w', start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as day_of_week,
          SUM(duration) as total_duration,
          COUNT(*) as session_count
        FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time <= ?
        GROUP BY day_of_week
        ORDER BY day_of_week
      `).all([appId, startTimestamp, endTimestamp]);

      // Get session duration distribution (filtered by date range)
      const sessionDurations = db.prepare(`
        SELECT duration FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time <= ?
      `).all([appId, startTimestamp, endTimestamp]);

      // Get all sessions for heatmap (within date range, max 90 days)
      const heatmapData = db.prepare(`
        SELECT
          CAST(strftime('%w', start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as day_of_week,
          CAST(strftime('%H', start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
          SUM(duration) as total_duration
        FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time <= ?
        GROUP BY day_of_week, hour
      `).all([appId, startTimestamp, endTimestamp]);

      // Get category ranking
      const categoryRanking = db.prepare(`
        SELECT id, name, total_time
        FROM apps
        WHERE category = ? AND hidden = 0
        ORDER BY total_time DESC
      `).all([app.category]);

      const appRankInCategory = categoryRanking.findIndex(a => a.id === appId) + 1;

      // Get total time for all apps
      const totalAllApps = db.prepare(`
        SELECT SUM(total_time) as total FROM apps WHERE hidden = 0
      `).get();

      const usagePercentage = totalAllApps?.total > 0
        ? (app.total_time / totalAllApps.total) * 100
        : 0;

      // Get last week's time for comparison (7 days before the selected range)
      const fourteenDaysBeforeEnd = new Date(endDate);
      fourteenDaysBeforeEnd.setDate(fourteenDaysBeforeEnd.getDate() - 13);
      const fourteenDaysBeforeEndTimestamp = fourteenDaysBeforeEnd.setHours(0, 0, 0, 0);

      const lastWeek = db.prepare(`
        SELECT SUM(duration) as total FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time < ?
      `).get([appId, fourteenDaysBeforeEndTimestamp, sevenDaysBeforeEndTimestamp]);

      // Get streak history (all streaks)
      const streakHistory = calculateStreakHistory(db, appId);

      const result = {
        app,
        stats: {
          totalTime: app.total_time || 0,
          thisWeek: thisWeek?.total || 0,
          lastWeek: lastWeek?.total || 0,
          sessionCount: sessionCount?.count || 0,
          streak: streak,
          longestSession: longestSession?.longest || 0,
          avgSession: avgSession?.average || 0,
          firstUsed: app.first_used,
          categoryRank: appRankInCategory,
          totalInCategory: categoryRanking.length,
          usagePercentage: usagePercentage
        },
        weeklyUsage,
        monthlyUsage,
        dayOfWeekUsage,
        sessionDurations: sessionDurations ? sessionDurations.map(s => s.duration) : [],
        heatmapData,
        streakHistory,
        recentSessions,
        todayActivity
      };

      return result;
    } catch (error) {
      console.error('Error fetching app details by date range:', error);
      throw error;
    }
  });

  ipcMain.handle('get-app-details', async (event, appId) => {
    const db = getDb();

    try {
      // Get app info
      const app = db.prepare(`
        SELECT * FROM apps WHERE id = ?
      `).get([appId]);

      if (!app) {
        throw new Error('App not found');
      }

      // Get total sessions count
      const sessionCount = db.prepare(`
        SELECT COUNT(*) as count FROM sessions WHERE app_id = ?
      `).get([appId]);

      // Get last 7 days usage
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const weeklyUsage = db.prepare(`
        SELECT
          DATE(start_time / 1000, 'unixepoch', 'localtime') as date,
          SUM(duration) as total_duration
        FROM sessions
        WHERE app_id = ? AND start_time >= ?
        GROUP BY date
        ORDER BY date ASC
      `).all([appId, sevenDaysAgo]);

      // Get this week's total time
      const thisWeek = db.prepare(`
        SELECT SUM(duration) as total FROM sessions
        WHERE app_id = ? AND start_time >= ?
      `).get([appId, sevenDaysAgo]);

      // Get longest session
      const longestSession = db.prepare(`
        SELECT MAX(duration) as longest FROM sessions WHERE app_id = ?
      `).get([appId]);

      // Get average session
      const avgSession = db.prepare(`
        SELECT AVG(duration) as average FROM sessions WHERE app_id = ?
      `).get([appId]);

      // Get current streak (consecutive days)
      const streak = calculateStreak(db, appId);

      // Get recent sessions (last 10)
      const recentSessions = db.prepare(`
        SELECT * FROM sessions
        WHERE app_id = ?
        ORDER BY start_time DESC
        LIMIT 10
      `).all([appId]);

      // Get today's activity by hour
      // Create a Date object for today at midnight in local time
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const todayStart = todayDate.getTime(); // Convert to milliseconds timestamp
      const todayActivity = db.prepare(`
        SELECT
          CAST(strftime('%H', start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
          SUM(duration) as total_duration
        FROM sessions
        WHERE app_id = ? AND start_time >= ?
        GROUP BY hour
        ORDER BY hour
      `).all([appId, todayStart]);
      
      // Get last 30 days usage for monthly view
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      const monthlyUsage = db.prepare(`
        SELECT
          DATE(start_time / 1000, 'unixepoch', 'localtime') as date,
          SUM(duration) as total_duration,
          COUNT(*) as session_count
        FROM sessions
        WHERE app_id = ? AND start_time >= ?
        GROUP BY date
        ORDER BY date ASC
      `).all([appId, thirtyDaysAgo]);

      // Get usage by day of week
      const dayOfWeekUsage = db.prepare(`
        SELECT
          CAST(strftime('%w', start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as day_of_week,
          SUM(duration) as total_duration,
          COUNT(*) as session_count
        FROM sessions
        WHERE app_id = ?
        GROUP BY day_of_week
        ORDER BY day_of_week
      `).all([appId]);

      // Get session duration distribution
      const sessionDurations = db.prepare(`
        SELECT duration FROM sessions WHERE app_id = ?
      `).all([appId]);

      // Get all sessions for heatmap (last 90 days)
      const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const heatmapData = db.prepare(`
        SELECT
          CAST(strftime('%w', start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as day_of_week,
          CAST(strftime('%H', start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
          SUM(duration) as total_duration
        FROM sessions
        WHERE app_id = ? AND start_time >= ?
        GROUP BY day_of_week, hour
      `).all([appId, ninetyDaysAgo]);

      // Get category ranking
      const categoryRanking = db.prepare(`
        SELECT id, name, total_time
        FROM apps
        WHERE category = ? AND hidden = 0
        ORDER BY total_time DESC
      `).all([app.category]);

      const appRankInCategory = categoryRanking.findIndex(a => a.id === appId) + 1;

      // Get total time for all apps
      const totalAllApps = db.prepare(`
        SELECT SUM(total_time) as total FROM apps WHERE hidden = 0
      `).get();

      const usagePercentage = totalAllApps?.total > 0
        ? (app.total_time / totalAllApps.total) * 100
        : 0;

      // Get last week's time for comparison
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      const lastWeek = db.prepare(`
        SELECT SUM(duration) as total FROM sessions
        WHERE app_id = ? AND start_time >= ? AND start_time < ?
      `).get([appId, twoWeeksAgo, sevenDaysAgo]);

      // Get streak history (all streaks)
      const streakHistory = calculateStreakHistory(db, appId);

      const result = {
        app,
        stats: {
          totalTime: app.total_time || 0,
          thisWeek: thisWeek?.total || 0,
          lastWeek: lastWeek?.total || 0,
          sessionCount: sessionCount?.count || 0,
          streak: streak,
          longestSession: longestSession?.longest || 0,
          avgSession: avgSession?.average || 0,
          firstUsed: app.first_used,
          categoryRank: appRankInCategory,
          totalInCategory: categoryRanking.length,
          usagePercentage: usagePercentage
        },
        weeklyUsage,
        monthlyUsage,
        dayOfWeekUsage,
        sessionDurations: sessionDurations ? sessionDurations.map(s => s.duration) : [],
        heatmapData,
        streakHistory,
        recentSessions,
        todayActivity
      };

      return result;
    } catch (error) {
      console.error('Error fetching app details:', error);
      throw error;
    }
  });

  console.log('App IPC handlers initialized');
}

function calculateStreak(db, appId) {
  const sessions = db.prepare(`
    SELECT DISTINCT DATE(start_time / 1000, 'unixepoch', 'localtime') as date
    FROM sessions
    WHERE app_id = ?
    ORDER BY date DESC
  `).all([appId]);

  if (sessions.length === 0) return 0;

  let streak = 0;
  // Get today's date in local time (YYYY-MM-DD format) to match SQL 'localtime'
  const todayDate = new Date();
  const today = todayDate.getFullYear() + '-' +
    String(todayDate.getMonth() + 1).padStart(2, '0') + '-' +
    String(todayDate.getDate()).padStart(2, '0');

  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterday = yesterdayDate.getFullYear() + '-' +
    String(yesterdayDate.getMonth() + 1).padStart(2, '0') + '-' +
    String(yesterdayDate.getDate()).padStart(2, '0');

  // Check if there's activity today or yesterday
  if (sessions[0].date !== today && sessions[0].date !== yesterday) {
    return 0;
  }

  let currentDate = new Date(sessions[0].date);

  for (let i = 0; i < sessions.length; i++) {
    const sessionDate = new Date(sessions[i].date);
    const diffDays = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      streak++;
    } else if (diffDays === 1) {
      streak++;
      currentDate = sessionDate;
    } else {
      break;
    }
  }

  return streak;
}

function calculateStreakHistory(db, appId) {
  const sessions = db.prepare(`
    SELECT DISTINCT DATE(start_time / 1000, 'unixepoch', 'localtime') as date
    FROM sessions
    WHERE app_id = ?
    ORDER BY date DESC
  `).all([appId]);

  if (sessions.length === 0) return [];

  const streaks = [];
  let currentStreak = { start: sessions[0].date, end: sessions[0].date, length: 1 };

  for (let i = 1; i < sessions.length; i++) {
    const currentDate = new Date(sessions[i - 1].date);
    const prevDate = new Date(sessions[i].date);
    const diffDays = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak.start = sessions[i].date;
      currentStreak.length++;
    } else {
      streaks.push({ ...currentStreak });
      currentStreak = { start: sessions[i].date, end: sessions[i].date, length: 1 };
    }
  }

  streaks.push(currentStreak);

  // Return top 5 longest streaks
  return streaks.sort((a, b) => b.length - a.length).slice(0, 5);
}

module.exports = { initializeAppHandlers };
