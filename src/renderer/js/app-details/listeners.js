// Listen for data from parent window
window.addEventListener('message', (event) => {
  // Verify message comes from parent window
  if (event.source !== window.parent) {
    return;
  }

  if (event.data.type === 'APP_DETAILS') {
    // Initial load - store the app ID and load data for default period
    currentAppId = event.data.appId;
    if (currentAppId) {
      loadAppData(currentAppId, currentPeriod);
    }
  } else if (event.data.type === 'APP_DETAILS_RESPONSE') {
    // Response from REQUEST_APP_DETAILS with filtered data
    appDetails = event.data.data;
    loadAppDetails().then(() => {
      // Initialize productivity selector after app details are loaded
      if (typeof initializeProductivitySelector === 'function') {
        initializeProductivitySelector();
      }
    });
  } else if (event.data.type === 'FAVORITE_UPDATED') {
    // Update favorite button text
    const favoriteBtn = document.getElementById('favorite-btn');
    if (favoriteBtn) {
      const btnText = favoriteBtn.querySelector('span:last-child');
      if (btnText) {
        btnText.textContent = event.data.isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
      }
    }
  } else if (event.data.type === 'CATEGORIES_DATA') {
    // Received categories from parent
    if (appDetails) {
      const category = appDetails.app.category;
      const categoryData = event.data.categories.find(cat => cat.name === category);
      const categoryProductivityLevel = categoryData?.productivity_level || 'neutral';

      // Update the dropdown if app has no override (is using inherit)
      if (appDetails.app.productivity_level_override == null) {
        // Update the button to show it's using category default
        if (typeof updateDropdownButton === 'function') {
          updateDropdownButton('inherit', categoryProductivityLevel);
        }
      }

      // Store the category default for later use
      if (typeof currentCategoryProductivityLevel !== 'undefined') {
        window.currentCategoryProductivityLevel = categoryProductivityLevel;
      }
    }
  } else if (event.data.type === 'PRODUCTIVITY_DATA') {
    // Received productivity data from parent
    console.log('Received productivity data:', event.data);
    // This can be used to update the UI if needed
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
document.getElementById('properties-btn')?.addEventListener('click', async () => {
  if (!appDetails) return;

  await showProperties();
});

// Close modal
document.querySelector('.modal-close')?.addEventListener('click',  () => {
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

// Productivity dropdown toggle
const productivityDropdown = document.querySelector('.productivity-dropdown');
const productivityDropdownBtn = document.getElementById('productivity-dropdown-btn');
const productivityDropdownMenu = document.getElementById('productivity-dropdown-menu');

productivityDropdownBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  productivityDropdown.classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!productivityDropdown?.contains(e.target)) {
    productivityDropdown?.classList.remove('active');
  }
});

// Handle productivity option selection
document.querySelectorAll('.productivity-option').forEach(option => {
  option.addEventListener('click', async () => {
    const level = option.dataset.level;

    // Get the icon and text mappings
    const levelConfig = {
      'productive': { icon: '✅', text: 'Productive' },
      'neutral': { icon: '⚪', text: 'Neutral' },
      'unproductive': { icon: '❌', text: 'Unproductive' },
      'inherit': { icon: '↩️', text: 'Use Category Default' }
    };

    // Update the dropdown button
    const config = levelConfig[level];
    if (config) {
      document.getElementById('productivity-icon').textContent = config.icon;
      document.getElementById('productivity-text').textContent = config.text;
    }

    // Update the productivity stat card
    if (typeof updateProductivityStatCard === 'function') {
      const effectiveLevel = level === 'inherit'
        ? (window.currentCategoryProductivityLevel || 'neutral')
        : level;
      updateProductivityStatCard(effectiveLevel, level === 'inherit');
    }

    // Close dropdown
    productivityDropdown.classList.remove('active');

    // Call the existing setProductivityLevel function
    if (typeof setProductivityLevel === 'function' && appDetails) {
      await setProductivityLevel(level, appDetails.app.id);
    }
  });
});
