const { ipcMain } = require('electron');
const {
  getAllCategories,
  createCategory,
  updateCategory,
  updateCategorySortPreference,
  deleteCategory,
  moveAppToCategory
} = require('../services/data_access/categories');
const { getDb } = require('../services/database');

function initializeCollectionHandlers() {
  ipcMain.handle('get-categories', async () => {
    const categories = await getAllCategories();
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      productivity_level: cat.productivity_level,
      sortPreference: cat.sort_preference || 'name-asc',
      isDefault: cat.is_default === 1,
      createdAt: cat.created_at
    }));
  });

  ipcMain.handle('create-collection', async (event, collectionData) => {
    try {
      const id = collectionData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await createCategory({
        id,
        name: collectionData.name,
        color: collectionData.color || '#092442',
        icon: collectionData.icon || '📁',
        productivityLevel: collectionData.productivityLevel || 'neutral'
      });
      return { success: true };
    } catch (error) {
      console.error('Error creating collection:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('edit-collection', async (event, categoryId, newData) => {
    try {
      await updateCategory(categoryId, {
        ...newData,
        productivityLevel: newData.productivityLevel
      });
      return { success: true };
    } catch (error) {
      console.error('Error editing collection:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-collection', async (event, categoryName) => {
    try {
      // Find the category by name to get its id
      const categories = await getAllCategories();
      const category = categories.find(cat => cat.name === categoryName);

      if (!category) {
        return { success: false, error: 'Category not found' };
      }

      await deleteCategory(category.id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting collection:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('move-app-to-collection', async (event, appId, category) => {
    try {
      await moveAppToCategory(appId, category);
      return { success: true };
    } catch (error) {
      console.error('Error moving app:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-category-sort', async (event, categoryName, sortPreference) => {
    try {
      await updateCategorySortPreference(categoryName, sortPreference);
      return { success: true };
    } catch (error) {
      console.error('Error updating category sort preference:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-categories-comparison', async (event, startDate, endDate) => {
    const db = getDb();

    try {
      if (!startDate || !endDate) {
        throw new Error('startDate and endDate are required');
      }

      // Get all categories with their total time in the date range
      const categories = db.prepare(`
        SELECT
          c.id,
          c.name,
          c.color,
          c.icon,
          COALESCE(SUM(s.duration), 0) as total_time
        FROM categories c
        LEFT JOIN apps a ON a.category = c.name
        LEFT JOIN sessions s ON s.app_id = a.id
          AND DATE(s.start_time / 1000, 'unixepoch', 'localtime') BETWEEN ? AND ?
        WHERE c.is_default = 0
        GROUP BY c.id, c.name, c.color, c.icon
        HAVING total_time > 0
        ORDER BY total_time DESC
      `).all([startDate, endDate]);

      return categories;
    } catch (error) {
      console.error('Error fetching categories comparison:', error);
      throw error;
    }
  });

  ipcMain.handle('get-category-details', async (event, categoryName, startDate, endDate) => {
    const db = getDb();

    try {
      let category;

      // Get category info by name (since frontend passes category name)
      if(categoryName !== "Uncategorized"){
        category = db.prepare(`
        SELECT * FROM categories WHERE name = ?
      `).get([categoryName]);

        if (!category) {
          throw new Error('Category not found');
        }
      }
      else{
        category = {
          id: "Uncategorized",
          name: "Uncategorized",
          color: '#092442',
          icon: '📁',
          productivity_level: 'neutral'
        }
      }
      

      // startDate and endDate are REQUIRED
      if (!startDate || !endDate) {
        throw new Error('startDate and endDate are required');
      }

      // Prepare date filter conditions
      const dateFilterCondition = `AND DATE(s.start_time / 1000, 'unixepoch', 'localtime') BETWEEN ? AND ?`;
      const dateParams = [startDate, endDate];

      // Get all apps in this category
      const apps = db.prepare(`
        SELECT id, name, total_time, last_used, icon_path
        FROM apps
        WHERE category = ? AND hidden = 0
        ORDER BY total_time DESC
      `).all([categoryName]);

      const appCount = apps.length;

      // Get total time for this category
      const totalTimeResult = db.prepare(`
        SELECT SUM(s.duration) as total
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ?
        ${dateFilterCondition}
      `).get([categoryName, ...dateParams]);
      const totalTime = totalTimeResult?.total || 0;

      // Get session count for this category
      const sessionCountResult = db.prepare(`
        SELECT COUNT(*) as count
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ?
        ${dateFilterCondition}
      `).get([categoryName, ...dateParams]);
      const sessionCount = sessionCountResult?.count || 0;

      // Get average session duration
      const avgSessionResult = db.prepare(`
        SELECT AVG(duration) as avgDuration
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ? AND s.duration > 0
        ${dateFilterCondition}
      `).get([categoryName, ...dateParams]);
      const avgSession = Math.round(avgSessionResult?.avgDuration || 0);

      // Get total time across all categories for percentage calculation
      const totalAllTime = db.prepare(`
        SELECT SUM(s.duration) as total
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.hidden = 0
        ${dateFilterCondition}
      `).get([...dateParams]);
      const usagePercentage = totalAllTime.total > 0 ? (totalTime / totalAllTime.total) * 100 : 0;

      // Calculate date ranges for weekly comparison
      const endDateObj = new Date(endDate);
      const startDateObj = new Date(startDate);
      const daysDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));

      // This "week" is the last 7 days of the range (or entire range if less than 7 days)
      const weekDays = Math.min(daysDiff, 7);
      const thisWeekEnd = endDate;
      const thisWeekStartObj = new Date(endDateObj);
      thisWeekStartObj.setDate(thisWeekStartObj.getDate() - weekDays + 1);
      const thisWeekStart = thisWeekStartObj.toISOString().split('T')[0];

      // Last "week" is the 7 days before this week (if available)
      let lastWeekStart = null;
      let lastWeekEnd = null;
      if (daysDiff > 7) {
        lastWeekEnd = new Date(thisWeekStartObj);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
        lastWeekEnd = lastWeekEnd.toISOString().split('T')[0];

        const lastWeekStartObj = new Date(lastWeekEnd);
        lastWeekStartObj.setDate(lastWeekStartObj.getDate() - 6);
        lastWeekStart = new Date(Math.max(startDateObj, lastWeekStartObj)).toISOString().split('T')[0];
      }

      // Get this week's usage
      const thisWeekResult = db.prepare(`
        SELECT SUM(s.duration) as total
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ?
        AND DATE(s.start_time / 1000, 'unixepoch', 'localtime') BETWEEN ? AND ?
      `).get([categoryName, thisWeekStart, thisWeekEnd]);
      const thisWeek = thisWeekResult?.total || 0;

      // Get last week's usage
      let lastWeek = 0;
      if (lastWeekStart && lastWeekEnd) {
        const lastWeekResult = db.prepare(`
          SELECT SUM(s.duration) as total
          FROM sessions s
          INNER JOIN apps a ON s.app_id = a.id
          WHERE a.category = ?
          AND DATE(s.start_time / 1000, 'unixepoch', 'localtime') BETWEEN ? AND ?
        `).get([categoryName, lastWeekStart, lastWeekEnd]);
        lastWeek = lastWeekResult?.total || 0;
      }

      // Get daily usage for the requested date range
      const dailyUsage = db.prepare(`
        SELECT
          DATE(s.start_time / 1000, 'unixepoch', 'localtime') as date,
          SUM(s.duration) as total_duration
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ?
        ${dateFilterCondition}
        GROUP BY date
        ORDER BY date ASC
      `).all([categoryName, ...dateParams]);

      // Calculate average daily from daily usage
      const activeDays = dailyUsage.filter(d => d.total_duration > 0).length;
      const avgDaily = activeDays > 0 ? totalTime / activeDays : 0;

      // Get peak day
      const peakDay = dailyUsage.length > 0
        ? Math.max(...dailyUsage.map(d => d.total_duration))
        : 0;

      // Get top apps in category
      const topAppsData = db.prepare(`
        SELECT
          a.id,
          a.name,
          a.icon_path,
          a.last_used,
          SUM(s.duration) as total_time
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ? AND a.hidden = 0
        ${dateFilterCondition}
        GROUP BY a.id
        ORDER BY total_time DESC
        LIMIT 100
      `).all([categoryName, ...dateParams]);

      const topApps = topAppsData.map(app => ({
        id: app.id,
        name: app.name,
        totalTime: app.total_time,
        lastUsed: app.last_used,
        icon_path: app.icon_path
      }));

      // Get heatmap data (hour of day × day of week) - filtered by date range
      const heatmapData = db.prepare(`
        SELECT
          CAST(strftime('%w', s.start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as day,
          CAST(strftime('%H', s.start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
          SUM(s.duration) as total_duration
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ?
        ${dateFilterCondition}
        GROUP BY day, hour
      `).all([categoryName, ...dateParams]);

      return {
        category: {
          id: category.id,
          name: category.name,
          color: category.color || '#092442',
          icon: category.icon || '📁',
          productivity_level: category.productivity_level || 'neutral'
        },
        stats: {
          totalTime,
          appCount,
          avgDaily: Math.round(avgDaily),
          thisWeek,
          lastWeek,
          sessionCount,
          avgSession,
          usagePercentage,
          peakDay
        },
        dailyUsage,
        topApps,
        heatmapData
      };

    } catch (error) {
      console.error("Error fetching category details:", error);
      throw error;
    }
  });
}

module.exports = { initializeCollectionHandlers };
