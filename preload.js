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
  
  // Debug function
  testIconExtraction: (execPath, appName) => ipcRenderer.invoke('test-icon-extraction', execPath, appName),

  addToFavorites: (appId) => ipcRenderer.invoke('add-to-favorites', appId),
  removeFromFavorites: (appId) => ipcRenderer.invoke('remove-from-favorites', appId),
  getFavorites: () => ipcRenderer.invoke('get-favorites'),

  launchApp: (appId) => ipcRenderer.invoke('launch-app', appId),

  createCollection: (collectionData) => ipcRenderer.invoke('create-collection', collectionData),
  getCategories: () => ipcRenderer.invoke('get-categories'),
  
  editCollection: (categoryId, newData) => ipcRenderer.invoke('edit-collection', categoryId, newData),
  deleteCollection: (categoryName) => ipcRenderer.invoke('delete-collection', categoryName),

  moveAppToCollection: (appId, category) => ipcRenderer.invoke('move-app-to-collection', appId, category),
});

