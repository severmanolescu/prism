const { ipcMain } = require('electron');
const { getTodayStats, getAnalyticsData } = require('../services/data-access');

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
      console.log('Analytics data returned:', {
        hasLongestSession: !!data.longestSession,
        hasHourlyBreakdown: !!data.hourlyBreakdown,
        hourlyBreakdownLength: data.hourlyBreakdown?.length
      });
      return data;
    } catch (error) {
      console.error('Error getting analytics data:', error);
      throw error;
    }
  });
}

module.exports = { initializeStatsHandlers };