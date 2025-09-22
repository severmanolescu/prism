const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');

const utils = require('./main/utils');
const dataStorage = require('./main/data-storage');
const appManagement = require('./main/app-management');
const appTracking = require('./main/app-tracking');
const { initializeIpcHandlers } = require('./main/ipc-handlers');


let trackingInterval = null;
let mainWindow;

const { formatTime, formatLastUsed } = utils;
const { initDataStorage, loadAppData, saveAppData, loadSessionsData, saveSessionsData } = dataStorage;
const { generateAppId, getCleanAppName, extractAppIcon, saveApp } = appManagement;
const { getCurrentApp, startTracking, stopTracking, trackingLoop, startTrackingSystem, stopTrackingSystem } = appTracking;

// App lifecycle
app.whenReady().then(() => {
  // Register a custom protocol to serve icon files
  protocol.handle('app-icon', (request) => {
    const iconName = request.url.replace('app-icon://', '');
    const iconPath = path.join(__dirname, 'icons', iconName);
    
    if (fs.existsSync(iconPath)) {
      return net.fetch(`file://${iconPath}`);
    } else {
      return new Response('Icon not found', { status: 404 });
    }
  });

  initDataStorage();
  const window = createWindow();
  initializeIpcHandlers(window);

  const appTracking = require('./main/app-tracking');
  appTracking.setMainWindow(window);
});

app.on('window-all-closed', () => {
  console.log('All windows closed, stopping tracking...');
  stopTrackingSystem();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Enhanced app lifecycle handlers
app.on('before-quit', (event) => {
  console.log('App is quitting, stopping tracking...');
  stopTrackingSystem();
});

app.on('browser-window-focus', () => {
  // Resume tracking when window gets focus
  if (!trackingInterval) {
    startTrackingSystem();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1b2838',
    show: false,
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('src/index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Start tracking when window is ready
    setTimeout(() => {
      startTrackingSystem();
    }, 1000);
  });
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

module.exports = {
  setMainWindow(window) {
    mainWindow = window;
  },
  getMainWindow() {
    return mainWindow;
  }
};