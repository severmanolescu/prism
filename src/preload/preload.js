const { contextBridge, ipcRenderer } = require('electron');

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
  updateCategorySort: (categoryName, sortPreference) => ipcRenderer.invoke('update-category-sort', categoryName, sortPreference),
  getCategoryDetails: (categoryName, startDate, endDate) => ipcRenderer.invoke('get-category-details', categoryName, startDate, endDate),
  getCategoriesComparison: (startDate, endDate) => ipcRenderer.invoke('get-categories-comparison', startDate, endDate),

  hideAppFromLibrary: (appId) => ipcRenderer.invoke('hide-app-from-library', appId),
  getHiddenApps: () => ipcRenderer.invoke('get-hidden-apps'),
  restoreHiddenApp: (appId) => ipcRenderer.invoke('restore-hidden-app', appId),

  removeAppFromTracker: (appId) => ipcRenderer.invoke('remove-app-from-tracker', appId),
  removeAppPermanently: (appId) => ipcRenderer.invoke('remove-app-permanently', appId),

  getTodayStats: () => ipcRenderer.invoke('get-today-stats'),

  getAppDetails: (appId) => ipcRenderer.invoke('get-app-details', appId),
  getAppDetailsByDateRange: (appId, startDate, endDate) => ipcRenderer.invoke('get-app-details-by-date-range', appId, startDate, endDate),
  getAppById: (appId) => ipcRenderer.invoke('get-app-by-id', appId),

  getAnalyticsData: (startDate, endDate) => ipcRenderer.invoke('get-analytics-data', startDate, endDate),
  getHourlyAppBreakdown: (startDate, endDate) => ipcRenderer.invoke('get-hourly-app-breakdown', startDate, endDate),

  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),

  // Productivity levels - generic invoke method
  invoke: (channel, ...args) => {
    const validChannels = [
      'set-app-productivity-override',
      'get-app-productivity-level',
      'set-category-productivity-level',
      'get-category-productivity-level',
      'get-productivity-stats'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    } else {
      throw new Error(`Invalid IPC channel: ${channel}`);
    }
  },

  // Direct productivity methods for convenience
  setAppProductivityOverride: (appId, level) => ipcRenderer.invoke('set-app-productivity-override', appId, level),
  getAppProductivityLevel: (appId) => ipcRenderer.invoke('get-app-productivity-level', appId),
  setCategoryProductivityLevel: (categoryId, level) => ipcRenderer.invoke('set-category-productivity-level', categoryId, level),
  getCategoryProductivityLevel: (categoryId) => ipcRenderer.invoke('get-category-productivity-level', categoryId),
  getProductivityStats: (startDate, endDate) => ipcRenderer.invoke('get-productivity-stats', startDate, endDate),

  // Goals API
  getAllGoals: () => ipcRenderer.invoke('goals:getAll'),
  getGoalsForDate: (date) => ipcRenderer.invoke('goals:getForDate', date),
  createGoal: (goalData) => ipcRenderer.invoke('goals:create', goalData),
  updateGoal: (goalId, goalData) => ipcRenderer.invoke('goals:update', goalId, goalData),
  deleteGoal: (goalId) => ipcRenderer.invoke('goals:delete', goalId),
  saveGoalProgressForDate: (date) => ipcRenderer.invoke('goals:saveProgressForDate', date),
  saveYesterdayProgress: () => ipcRenderer.invoke('goals:saveYesterdayProgress'),

  // Goal Templates API
  getGoalTemplates: () => ipcRenderer.invoke('goals:getTemplates'),
  getGoalTemplatesByCategory: () => ipcRenderer.invoke('goals:getTemplatesByCategory'),
  createGoalFromTemplate: (templateId, customizations) => ipcRenderer.invoke('goals:createFromTemplate', templateId, customizations),

  // Goal Insights API
  getGoalInsights: (days) => ipcRenderer.invoke('goals:getInsights', days),

  // Export API
  exportAnalyticsPDF: (data) => ipcRenderer.invoke('export-analytics-pdf', data),
  exportProductivityPDF: (data) => ipcRenderer.invoke('export-productivity-pdf', data),
  exportGoalsPDF: (data) => ipcRenderer.invoke('export-goals-pdf', data),
});
