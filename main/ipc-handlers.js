const { ipcMain } = require('electron');
const fsPromises = require('fs').promises;
const path = require('path');

const dataStorage = require('./data-storage');
const utils = require('./utils');
const appManagement = require('./app-management');

const { formatTime, formatLastUsed } = utils;
const { extractAppIcon } = appManagement;

let mainWindow = null;

function initializeIpcHandlers(window) {
  mainWindow = window;
}

// IPC Handlers - Window Controls
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('get-categories', () => {
  const categories = dataStorage.categoriesData;
  return categories || []; // Return empty array if undefined
});

// Add a simple test IPC handler to debug icon extraction
ipcMain.handle('test-icon-extraction', async (event, execPath, appName) => {
  const result = await extractAppIcon(execPath, appName);
  return result;
});

// IPC Handlers - App Data
ipcMain.handle('get-all-apps', () => {
  const apps = Object.values(dataStorage.appData)
    .sort((a, b) => b.totalTime - a.totalTime)
    .map(app => ({
      ...app,
      totalTimeFormatted: formatTime(app.totalTime),
      lastUsedFormatted: formatLastUsed(app.lastUsed)
    }));
  
  return apps;
});

ipcMain.handle('get-recent-apps', () => {
  const recentApps = Object.values(dataStorage.appData)
    .filter(app => app.lastUsed)
    .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
    .slice(0, 15)
    .map(app => ({
      ...app,
      totalTimeFormatted: formatTime(app.totalTime),
      lastUsedFormatted: formatLastUsed(app.lastUsed)
    }));
  
  return recentApps;
});

ipcMain.handle('get-apps-by-category', (event, category) => {
  let filteredApps;
  
  if (category === 'All Apps' || category === 'ðŸ"š All Apps') {
    filteredApps = Object.values(dataStorage.appData);
  } else {
    // Remove emoji and get category name
    const categoryName = category.replace(/^[^\s]+\s/, ''); // Remove emoji and space
    filteredApps = Object.values(dataStorage.appData).filter(app => app.category === categoryName);
  }
  
  const apps = filteredApps
    .sort((a, b) => b.totalTime - a.totalTime)
    .map(app => ({
      ...app,
      totalTimeFormatted: formatTime(app.totalTime),
      lastUsedFormatted: formatLastUsed(app.lastUsed)
    }));
  
  return apps;
});


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

ipcMain.handle('launch-app', async (event, appId) => {
    try {
        const { exec } = require('child_process');
        const fs = require('fs').promises;
        const path = require('path');
        
        // Read the apps.json file
        const appsFilePath = path.join(__dirname, '../data/apps.json');
        const appsData = await fsPromises.readFile(appsFilePath, 'utf8');
        const apps = JSON.parse(appsData);
        
        // Find the app by ID
        const app = apps[appId];
        
        if (!app || !app.path) {
            throw new Error('App not found or no executable path');
        }
        
        // Launch the application
        if (process.platform === 'win32') {
            // Windows - use start command to handle different file types
            exec(`start "" "${app.path}"`, (error) => {
                if (error) {
                    console.error('Failed to launch app:', error);
                }
            });
        } else if (process.platform === 'darwin') {
            // macOS
            exec(`open "${app.path}"`, (error) => {
                if (error) {
                    console.error('Failed to launch app:', error);
                }
            });
        } else {
            // Linux
            exec(`"${app.path}"`, (error) => {
                if (error) {
                    console.error('Failed to launch app:', error);
                }
            });
        }
        
        console.log(`Launched ${app.name} from ${app.path}`);
        return { success: true };
        
    } catch (error) {
        console.error('Error launching app:', error);
        return { success: false, error: error.message };
    }
});

// Add these IPC handlers
ipcMain.handle('add-to-favorites', async (event, appId) => {
    try {
        const favoritesPath = path.join(__dirname, '../data', 'favorites.json');
        
        // Ensure data directory exists
        await fsPromises.mkdir(path.dirname(favoritesPath), { recursive: true });
        
        let favorites = [];
        try {
            const favoritesData = await fsPromises.readFile(favoritesPath, 'utf8');
            favorites = JSON.parse(favoritesData);
        } catch (error) {
            // File doesn't exist yet, start with empty array
        }
        
        // Add to favorites if not already there
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
        const favoritesPath = path.join(__dirname, '../data', 'favorites.json');
        
        let favorites = [];
        try {
            const favoritesData = await fsPromises.readFile(favoritesPath, 'utf8');
            favorites = JSON.parse(favoritesData);
        } catch (error) {
            return { success: true }; // File doesn't exist, nothing to remove
        }
        
        // Remove from favorites
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
        const favoritesPath = path.join(__dirname, '../data', 'favorites.json');
        
        try {
            const favoritesData = await fsPromises.readFile(favoritesPath, 'utf8');
            return JSON.parse(favoritesData);
        } catch (error) {
            return []; // File doesn't exist, return empty array
        }
    } catch (error) {
        console.error('Error getting favorites:', error);
        return [];
    }
});

// Create new collection
ipcMain.handle('create-collection', (event, collectionData) => {
  const result = dataStorage.addCategory(collectionData.name, collectionData.icon);
  return result;
});

ipcMain.handle('delete-collection', (event, categoryId) => {
  const category = dataStorage.categoriesData.find(cat => cat.id === categoryId);
  
  if (!category || category.isDefault) {
    return { success: false, error: 'Cannot delete default category' };
  }
  
  // Move all apps in this category to Uncategorized
  Object.keys(dataStorage.appData).forEach(appId => {
    if (dataStorage.appData[appId].category === category.name) {
      dataStorage.appData[appId].category = 'Uncategorized';
    }
  });
  
  // Remove category
  dataStorage.categoriesData = dataStorage.categoriesData.filter(cat => cat.id !== categoryId);
  
  dataStorage.saveAppData();
  dataStorage.saveCategoriesData();
  
  return { success: true };
});

ipcMain.handle('move-app-to-collection', (event, appId, newCategory) => {
  if (dataStorage.appData[appId]) {
    dataStorage.appData[appId].category = dataStorage.validateCategory(newCategory);
    dataStorage.saveAppData();
    return { success: true };
  }
  return { success: false, error: 'App not found' };
});

module.exports = { initializeIpcHandlers };
