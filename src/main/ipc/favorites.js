const { ipcMain } = require('electron');
const fsPromises = require('fs').promises;
const path = require('path');

function initializeFavoriteHandlers() {
  ipcMain.handle('add-to-favorites', async (event, appId) => {
    try {
      const favoritesPath = path.join(__dirname, './../../../../data/', 'favorites.json');
      
      await fsPromises.mkdir(path.dirname(favoritesPath), { recursive: true });
      
      let favorites = [];
      try {
        const favoritesData = await fsPromises.readFile(favoritesPath, 'utf8');
        favorites = JSON.parse(favoritesData);
      } catch (error) {
        // File doesn't exist yet, start with empty array
      }
      
      if (!favorites.includes(appId)) {
        favorites.push(appId);
        await fsPromises.writeFile(favoritesPath, JSON.stringify(favorites, null, 2));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('remove-from-favorites', async (event, appId) => {
    try {
      const favoritesPath = path.join(__dirname, './../../../../data/', 'favorites.json');
      
      let favorites = [];
      try {
        const favoritesData = await fsPromises.readFile(favoritesPath, 'utf8');
        favorites = JSON.parse(favoritesData);
      } catch (error) {
        return { success: true };
      }
      
      favorites = favorites.filter(id => id !== appId);
      await fsPromises.writeFile(favoritesPath, JSON.stringify(favorites, null, 2));
      
      return { success: true };
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-favorites', async (event) => {
    try {
      const favoritesPath = path.join(__dirname, './../../../../data/', 'favorites.json');
      
      try {
        const favoritesData = await fsPromises.readFile(favoritesPath, 'utf8');
        return JSON.parse(favoritesData);
      } catch (error) {
        return [];
      }
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  });
}

module.exports = { initializeFavoriteHandlers };