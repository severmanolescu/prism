// Set up real-time updates
function setupRealTimeUpdates() {
    // Listen for app usage updates
    window.electronAPI.onAppUsageUpdated((event, data) => {
        updateAppDisplay(data);
        updateTodayStats();
    });
    
    // Listen for icon updates
    window.electronAPI.onAppIconUpdated((event, data) => {
        updateAppIcon(data.appId, data.iconPath);
    });
    
    // Refresh data periodically
    setInterval(() => {
        refreshAppDataInBackground();
    }, 30000); // Every 30 seconds
}

// Refresh data without rebuilding the DOM for main apps
async function refreshAppDataInBackground() {
    try {
        // Update main app cards in-place (preserves scroll)
        const updatedApps = await window.electronAPI.getAppsByCategory(currentCategory);
        updatedApps.forEach(app => {
            updateAppCardData(app);
        });
        
        // Refresh recent apps section (rebuild is fine here since it's small)
        loadRecentApps();
        
        console.log('Background refresh completed');
    } catch (error) {
        console.error('Error during background refresh:', error);
    }
}

// Update a single app card's data without recreating it
function updateAppCardData(app) {
    const appElement = document.querySelector(`.app-item[data-app-id="${app.id}"]`);
    if (!appElement) {
        return; // Card doesn't exist (maybe filtered out)
    }
    
    // Update total time display
    const hoursElement = appElement.querySelector('.app-item-hours');
    if (hoursElement && app.totalTimeFormatted) {
        hoursElement.textContent = app.totalTimeFormatted;
    }
    
    // Update last played time
    const lastPlayedElement = appElement.querySelector('.app-item-last-played');
    if (lastPlayedElement && app.lastUsedFormatted) {
        lastPlayedElement.textContent = app.lastUsedFormatted;
    }
}

// Update app icon when it's extracted
function updateAppIcon(appId, iconPath) {
    const appElements = document.querySelectorAll(`[data-app-id="${appId}"]`);
    appElements.forEach(element => {
        const iconContainer = element.querySelector('.recent-item-bg, .app-item-bg');
        if (iconContainer) {
            // Replace emoji with real icon
            iconContainer.innerHTML = `<img src="${iconPath}" alt="App Icon" style="width: 48px; height: 48px; object-fit: contain;">`;
        }
    });
    
    console.log(`Updated icon for app ${appId}: ${iconPath}`);
}

// Update app display when usage changes
function updateAppDisplay(data) {
    const appElement = document.querySelector(`[data-app-id="${data.appId}"]`);
    if (appElement) {
        const hoursElement = appElement.querySelector('.app-item-hours');
        if (hoursElement && data.totalTimeFormatted) {
            hoursElement.textContent = data.totalTimeFormatted;
        }
        
        const lastPlayedElement = appElement.querySelector('.app-item-last-played');
        if (lastPlayedElement && data.lastUsedFormatted) {
            lastPlayedElement.textContent = data.lastUsedFormatted;
        }
    }
}