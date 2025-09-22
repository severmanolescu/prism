const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');

const execAsync = util.promisify(exec);

const dataStorage = require('./data-storage');

const { saveAppData } = dataStorage;

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
    const iconDir = path.join(__dirname, '../icons');
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
  
  if (!dataStorage.appData[appId]) {
    // Extract icon for new apps
    const iconPath = await extractAppIcon(execPath, cleanName);
    
    // Create new app entry
    dataStorage.appData[appId] = {
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
      dataStorage.appData[appId].name = cleanName;
    }
    
    // Extract icon if we don't have one yet
    if (!dataStorage.appData[appId].iconPath && execPath) {
      const iconPath = await extractAppIcon(execPath, cleanName);
      if (iconPath) {
        dataStorage.appData[appId].iconPath = iconPath;
      }
    }
  }
  
  // Update last used and increment launch count only if it's a new session
  const now = new Date().toISOString();
  if (!dataStorage.appData[appId].lastUsed || 
      new Date(now) - new Date(dataStorage.appData[appId].lastUsed) > 5000) { // 5 second threshold
    dataStorage.appData[appId].launchCount += 1;
  }
  dataStorage.appData[appId].lastUsed = now;
  
  saveAppData();
  return appId;
}

module.exports ={
    generateAppId,
    getCleanAppName,
    extractAppIcon,
    saveApp
}