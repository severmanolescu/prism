const activeWin = require('active-win');
const path = require('path');
const fs = require('fs');
const { getDb } = require('./database');

let currentApp = null;
let startTime = null;
let currentSessionId = null;
let trackingInterval = null;
let mainWindow = null;

const logFile = 'tracking-log.txt';

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (error) {
    // Ignore log errors
  }
}

function setMainWindow(window) {
  mainWindow = window;
  log('Main window set for tracking');
}

// Generate unique app ID based on executable
function generateAppId(executable) {
  return executable.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// Get a clean app name from executable
function getCleanAppName(windowTitle, executable) {
  const executableName = executable.toLowerCase();
  
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
  
  if (executableMap[executableName]) {
    return executableMap[executableName];
  }
  
  if (executableName.endsWith('.exe')) {
    let name = executable.slice(0, -4);
    
    if (name.toLowerCase().includes('system32\\cmd')) {
      return 'Command Prompt';
    }
    if (name.toLowerCase().includes('system32')) {
      return 'Windows System Process';
    }
    
    name = name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[\\_\-\.]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
    
    return name || 'Unknown Application';
  }
  
  return executable
    .replace(/[_\-\.]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim() || 'Unknown Application';
}

// Get or create app in database
async function getOrCreateApp(appInfo) {
  const db = getDb();
  if (!db) {
    log('ERROR: Database not available');
    return null;
  }

  const { name, executable, path: execPath } = appInfo;
  const appId = generateAppId(executable);
  const cleanName = getCleanAppName(name, executable);
  
  try {
    // Check if app exists
    let app = await db.get('SELECT * FROM apps WHERE id = ?', appId);
    
    if (app) {
      // Update last used time
      await db.run(
        'UPDATE apps SET last_used = ? WHERE id = ?',
        [Date.now(), appId]
      );
      return app;
    }
    
    // Create new app
    log(`Creating new app: ${cleanName} (${executable})`);
    
    let iconPath = null;
    if (execPath) {
      try {
        const { extractAppIcon } = require('./app-management');
        iconPath = await extractAppIcon(execPath, cleanName);
      } catch (error) {
        log(`Failed to extract icon: ${error.message}`);
      }
    }

    const now = Date.now();
    await db.run(`
      INSERT INTO apps (id, name, path, executable, category, icon_path, hidden, first_used, last_used, total_time, launch_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      appId,
      cleanName,
      execPath || '',
      executable,
      'Uncategorized',
      iconPath,
      0,
      now,
      now,
      0,
      1
    ]);
    
    log(`✓ Created app: ${cleanName} with ID: ${appId}`);
    
    // Notify renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app-list-updated');
    }
    
    return await db.get('SELECT * FROM apps WHERE id = ?', appId);
    
  } catch (error) {
    log(`ERROR in getOrCreateApp: ${error.message}`);
    console.error('Stack:', error.stack);
    return null;
  }
}

// Start new session in database
async function startSession(appId) {
  const db = getDb();
  if (!db) {
    log('ERROR: Database not available');
    return null;
  }

  try {
    const now = Date.now();
    
    const result = await db.run(`
      INSERT INTO sessions (app_id, start_time, end_time, duration)
      VALUES (?, ?, NULL, 0)
    `, [appId, now]);
    
    const sessionId = result.lastID;
    
    return {
      id: sessionId,
      appId: appId,
      startTime: now
    };
    
  } catch (error) {
    log(`ERROR in startSession: ${error.message}`);
    console.error('Stack:', error.stack);
    return null;
  }
}

// End session in database
async function endSession(session) {
  const db = getDb();
  if (!db || !session) {
    return;
  }

  try {
    const now = Date.now();
    const duration = now - session.startTime;
    
    
    // Update session
    await db.run(`
      UPDATE sessions 
      SET end_time = ?, duration = ?
      WHERE id = ?
    `, [now, duration, session.id]);
    
    // Update app total time
    await db.run(`
      UPDATE apps 
      SET total_time = total_time + ?, last_used = ?
      WHERE id = ?
    `, [duration, now, session.appId]);
        
    // Notify renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stats-updated');
      mainWindow.webContents.send('app-usage-updated', {
        appId: session.appId,
        duration: duration,
      });
    }
    
  } catch (error) {
    log(`ERROR in endSession: ${error.message}`);
    console.error('Stack:', error.stack);
  }
}

// Get currently active window/app
async function getCurrentApp() {
  try {
    const activeWindow = await activeWin();
    if (activeWindow) {
      let executable = '';
      let execPath = '';
      
      if (process.platform === 'win32') {
        executable = activeWindow.owner.name || 'unknown.exe';
        execPath = activeWindow.owner.path || '';
      } else if (process.platform === 'darwin') {
        executable = activeWindow.owner.name || 'unknown';
        execPath = activeWindow.owner.path || activeWindow.owner.bundleId || '';
      } else {
        executable = activeWindow.owner.name || 'unknown';
        execPath = '';
      }
      
      return {
        name: activeWindow.title || 'Unknown',
        executable: executable,
        path: execPath
      };
    }
  } catch (error) {
    log(`Error getting active window: ${error.message}`);
  }
  return null;
}

// Start tracking current app
async function startTracking(appInfo) {
  const appId = generateAppId(appInfo.executable);
  
  // If it's the same app, continue tracking
  if (currentApp && currentApp.id === appId) {
    return;
  }
  
  // Stop previous session
  if (currentApp && currentSessionId) {
    await stopTracking();
  }
    
  // Get or create app in database
  const app = await getOrCreateApp(appInfo);
  if (!app) {
    log('Failed to get/create app');
    return;
  }
  
  // Start new session
  const session = await startSession(app.id);
  if (!session) {
    log('Failed to start session');
    return;
  }
  
  currentApp = { ...appInfo, id: appId };
  startTime = Date.now();
  currentSessionId = session.id;
}

// Stop tracking
async function stopTracking() {
  if (!currentApp || !startTime || !currentSessionId) {
    return;
  }
  
  const duration = Date.now() - startTime;
  
  await endSession({
    id: currentSessionId,
    appId: currentApp.id,
    startTime: startTime
  });
  
  currentApp = null;
  startTime = null;
  currentSessionId = null;
}

// Tracking loop
async function trackingLoop() {
  try {
    const activeApp = await getCurrentApp();
    
    if (activeApp && activeApp.name !== 'Unknown') {
      await startTracking(activeApp);
    } else {
      await stopTracking();
    }
  } catch (error) {
    log(`Error in tracking loop: ${error.message}`);
  }
}

// Start the tracking system
function startTrackingSystem() {
  if (trackingInterval) {
    return;
  }
    
  const db = getDb();
  if (!db) {
    log('ERROR: Database not available, cannot start tracking');
    return;
  }
  
  trackingInterval = setInterval(trackingLoop, 2000);
  
  // Initial track
  trackingLoop();
}

// Stop the tracking system
function stopTrackingSystem() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  
  stopTracking();
}

module.exports = {
  getCurrentApp,
  startTracking,
  stopTracking,
  trackingLoop,
  startTrackingSystem,
  stopTrackingSystem,
  setMainWindow
};
