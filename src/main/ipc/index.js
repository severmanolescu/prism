const { initializeWindowHandlers } = require('./window');
const { initializeAppHandlers } = require('./apps');
const { initializeCollectionHandlers } = require('./collections');
const { initializeFavoriteHandlers } = require('./favorites');
const { initializeSessionHandlers } = require('./sessions');
const { initializeStatsHandlers } = require('./stats');
const { initializeSettingsHandlers } = require('./settings');

function initializeIpcHandlers(window) {
  initializeWindowHandlers(window);
  initializeAppHandlers();
  initializeCollectionHandlers();
  initializeFavoriteHandlers();
  initializeSessionHandlers();
  initializeStatsHandlers();
  initializeSettingsHandlers();
}

module.exports = { initializeIpcHandlers };