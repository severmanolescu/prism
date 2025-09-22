const fs = require('fs');
const path = require('path');

let appData = {};
let sessionsData = [];

const dataDir = path.join(__dirname, '../data');
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

module.exports = {
    initDataStorage,
    loadAppData,
    loadSessionsData,
    saveAppData,
    saveSessionsData,
    // Export the data objects so main.js can access them
    get appData() { return appData; },
    get sessionsData() { return sessionsData; },
    set appData(value) { appData = value; },
    set sessionsData(value) { sessionsData = value; }
}