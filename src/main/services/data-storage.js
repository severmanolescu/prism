const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let appData = {};
let sessionsData = [];

// Determine data directory based on environment
const isDev = !app.isPackaged;
const dataDir = isDev
  ? path.join(__dirname, './../../../data')
  : path.join(app.getPath('userData'), 'data');
const appsFile = path.join(dataDir, 'apps.json');
const sessionsFile = path.join(dataDir, 'sessions.json');
const categoriesFile = path.join(dataDir, 'categories.json');

let categoriesData = [];

// Initialize data storage
function initDataStorage() {
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  } else {
    // Check if it's actually a directory and not a file
    const stats = fs.statSync(dataDir);
    if (!stats.isDirectory()) {
      // If it's a file, remove it and create directory
      fs.unlinkSync(dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }
  
  // Load existing data
  loadAppData();
  loadSessionsData();
  loadCategoriesData(); 
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

function loadCategoriesData() {
  try {
    if (fs.existsSync(categoriesFile)) {
      const data = fs.readFileSync(categoriesFile, 'utf8');
      categoriesData = JSON.parse(data);
    } else {
      // Only start with Uncategorized
      categoriesData = [
        { id: 'uncategorized', name: 'Uncategorized', icon: '📁', isDefault: true }
      ];
      saveCategoriesData();
    }
  } catch (error) {
    console.error('Error loading categories data:', error);
    categoriesData = [
      { id: 'uncategorized', name: 'Uncategorized', icon: '📁', isDefault: true }
    ];
  }
}

// Save categories data to JSON
function saveCategoriesData() {
  try {
    fs.writeFileSync(categoriesFile, JSON.stringify(categoriesData, null, 2));
  } catch (error) {
    console.error('Error saving categories data:', error);
  }
}

function validateCategory(categoryName) {
  const category = categoriesData.find(cat => 
    cat.name === categoryName || cat.id === categoryName
  );
  return category ? category.name : 'Uncategorized';
}

// Add new category/collection
function addCategory(name, color = '#092442') {
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  if (categoriesData.find(cat => cat.id === id || cat.name === name)) {
    return { success: false, error: 'Category already exists' };
  }
  
  const newCategory = {
    id,
    name,
    color,
    isDefault: false,
    createdAt: new Date().toISOString()
  };
  
  categoriesData.push(newCategory);
  saveCategoriesData();
  return { success: true, category: newCategory };
}


function saveBlacklistedApps() {
    try {
        const blacklistPath = path.join(dataDir, 'blacklist.json');
        fs.writeFileSync(blacklistPath, JSON.stringify(blacklistedApps || [], null, 2));
        console.log('Blacklisted apps saved successfully');
    } catch (error) {
        console.error('Error saving blacklisted apps:', error);
    }
}

function loadBlacklistedApps() {
    try {
        const blacklistPath = path.join(dataDir, 'blacklist.json');
        if (fs.existsSync(blacklistPath)) {
            const data = fs.readFileSync(blacklistPath, 'utf8');
            blacklistedApps = JSON.parse(data);
        } else {
            blacklistedApps = [];
        }
    } catch (error) {
        console.error('Error loading blacklisted apps:', error);
        blacklistedApps = [];
    }
}

function removeAppSessions(appId) {
    if (sessionsData && Array.isArray(sessionsData)) {
        const beforeCount = sessionsData.length;
        sessionsData = sessionsData.filter(session => session.appId !== appId);
        const afterCount = sessionsData.length;
        
        console.log(`Removed ${beforeCount - afterCount} sessions for app ${appId} from memory`);
        return beforeCount - afterCount; // Return number of sessions removed
    }
    return 0;
}

module.exports = {
    initDataStorage,
    loadAppData,
    loadSessionsData,
    saveAppData,
    saveSessionsData,
    loadCategoriesData,
    validateCategory,
    addCategory,
    saveCategoriesData,
    saveBlacklistedApps,
    loadBlacklistedApps,
    removeAppSessions,
    saveSessionsData,

    get appData() { return appData; },
    get sessionsData() { return sessionsData; },
    set appData(value) { appData = value; },
    set sessionsData(value) { sessionsData = value; },
    get categoriesData() { return categoriesData; },
}