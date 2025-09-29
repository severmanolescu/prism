const { ipcMain } = require('electron');

let isAutoLaunchEnabled = false;

function initializeSettingsHandlers() {
  ipcMain.handle('get-auto-launch-status', () => {
    return isAutoLaunchEnabled;
  });

  ipcMain.handle('set-auto-launch', async (event, enabled) => {
    try {
      console.log('Setting auto-launch to:', enabled);
      
      // Auto-launch logic would go here
      // await autoLauncher.enable() or disable()
      
      isAutoLaunchEnabled = enabled;
      return { success: true, status: enabled };
    } catch (error) {
      console.error('Error setting auto-launch:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { initializeSettingsHandlers };