// Set up real-time updates
function setupRealTimeUpdates() {
    // Listen for app usage updates
    window.electronAPI.onAppUsageUpdated((event, data) => {
        updateAppDisplay(data);
    });
    
    // Listen for icon updates
    window.electronAPI.onAppIconUpdated((event, data) => {
        updateAppIcon(data.appId, data.iconPath);
    });
    
    // Refresh data periodically
    setInterval(() => {
        loadAppsByCategory(currentCategory);
        loadRecentApps();
    }, 30000); // Every 30 seconds
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
        if (hoursElement) {
            hoursElement.textContent = formatTime(data.totalTime);
        }
    }
}
