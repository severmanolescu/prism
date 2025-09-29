const { ipcMain } = require('electron');
const dataStorage = require('../services/data-storage');

function initializeSessionHandlers() {
  ipcMain.handle('cleanup-orphaned-sessions', () => {
    return true;
  });

  ipcMain.handle('get-session-stats', () => {
    const totalSessions = dataStorage.sessionsData.length;
    const orphanedSessions = dataStorage.sessionsData.filter(s => s.endTime === null).length;
    const completedSessions = totalSessions - orphanedSessions;
    
    return {
      total: totalSessions,
      completed: completedSessions,
      orphaned: orphanedSessions
    };
  });
}

module.exports = { initializeSessionHandlers };