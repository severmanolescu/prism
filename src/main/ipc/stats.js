const { ipcMain } = require('electron');
const {
  setCategoryProductivityLevel,
  getCategoryProductivityLevel,
  setAppProductivityOverride,
  getAppProductivityLevel,
  getProductivityStats
} = require('../services/data_access/productivity');

const {
  getTodayStats,
  getAnalyticsData,
  getHourlyAppBreakdown,
} = require('../services/data_access/analytics');

function initializeStatsHandlers() {
  console.log('Initializing stats handlers...');

  ipcMain.handle('get-today-stats', async () => {
    try {
      const stats = await getTodayStats();
      return {
        appCount: stats.appCount,
        totalTime: stats.totalTime
      };
    } catch (error) {
      console.error('Error getting today stats:', error);
      return {
        appCount: 0,
        totalTime: 0
      };
    }
  });

  ipcMain.handle('get-analytics-data', async (event, startDate, endDate) => {
    try {
      const data = await getAnalyticsData(startDate, endDate);
      return data;
    } catch (error) {
      console.error('Error getting analytics data:', error);
      throw error;
    }
  });

  ipcMain.handle('get-hourly-app-breakdown', async (event, startDate, endDate) => {
    try {
      const data = await getHourlyAppBreakdown(startDate, endDate);
      return data;
    } catch (error) {
      console.error('Error getting hourly app breakdown:', error);
      throw error;
    }
  });

  // Productivity handlers
  ipcMain.handle('set-category-productivity-level', async (event, categoryId, level) => {
    try {
      await setCategoryProductivityLevel(categoryId, level);
      return { success: true };
    } catch (error) {
      console.error('Error setting category productivity level:', error);
      throw error;
    }
  });

  ipcMain.handle('get-category-productivity-level', async (event, categoryId) => {
    try {
      return await getCategoryProductivityLevel(categoryId);
    } catch (error) {
      console.error('Error getting category productivity level:', error);
      throw error;
    }
  });

  ipcMain.handle('set-app-productivity-override', async (event, appId, level) => {
    try {
      await setAppProductivityOverride(appId, level);
      return { success: true };
    } catch (error) {
      console.error('Error setting app productivity override:', error);
      throw error;
    }
  });

  ipcMain.handle('get-app-productivity-level', async (event, appId) => {
    try {
      return await getAppProductivityLevel(appId);
    } catch (error) {
      console.error('Error getting app productivity level:', error);
      throw error;
    }
  });

  ipcMain.handle('get-productivity-stats', async (event, startDate, endDate) => {
    try {
      return await getProductivityStats(startDate, endDate);
    } catch (error) {
      console.error('Error getting productivity stats:', error);
      throw error;
    }
  });
}

module.exports = { initializeStatsHandlers };
