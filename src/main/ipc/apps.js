const { ipcMain } = require('electron');
const { exec } = require('child_process');
const fsPromises = require('fs').promises;
const path = require('path');
const fs = require('fs');

const dataStorage = require('../services/data-storage');
const { formatTime, formatLastUsed } = require('../utils/utils');

function initializeAppHandlers() {
  ipcMain.handle('get-all-apps', () => {
    const apps = Object.values(dataStorage.appData)
      .filter(app => !app.hidden)
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
      .filter(app => app.lastUsed && !app.hidden)
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, 20)
      .map(app => ({
        ...app,
        totalTimeFormatted: formatTime(app.totalTime),
        lastUsedFormatted: formatLastUsed(app.lastUsed)
      }));
    
    return recentApps;
  });

  ipcMain.handle('get-apps-by-category', (event, category) => {
    let filteredApps;
    
    if (category === 'All Apps' || category === 'Ã°Å¸"Å¡ All Apps') {
      filteredApps = Object.values(dataStorage.appData);
    } else {
      const categoryName = category.replace(/^[^\s]+\s/, '');
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

  ipcMain.handle('launch-app', async (event, appId) => {
    try {
      const appsFilePath = path.join(__dirname, './../../../../data/apps.json');
      const appsData = await fsPromises.readFile(appsFilePath, 'utf8');
      const apps = JSON.parse(appsData);
      
      const app = apps[appId];
      
      if (!app || !app.path) {
        throw new Error('App not found or no executable path');
      }
      
      if (process.platform === 'win32') {
        exec(`start "" "${app.path}"`, (error) => {
          if (error) console.error('Failed to launch app:', error);
        });
      } else if (process.platform === 'darwin') {
        exec(`open "${app.path}"`, (error) => {
          if (error) console.error('Failed to launch app:', error);
        });
      } else {
        exec(`"${app.path}"`, (error) => {
          if (error) console.error('Failed to launch app:', error);
        });
      }
      
      console.log(`Launched ${app.name} from ${app.path}`);
      return { success: true };
      
    } catch (error) {
      console.error('Error launching app:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('hide-app-from-library', (event, appId) => {
    try {
      if (!dataStorage.appData[appId]) {
        return { success: false, error: 'App not found' };
      }
      
      dataStorage.appData[appId].hidden = true;
      dataStorage.appData[appId].hiddenAt = new Date().toISOString();
      dataStorage.saveAppData();
      
      return { success: true };
    } catch (error) {
      console.error('Error hiding app from library:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-hidden-apps', () => {
    const hiddenApps = Object.values(dataStorage.appData)
      .filter(app => app.hidden)
      .map(app => ({
        ...app,
        totalTimeFormatted: formatTime(app.totalTime),
        lastUsedFormatted: formatLastUsed(app.lastUsed)
      }));
    
    return hiddenApps;
  });

  ipcMain.handle('restore-hidden-app', (event, appId) => {
    try {
      if (dataStorage.appData[appId] && dataStorage.appData[appId].hidden) {
        delete dataStorage.appData[appId].hidden;
        delete dataStorage.appData[appId].hiddenAt;
        dataStorage.saveAppData();
        return { success: true };
      }
      return { success: false, error: 'App not found or not hidden' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('remove-app-from-tracker', async (event, appId) => {
    try {
      if (!dataStorage.appData[appId]) {
        return { success: false, error: 'App not found' };
      }
      
      console.log(`Starting removal of app: ${appId}`);
      
      const { stopTrackingSystem, startTrackingSystem } = require('../services/app-tracking');
      stopTrackingSystem();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      delete dataStorage.appData[appId];
      
      if (dataStorage.sessionsData && Array.isArray(dataStorage.sessionsData)) {
        const beforeCount = dataStorage.sessionsData.length;
        dataStorage.sessionsData = dataStorage.sessionsData.filter(session => session.appId !== appId);
        console.log(`Removed ${beforeCount - dataStorage.sessionsData.length} sessions from memory`);
      }
      
      dataStorage.saveSessionsData();
      
      const favoritesPath = path.join(__dirname, './../../../../data/', 'favorites.json');
      try {
        if (fs.existsSync(favoritesPath)) {
          const favoritesData = await fsPromises.readFile(favoritesPath, 'utf8');
          let favorites = JSON.parse(favoritesData);
          favorites = favorites.filter(id => id !== appId);
          await fsPromises.writeFile(favoritesPath, JSON.stringify(favorites, null, 2));
        }
      } catch (favError) {
        console.log('Favorites file error:', favError.message);
      }
      
      dataStorage.saveAppData();
      startTrackingSystem();
      
      console.log(`Successfully removed app ${appId} from tracker`);
      return { success: true };
    } catch (error) {
      console.error('Error removing app from tracker:', error);
      try {
        const { startTrackingSystem } = require('../services/app-tracking');
        startTrackingSystem();
      } catch (restartError) {
        console.error('Failed to restart tracking system:', restartError);
      }
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('remove-app-permanently', async (event, appId) => {
    try {
      if (!dataStorage.appData[appId]) {
        return { success: false, error: 'App not found' };
      }
      
      const app = dataStorage.appData[appId];
      
      if (!dataStorage.blacklistedApps) {
        dataStorage.blacklistedApps = [];
      }
      
      dataStorage.blacklistedApps.push({
        name: app.name,
        path: app.path,
        executable: app.executable,
        blacklistedAt: new Date().toISOString(),
        reason: 'user_removed_permanently'
      });
      
      delete dataStorage.appData[appId];
      
      const sessionsPath = path.join(__dirname, './../../../../data/', 'sessions.json');
      try {
        const sessionsData = await fsPromises.readFile(sessionsPath, 'utf8');
        let sessions = JSON.parse(sessionsData);
        sessions = sessions.filter(session => session.appId !== appId);
        await fsPromises.writeFile(sessionsPath, JSON.stringify(sessions, null, 2));
      } catch (error) {
        console.log('No sessions file found or error reading sessions:', error.message);
      }
      
      const favoritesPath = path.join(__dirname, './../../../../data/', 'favorites.json');
      try {
        const favoritesData = await fsPromises.readFile(favoritesPath, 'utf8');
        let favorites = JSON.parse(favoritesData);
        favorites = favorites.filter(id => id !== appId);
        await fsPromises.writeFile(favoritesPath, JSON.stringify(favorites, null, 2));
      } catch (error) {
        console.log('No favorites file found or error reading favorites:', error.message);
      }
      
      dataStorage.saveAppData();
      dataStorage.saveBlacklistedApps();
      
      console.log(`Permanently removed app ${appId} and added to blacklist`);
      return { success: true };
    } catch (error) {
      console.error('Error removing app permanently:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { initializeAppHandlers };