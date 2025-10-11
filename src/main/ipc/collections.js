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

  ipcMain.handle('get-category-details', async (event, categoryName) => {
    const db = getDb();

    try {
      // Get category info by name (since frontend passes category name)
      const category = db.prepare(`
        SELECT * FROM categories WHERE name = ?
      `).get([categoryName]);

      if (!category) {
        throw new Error('Category not found');
      }

      // Get all apps in this category
      const apps = db.prepare(`
        SELECT id, name, total_time, last_used, icon_path
        FROM apps
        WHERE category = ? AND hidden = 0
        ORDER BY total_time DESC
      `).all([categoryName]);

      const appCount = apps.length;

      // Get total time for this category (all time)
      const totalTime = apps.reduce((sum, app) => sum + (app.total_time || 0), 0);

      // Get session count for this category
      const sessionCountResult = db.prepare(`
        SELECT COUNT(*) as count
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ?
      `).get([categoryName]);
      const sessionCount = sessionCountResult?.count || 0;

      // Get average session duration
      const avgSessionResult = db.prepare(`
        SELECT AVG(duration) as avgDuration
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ? AND s.duration > 0
      `).get([categoryName]);
      const avgSession = Math.round(avgSessionResult?.avgDuration || 0);

      // Get total time across all categories for percentage calculation
      const totalAllTime = db.prepare(`
        SELECT SUM(total_time) as total FROM apps WHERE hidden = 0
      `).get();
      const usagePercentage = totalAllTime.total > 0 ? (totalTime / totalAllTime.total) * 100 : 0;

      // Get this week's usage (last 7 days)
      const thisWeekResult = db.prepare(`
        SELECT SUM(s.duration) as total
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ?
        AND DATE(s.start_time / 1000, 'unixepoch', 'localtime') >= DATE('now', 'localtime', '-7 days')
      `).get([categoryName]);
      const thisWeek = thisWeekResult?.total || 0;

      // Get last week's usage (7-14 days ago)
      const lastWeekResult = db.prepare(`
        SELECT SUM(s.duration) as total
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ?
        AND DATE(s.start_time / 1000, 'unixepoch', 'localtime') >= DATE('now', 'localtime', '-14 days')
        AND DATE(s.start_time / 1000, 'unixepoch', 'localtime') < DATE('now', 'localtime', '-7 days')
      `).get([categoryName]);
      const lastWeek = lastWeekResult?.total || 0;

      // Get daily usage for last 30 days (for calendar and charts)
      const monthlyUsage = db.prepare(`
        SELECT
          DATE(s.start_time / 1000, 'unixepoch', 'localtime') as date,
          SUM(s.duration) as total_duration
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ?
        AND DATE(s.start_time / 1000, 'unixepoch', 'localtime') >= DATE('now', 'localtime', '-30 days')
        GROUP BY date
        ORDER BY date DESC
      `).all([categoryName]);

      // Calculate average daily from monthly usage
      const activeDays = monthlyUsage.filter(d => d.total_duration > 0).length;
      const avgDaily = activeDays > 0 ? totalTime / activeDays : 0;

      // Get peak day
      const peakDay = monthlyUsage.length > 0
        ? Math.max(...monthlyUsage.map(d => d.total_duration))
        : 0;

      // Get weekly usage for last 7 days (for daily chart)
      const weeklyUsage = db.prepare(`
        SELECT
          DATE(s.start_time / 1000, 'unixepoch', 'localtime') as date,
          SUM(s.duration) as total_duration
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ?
        AND DATE(s.start_time / 1000, 'unixepoch', 'localtime') >= DATE('now', 'localtime', '-7 days')
        GROUP BY date
        ORDER BY date ASC
      `).all([categoryName]);

      // Get top apps in category
      const topApps = apps.slice(0, 100).map(app => ({
        id: app.id,
        name: app.name,
        totalTime: app.total_time,
        lastUsed: app.last_used,
        icon_path: app.icon_path
      }));

      // Get day of week usage
      const dayOfWeekUsage = db.prepare(`
        SELECT
          CAST(strftime('%w', s.start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as day,
          SUM(s.duration) as total_duration
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ?
        GROUP BY day
        ORDER BY day
      `).all([categoryName]);

      // Get heatmap data (hour of day × day of week)
      const heatmapData = db.prepare(`
        SELECT
          CAST(strftime('%w', s.start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as day,
          CAST(strftime('%H', s.start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
          SUM(s.duration) as total_duration
        FROM sessions s
        INNER JOIN apps a ON s.app_id = a.id
        WHERE a.category = ?
        GROUP BY day, hour
      `).all([categoryName]);

      return {
        category: {
          id: category.id,
          name: category.name,
          color: category.color || '#092442',
          icon: category.icon || '📁'
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
        weeklyUsage,
        monthlyUsage,
        topApps,
        dayOfWeekUsage,
        heatmapData
      };

    } catch (error) {
      console.error("Error fetching category details:", error);
      throw error;
    }
  });
}

module.exports = { initializeCollectionHandlers };
