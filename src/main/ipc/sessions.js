const { ipcMain } = require('electron');
const { getDb } = require('../services/database');

function initializeSessionHandlers() {
  ipcMain.handle('cleanup-orphaned-sessions', async () => {
    // Could implement cleanup logic here if needed
    return { success: true };
  });

  ipcMain.handle('get-session-stats', async () => {
    try {
      const db = getDb();
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN end_time IS NULL THEN 1 ELSE 0 END) as orphaned,
          SUM(CASE WHEN end_time IS NOT NULL THEN 1 ELSE 0 END) as completed
        FROM sessions
      `);
      
      return {
        total: stats.total || 0,
        completed: stats.completed || 0,
        orphaned: stats.orphaned || 0
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return { total: 0, completed: 0, orphaned: 0 };
    }
  });
}

module.exports = { initializeSessionHandlers };