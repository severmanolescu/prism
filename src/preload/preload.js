const { contextBridge, ipcRenderer, createCollection } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Window state listeners
  onWindowMaximized: (callback) => ipcRenderer.on('window-maximized', callback),
  onWindowUnmaximized: (callback) => ipcRenderer.on('window-unmaximized', callback),
  
  // App tracking functionality
  getAllApps: () => ipcRenderer.invoke('get-all-apps'),
  getRecentApps: () => ipcRenderer.invoke('get-recent-apps'),
  getAppsByCategory: (category) => ipcRenderer.invoke('get-apps-by-category', category),
  
  // Real-time updates
  onAppUsageUpdated: (callback) => ipcRenderer.on('app-usage-updated', callback),
  onMockDataReady: (callback) => ipcRenderer.on('mock-data-ready', callback),
  onAppIconUpdated: (callback) => ipcRenderer.on('app-icon-updated', callback),
  
  addToFavorites: (appId) => ipcRenderer.invoke('add-to-favorites', appId),
  removeFromFavorites: (appId) => ipcRenderer.invoke('remove-from-favorites', appId),
  getFavorites: () => ipcRenderer.invoke('get-favorites'),

  launchApp: (appId) => ipcRenderer.invoke('launch-app', appId),

  createCollection: (collectionData) => ipcRenderer.invoke('create-collection', collectionData),
  getCategories: () => ipcRenderer.invoke('get-categories'),
  
  editCollection: (categoryId, newData) => ipcRenderer.invoke('edit-collection', categoryId, newData),
  deleteCollection: (categoryName) => ipcRenderer.invoke('delete-collection', categoryName),

  moveAppToCollection: (appId, category) => ipcRenderer.invoke('move-app-to-collection', appId, category),

  hideAppFromLibrary: (appId) => ipcRenderer.invoke('hide-app-from-library', appId),
  getHiddenApps: () => ipcRenderer.invoke('get-hidden-apps'),
  restoreHiddenApp: (appId) => ipcRenderer.invoke('restore-hidden-app', appId),

  removeAppFromTracker: (appId) => ipcRenderer.invoke('remove-app-from-tracker', appId),
  removeAppPermanently: (appId) => ipcRenderer.invoke('remove-app-permanently', appId),

  getTodayStats: () => ipcRenderer.invoke('get-today-stats'),

  getAppDetails: (appId) => ipcRenderer.invoke('get-app-details', appId),

  getAnalyticsData: (startDate, endDate) => ipcRenderer.invoke('get-analytics-data', startDate, endDate),
  getHourlyAppBreakdown: (startDate, endDate) => ipcRenderer.invoke('get-hourly-app-breakdown', startDate, endDate)
});
