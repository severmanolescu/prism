async function loadAppData() {
    try {
        console.log('Loading app data...');
        
        // Load favorites first
        favoritesCache = await window.electronAPI.getFavorites();
        console.log('Favorites loaded:', favoritesCache);
        
        // Load recent apps
        const recentApps = await window.electronAPI.getRecentApps();
        console.log('Recent apps loaded:', recentApps.length, 'apps');
        displayRecentApps(recentApps);
        
        // Load all apps
        const allApps = await window.electronAPI.getAllApps();
        console.log('All apps loaded:', allApps.length, 'apps');
        
        // Cache all apps for filtering
        allAppsCache = allApps;
        
        displayAllApps(allApps);
        
        // Create navigation based on categories
        createCategoryNavigation(allApps);
        
        console.log('App data loaded successfully');
    } catch (error) {
        console.error('Error loading app data:', error);
    }
}

// Load apps by category
async function loadAppsByCategory(category) {
    try {
        console.log('Loading apps by category:', category);
        
        // If "All Apps" is selected, show all cached apps
        if (category === 'All Apps') {
            console.log('Showing all apps from cache:', allAppsCache.length);
            displayAllApps(allAppsCache);
            return;
        }
        
        // If "Favorites" is selected, load favorites
        if (category === 'Favorites') {
            await loadFavoriteApps();
            return;
        }
        
        // Filter from cached apps
        const filteredApps = allAppsCache.filter(app => {
            const appCategory = app.category || 'Uncategorized';
            return appCategory === category;
        });
        
        console.log('Filtered apps for category "' + category + '":', filteredApps.length);
        console.log('Apps in this category:', filteredApps.map(app => app.name));
        
        displayAllApps(filteredApps);
        
    } catch (error) {
        console.error('Error loading apps by category:', error);
    }
}

async function loadFavoriteApps() {
    try {
        console.log('Loading favorite apps');
        
        // Get current favorites
        const favoriteIds = await window.electronAPI.getFavorites();
        console.log('Favorite IDs:', favoriteIds);
        
        // Filter from cached apps to get favorite apps
        const favoriteApps = allAppsCache.filter(app => favoriteIds.includes(app.id));
        
        console.log('Filtered favorite apps:', favoriteApps.length);
        console.log('Favorite apps:', favoriteApps.map(app => app.name));
        
        displayAllApps(favoriteApps);
        
    } catch (error) {
        console.error('Error loading favorite apps:', error);
    }
}

// Load recent apps separately
async function loadRecentApps() {
    try {
        const recentApps = await window.electronAPI.getRecentApps();
        displayRecentApps(recentApps);
    } catch (error) {
        console.error('Error loading recent apps:', error);
    }
}

// Group apps by category helper function
function groupAppsByCategory(apps) {
    const appsByCategory = {};
    apps.forEach(app => {
        const category = app.category || 'Uncategorized';
        if (!appsByCategory[category]) {
            appsByCategory[category] = [];
        }
        appsByCategory[category].push(app);
    });
    return appsByCategory;
}