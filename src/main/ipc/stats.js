const { ipcMain } = require('electron');
const dataStorage = require('../services/data-storage');

function initializeStatsHandlers() {
  ipcMain.handle('get-today-stats', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();
      
      let totalTimeSeconds = 0;
      const appsUsedToday = new Set();
      
      if (dataStorage.sessionsData && Array.isArray(dataStorage.sessionsData)) {
        dataStorage.sessionsData.forEach(session => {
          const sessionStart = new Date(session.startTime).getTime();
          
          if (sessionStart >= todayTimestamp && session.endTime && session.duration) {
            totalTimeSeconds += session.duration;
            appsUsedToday.add(session.appId);
          }
        });
      }
      
      return {
        appCount: appsUsedToday.size,
        totalTime: totalTimeSeconds
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