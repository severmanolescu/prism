const { ipcMain } = require('electron');
const { getTodayStats } = require('../services/data-access');

function initializeStatsHandlers() {
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
}

module.exports = { initializeStatsHandlers };