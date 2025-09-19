const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const activeWin = require('active-win');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

let mainWindow;
let currentApp = null;
let startTime = null;
let trackingInterval = null;
let appData = {};
let sessionsData = [];
let currentSessionId = null;

// Data file paths
const dataDir = path.join(__dirname, 'data');
const appsFile = path.join(dataDir, 'apps.json');
const sessionsFile = path.join(dataDir, 'sessions.json');

// Initialize data storage
function initDataStorage() {
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  
  // Load existing data
  loadAppData();
  loadSessionsData();
}

// Load app data from JSON
function loadAppData() {
  try {
    if (fs.existsSync(appsFile)) {
      const data = fs.readFileSync(appsFile, 'utf8');
      appData = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading app data:', error);
    appData = {};
  }
}

// Load sessions data from JSON
function loadSessionsData() {
  try {
    if (fs.existsSync(sessionsFile)) {
      const data = fs.readFileSync(sessionsFile, 'utf8');
      sessionsData = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading sessions data:', error);
    sessionsData = [];
  }
}

// Save app data to JSON
function saveAppData() {
  try {
    fs.writeFileSync(appsFile, JSON.stringify(appData, null, 2));
  } catch (error) {
    console.error('Error saving app data:', error);
  }
}

// Save sessions data to JSON
function saveSessionsData() {
  try {
    fs.writeFileSync(sessionsFile, JSON.stringify(sessionsData, null, 2));
  } catch (error) {
    console.error('Error saving sessions data:', error);
  }
}

// Get currently active window/app
async function getCurrentApp() {
  try {
    const activeWindow = await activeWin();
    if (activeWindow) {
      return {
        name: activeWindow.title || 'Unknown',
        executable: activeWindow.owner.name || 'unknown.exe',
        path: activeWindow.owner.path || null
      };
    }
  } catch (error) {
    console.error('Error getting active window:', error);
  }
  return null;
}

// Generate unique app ID based on executable only
function generateAppId(name, executable) {
  // Use only executable name, not window title
  // This ensures all windows of the same app are grouped together
  const cleanExecutable = executable.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  return cleanExecutable;
}

// Get a clean app name from executable
function getCleanAppName(windowTitle, executable) {
  // First, try to get a proper name from the executable
  const executableName = executable.toLowerCase();
  
  // Map common executables to proper names
  const executableMap = {
    'chrome.exe': 'Google Chrome',
    'firefox.exe': 'Mozilla Firefox',
    'msedge.exe': 'Microsoft Edge',
    'code.exe': 'Visual Studio Code',
    'steam.exe': 'Steam',
    'discord.exe': 'Discord',
    'slack.exe': 'Slack',
    'teams.exe': 'Microsoft Teams',
    'spotify.exe': 'Spotify',
    'notepad.exe': 'Notepad',
    'notepad++.exe': 'Notepad++',
    'photoshop.exe': 'Adobe Photoshop',
    'illustrator.exe': 'Adobe Illustrator',
    'premiere.exe': 'Adobe Premiere Pro',
    'blender.exe': 'Blender',
    'unity.exe': 'Unity Editor',
    'cmd.exe': 'Command Prompt',
    'powershell.exe': 'Windows PowerShell',
    'windowsterminal.exe': 'Windows Terminal',
    'explorer.exe': 'Windows Explorer',
    'vlc.exe': 'VLC Media Player',
    'winrar.exe': 'WinRAR',
    '7z.exe': '7-Zip',
    'calculator.exe': 'Calculator',
    'mspaint.exe': 'Paint',
    'electron.exe': 'Electron App'
  };
  
  // Check if we have a mapped name for this executable
  if (executableMap[executableName]) {
    return executableMap[executableName];
  }
  
  // For executables ending with .exe, convert to readable name
  if (executableName.endsWith('.exe')) {
    let name = executable.slice(0, -4); // Remove .exe
    
    // Handle special cases
    if (name.toLowerCase().includes('system32\\cmd')) {
      return 'Command Prompt';
    }
    if (name.toLowerCase().includes('system32')) {
      return 'Windows System Process';
    }
    
    // Convert camelCase and add spaces
    name = name
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to words
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // Handle consecutive caps
      .split(/[\\_\-\.]/) // Split on underscores, hyphens, dots
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
      .join(' ')
      .trim();
    
    return name || 'Unknown Application';
  }
  
  // If no .exe extension, just clean up the executable name
  return executable
    .replace(/[_\-\.]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim() || 'Unknown Application';
}

// Extract icon from executable using PowerShell (Windows)
async function extractAppIcon(executablePath, appName) {
  if (!executablePath || !fs.existsSync(executablePath)) {
    return null;
  }
  
  try {
    const iconDir = path.join(__dirname, 'icons');
    if (!fs.existsSync(iconDir)) {
      fs.mkdirSync(iconDir);
    }
    
    const iconFileName = `${appName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const iconPath = path.join(iconDir, iconFileName);
    
    if (fs.existsSync(iconPath)) {
      return `icons/${iconFileName}`;
    }
    
    // PowerShell command to extract icon
    const psCommand = `Add-Type -AssemblyName System.Drawing; $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${executablePath}'); if($icon) { $icon.ToBitmap().Save('${iconPath}', [System.Drawing.Imaging.ImageFormat]::Png); $icon.Dispose(); Write-Host 'SUCCESS' } else { Write-Host 'FAILED' }`;
    
    const { stdout } = await execAsync(`powershell -Command "${psCommand}"`);
    
    if (stdout.includes('SUCCESS') && fs.existsSync(iconPath)) {
      return `icons/${iconFileName}`;
    } else {
      return null;
    }
    
  } catch (error) {
    return null;
  }
}

async function saveApp(appInfo) {
  const { name, executable, path: execPath } = appInfo;
  const appId = generateAppId(name, executable);
  const cleanName = getCleanAppName(name, executable);
  
  if (!appData[appId]) {
    // Extract icon for new apps
    const iconPath = await extractAppIcon(execPath, cleanName);
    
    // Create new app entry
    appData[appId] = {
      id: appId,
      name: cleanName,
      executable: executable,
      path: execPath,
      iconPath: iconPath,
      totalTime: 0,
      launchCount: 0,
      lastUsed: null,
      category: "Uncategorized",
      createdAt: new Date().toISOString()
    };
  } else {
    // Update the name in case we got a better title
    if (cleanName && cleanName !== executable && !cleanName.startsWith('Steam Time Tracker')) {
      appData[appId].name = cleanName;
    }
    
    // Extract icon if we don't have one yet
    if (!appData[appId].iconPath && execPath) {
      const iconPath = await extractAppIcon(execPath, cleanName);
      if (iconPath) {
        appData[appId].iconPath = iconPath;
      }
    }
  }
  
  // Update last used and increment launch count only if it's a new session
  const now = new Date().toISOString();
  if (!appData[appId].lastUsed || 
      new Date(now) - new Date(appData[appId].lastUsed) > 5000) { // 5 second threshold
    appData[appId].launchCount += 1;
  }
  appData[appId].lastUsed = now;
  
  saveAppData();
  return appId;
}

// Start tracking current app
function startTracking(appInfo) {
  const appId = generateAppId(appInfo.name, appInfo.executable);
  
  // If it's the same app, continue tracking
  if (currentApp && currentApp.id === appId) {
    return;
  }
  
  // Stop previous session BEFORE setting new currentApp
  if (currentApp) {
    stopTracking();
  }
  
  // Start new session
  currentApp = { ...appInfo, id: appId };
  startTime = Date.now();
  
  // Save/update app in data
  saveApp(appInfo);
  
  // Create new session with unique ID
  const sessionId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
  const session = {
    id: sessionId,
    appId: appId,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0
  };
  
  currentSessionId = sessionId; // Store the session ID
  sessionsData.push(session);
  saveSessionsData(); // Save immediately after creating session
}

// Enhanced stopTracking function with better error handling
function stopTracking() {
  if (!currentApp || !startTime || !currentSessionId) return;
  
  const duration = Math.floor((Date.now() - startTime) / 1000);
  
  // Only save if duration is meaningful (more than 2 seconds)
  if (duration < 2) {
    // Still need to mark session as ended even for short durations
    const currentSession = sessionsData.find(s => s.id === currentSessionId);
    if (currentSession && !currentSession.endTime) {
      currentSession.endTime = new Date().toISOString();
      currentSession.duration = duration;
      saveSessionsData();
    }
    
    currentApp = null;
    startTime = null;
    currentSessionId = null;
    return;
  }
  
  try {
    // Find the current session by its unique ID
    const currentSession = sessionsData.find(s => s.id === currentSessionId);
    
    if (currentSession && !currentSession.endTime) {
      currentSession.endTime = new Date().toISOString();
      currentSession.duration = duration;
      
      // Update total time for the app
      if (appData[currentApp.id]) {
        appData[currentApp.id].totalTime += duration;
      }
      
      // Save data with error handling
      saveAppData();
      saveSessionsData();
      
      // Send update to renderer
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('app-usage-updated', {
          appId: currentApp.id,
          duration: duration,
          totalTime: appData[currentApp.id]?.totalTime || 0
        });
      }
    } else {
      console.warn('Session not found or already ended:', currentSessionId);
    }
    
  } catch (error) {
    console.error('Error in stopTracking:', error);
  } finally {
    currentApp = null;
    startTime = null;
    currentSessionId = null;
  }
}

// Enhanced tracking loop with better error handling
async function trackingLoop() {
  try {
    const activeApp = await getCurrentApp();
    
    if (activeApp && activeApp.name !== 'Unknown') {
      startTracking(activeApp);
    } else {
      // If no active app detected, stop current tracking
      stopTracking();
    }
  } catch (error) {
    console.error('Error in tracking loop:', error);
    // Don't stop tracking on error, just log it
  }
}

// Start the tracking system
function startTrackingSystem() {  
  trackingInterval = setInterval(trackingLoop, 2000);
}
// Stop the tracking system
function stopTrackingSystem() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  
  stopTracking();
}

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

// Add a simple test IPC handler to debug icon extraction
ipcMain.handle('test-icon-extraction', async (event, execPath, appName) => {
  const result = await extractAppIcon(execPath, appName);
  return result;
});

// IPC Handlers - App Data
ipcMain.handle('get-all-apps', () => {
  const apps = Object.values(appData)
    .sort((a, b) => b.totalTime - a.totalTime)
    .map(app => ({
      ...app,
      totalTimeFormatted: formatTime(app.totalTime),
      lastUsedFormatted: formatLastUsed(app.lastUsed)
    }));
  
  return apps;
});

ipcMain.handle('get-recent-apps', () => {
  const recentApps = Object.values(appData)
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
    filteredApps = Object.values(appData);
  } else {
    // Remove emoji and get category name
    const categoryName = category.replace(/^[^\s]+\s/, ''); // Remove emoji and space
    filteredApps = Object.values(appData).filter(app => app.category === categoryName);
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

// Helper functions
function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = (seconds / 3600).toFixed(1);
  return `${hours}h`;
}

function formatLastUsed(timestamp) {
  if (!timestamp) return 'Never';
  
  const now = new Date();
  const used = new Date(timestamp);
  const diff = now - used;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

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
  createWindow();
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

ipcMain.handle('cleanup-orphaned-sessions', () => {
  return true;
});

ipcMain.handle('get-session-stats', () => {
  const totalSessions = sessionsData.length;
  const orphanedSessions = sessionsData.filter(s => s.endTime === null).length;
  const completedSessions = totalSessions - orphanedSessions;
  
  return {
    total: totalSessions,
    completed: completedSessions,
    orphaned: orphanedSessions
  };
});
