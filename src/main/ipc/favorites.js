const { ipcMain } = require('electron');
const {
  getFavorites,
  addFavorite,
  removeFavorite
} = require('../services/data_access/apps');

function initializeFavoriteHandlers() {
  ipcMain.handle('get-favorites', async () => {
    return await getFavorites();
  });

  ipcMain.handle('add-to-favorites', async (event, appId) => {
    try {
      await addFavorite(appId);
      return { success: true };
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('remove-from-favorites', async (event, appId) => {
    try {
      await removeFavorite(appId);
      return { success: true };
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { initializeFavoriteHandlers };
