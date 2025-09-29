const activeWin = require('active-win');

let currentApp = null;
let startTime = null;

let currentSessionId = null;

let trackingInterval = null;
let mainWindow = null;

const dataStorage = require('./data-storage');
const appManagement = require('./app-management');

const {  saveAppData, saveSessionsData } = dataStorage;
const { generateAppId, saveApp } = appManagement;

function setMainWindow(window) {
  mainWindow = window;
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
  dataStorage.sessionsData.push(session);
  saveSessionsData(); // Save immediately after creating session
}

// Enhanced stopTracking function with better error handling
function stopTracking() {
  if (!currentApp || !startTime || !currentSessionId) return;
  
  const duration = Math.floor((Date.now() - startTime) / 1000);
  
  // Only save if duration is meaningful (more than 2 seconds)
  if (duration < 2) {
    // Still need to mark session as ended even for short durations
    const currentSession = dataStorage.sessionsData.find(s => s.id === currentSessionId);
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
    const currentSession = dataStorage.sessionsData.find(s => s.id === currentSessionId);
    
    if (currentSession && !currentSession.endTime) {
      currentSession.endTime = new Date().toISOString();
      currentSession.duration = duration;
      
      // Update total time for the app
      if (dataStorage.appData[currentApp.id]) {
        dataStorage.appData[currentApp.id].totalTime += duration;
      }
      
      // Save data with error handling
      saveAppData();
      saveSessionsData();
      
      // Send update to renderer
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('app-usage-updated', {
          appId: currentApp.id,
          duration: duration,
          totalTime: dataStorage.appData[currentApp.id]?.totalTime || 0
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

module.exports = {
    getCurrentApp,
    startTracking,
    stopTracking,
    trackingLoop,
    startTrackingSystem,
    stopTrackingSystem,
    setMainWindow 
}