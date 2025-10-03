const { app, BrowserWindow, protocol, net, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const AutoLaunch = require('auto-launch');

fs.appendFileSync('log.txt', 'App started\n');

const dataStorage = require('./src/main/services/data-storage');
const appTracking = require('./src/main/services/app-tracking');
const { initializeIpcHandlers } = require('./src/main/ipc');

const autoLauncher = new AutoLaunch({
  name: 'Time Tracker',
  path: app.getPath('exe'),
  options: ['--hidden']
});

autoLauncher.enable();

let isAutoLaunchEnabled = false;

let tray = null;

let trackingInterval = null;
let mainWindow;

const { initDataStorage } = dataStorage;
const { startTrackingSystem, stopTrackingSystem } = appTracking;
const { initDatabase, checkMigration, getDb } = require('./src/main/services/database');

// App lifecycle
app.whenReady().then(async () => {
  try {
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

    // Initialize database FIRST and wait for it
    console.log('Initializing database...');
    await initDatabase();
    console.log('Database initialized');
    
    await checkMigration();
    console.log('Migration checked');

    // Verify database is accessible
    const db = getDb();
    if (!db) {
      console.error('ERROR: Database not initialized properly!');
      fs.appendFileSync('log.txt', 'ERROR: Database is null\n');
      throw new Error('Database initialization failed');
    }
    
    // Test database connection
    try {
      await db.get('SELECT 1');
      console.log('Database connection verified');
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      fs.appendFileSync('log.txt', `Database test failed: ${dbError.message}\n`);
      throw dbError;
    }

    initDataStorage();
    const window = createWindow();
    
    // Initialize IPC handlers AFTER database is ready
    initializeIpcHandlers(window);
    console.log('IPC handlers initialized');

    const appTracking = require('./src/main/services/app-tracking');
    appTracking.setMainWindow(window);

    initAutoLaunch();

    createTray();

    const shouldStartHidden = process.argv.includes('--hidden');
    
    if (!shouldStartHidden) {
      window.show();
    }
    
  } catch (error) {
    console.error('Error during app initialization:', error);
    fs.appendFileSync('log.txt', `Initialization error: ${error.message}\n${error.stack}\n`);
    // Show error dialog to user
    const { dialog } = require('electron');
    dialog.showErrorBox('Initialization Error', 
      `Failed to initialize the application: ${error.message}\n\nPlease check the log.txt file for details.`);
    app.quit();
  }
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
  app.isQuiting = true;
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
      preload: path.join(__dirname, './src/preload/preload.js')
    },
    backgroundColor: '#1b2838',
    show: false,
    icon: path.join(__dirname, 'assets/prism.ico')
  });

  mainWindow.loadFile('src/renderer/index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Start tracking when window is ready
    setTimeout(() => {
      startTrackingSystem();
    }, 1000);
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  
  mainWindow.on('minimize', () => {
    mainWindow.hide();
  });
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

async function initAutoLaunch() {
  try {
    isAutoLaunchEnabled = await autoLauncher.isEnabled();
    console.log('Auto-launch enabled:', isAutoLaunchEnabled);
  } catch (error) {
    console.error('Error checking auto-launch status:', error);
  }
}

function createTray() {
  // Create tray icon using the prism.ico file
  const iconPath = path.join(__dirname, 'assets', 'prism.ico');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  
  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Time Tracker',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: 'Pause Tracking',
      type: 'checkbox',
      checked: false,
      click: (menuItem) => {
        if (menuItem.checked) {
          stopTrackingSystem();
        } else {
          startTrackingSystem();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          // You could send an IPC message to open settings
          mainWindow.webContents.send('open-settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('Time Tracker - Running');
  
  // Double-click to show/hide window
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

module.exports = {
  setMainWindow(window) {
    mainWindow = window;
  },
  getMainWindow() {
    return mainWindow;
  },
  // Add these exports
  getAutoLauncher() {
    return autoLauncher;
  },
  getAutoLaunchStatus() {
    return isAutoLaunchEnabled;
  },
  setAutoLaunchStatus(status) {
    isAutoLaunchEnabled = status;
  }
};