const { initializeWindowHandlers } = require('./window');
const { initializeAppHandlers } = require('./apps');
const { initializeCollectionHandlers } = require('./collections');
const { initializeFavoriteHandlers } = require('./favorites');
const { initializeSessionHandlers } = require('./sessions');
const { initializeStatsHandlers } = require('./stats');
const { initializeSettingsHandlers } = require('./settings');
const { initializeGoalHandlers } = require('./goals');

function initializeIpcHandlers(window) {
  initializeWindowHandlers(window);
  initializeAppHandlers();
  initializeCollectionHandlers();
  initializeFavoriteHandlers();
  initializeSessionHandlers();
  initializeStatsHandlers();
  initializeSettingsHandlers();
  initializeGoalHandlers();
}

module.exports = { initializeIpcHandlers };