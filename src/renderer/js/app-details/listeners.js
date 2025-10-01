// Listen for data from parent window
window.addEventListener('message', (event) => {
  if (event.data.type === 'APP_DETAILS') {
    appDetails = event.data.data;
    loadAppDetails();
  } else if (event.data.type === 'FAVORITE_UPDATED') {
    // Update favorite button text
    const favoriteBtn = document.getElementById('favorite-btn');
    if (favoriteBtn) {
      const btnText = favoriteBtn.querySelector('span:last-child');
      if (btnText) {
        btnText.textContent = event.data.isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
      }
    }
  }
});

// Export functionality
document.getElementById('export-csv-btn')?.addEventListener('click', async () => {
  if (!appDetails) return;

  const sessions = appDetails.recentSessions || [];
  const csvContent = [
    ['Date', 'Start Time', 'End Time', 'Duration (minutes)'],
    ...sessions.map(session => [
      new Date(session.start_time).toLocaleDateString(),
      new Date(session.start_time).toLocaleTimeString(),
      session.end_time ? new Date(session.end_time).toLocaleTimeString() : 'ongoing',
      Math.round(session.duration / (1000 * 60))
    ])
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appDetails.app.name}-sessions.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('export-json-btn')?.addEventListener('click', async () => {
  if (!appDetails) return;

  const exportData = {
    app: appDetails.app,
    stats: appDetails.stats,
    sessions: appDetails.recentSessions,
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appDetails.app.name}-data.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Launch app button
document.getElementById('launch-btn')?.addEventListener('click', async () => {
  if (!appDetails) return;

  try {
    // Send message to parent window to launch app
    window.parent.postMessage({
      type: 'LAUNCH_APP',
      appId: appDetails.app.id
    }, '*');
  } catch (error) {
    console.error('Error launching app:', error);
  }
});

// Add to favorites button
document.getElementById('favorite-btn')?.addEventListener('click', async () => {
  if (!appDetails) return;

  try {
    // Send message to parent window to toggle favorite
    window.parent.postMessage({
      type: 'TOGGLE_FAVORITE',
      appId: appDetails.app.id
    }, '*');
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
});

// Properties button
document.getElementById('properties-btn')?.addEventListener('click', () => {
  if (!appDetails) return;

  const modal = document.getElementById('properties-modal');
  if (modal) {
    // Populate properties
    document.getElementById('prop-name').textContent = appDetails.app.name;
    document.getElementById('prop-category').textContent = appDetails.app.category;
    document.getElementById('prop-executable').textContent = appDetails.app.executable || '-';
    document.getElementById('prop-path').textContent = appDetails.app.path || '-';
    document.getElementById('prop-first-added').textContent = appDetails.app.first_used
      ? new Date(appDetails.app.first_used).toLocaleString()
      : '-';
    document.getElementById('prop-last-used').textContent = appDetails.app.last_used
      ? new Date(appDetails.app.last_used).toLocaleString()
      : '-';
    document.getElementById('prop-total-time').textContent = formatTime(appDetails.app.total_time);
    document.getElementById('prop-launch-count').textContent = appDetails.app.launch_count || 0;

    modal.style.display = 'flex';
  }
});

// Close modal
document.querySelector('.modal-close')?.addEventListener('click', () => {
  const modal = document.getElementById('properties-modal');
  if (modal) {
    modal.style.display = 'none';
  }
});

// Close modal on outside click
window.addEventListener('click', (e) => {
  const modal = document.getElementById('properties-modal');
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

// Back button handler
document.querySelector('.back-button')?.addEventListener('click', () => {
  // Send message to parent to go back to library
  window.parent.postMessage({ type: 'BACK_TO_LIBRARY' }, '*');
});
