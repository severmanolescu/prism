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
        
        await displayAllApps(allApps);
        
        // Create navigation based on categories
        await createCategoryNavigation(allApps);
        
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
            await displayAllApps(allAppsCache);
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
        
        await displayAllApps(filteredApps);
        
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
        
        await displayAllApps(favoriteApps);
        
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
async function groupAppsByCategory(apps) {
    try {
        const categories = await window.electronAPI.getCategories();
        console.log('Categories received in renderer:', categories);
        
        if (!categories || !Array.isArray(categories)) {
            console.error('Categories data is invalid:', categories);
            return { 'Uncategorized': { apps: apps, color: '#4a90e2', isDefault: true } };
        }
        
        const appsByCategory = {};
        
        // Initialize all categories from categories.json (including empty ones)
        categories.forEach(category => {
            appsByCategory[category.name] = {
                apps: [],
                color: category.color || '#4a90e2',
                isDefault: category.isDefault || false
            };
        });

        // Ensure Uncategorized always exists
        if (!appsByCategory['Uncategorized']) {
            appsByCategory['Uncategorized'] = {
                apps: [],
                color: '#4a90e2',
                isDefault: true
            };
        }
        
        // Distribute apps into categories
        apps.forEach(app => {
            const categoryName = app.category || 'Uncategorized';
            
            // If app's category doesn't exist in categories.json, put it in Uncategorized
            if (appsByCategory[categoryName]) {
                appsByCategory[categoryName].apps.push(app);
            } else {
                appsByCategory['Uncategorized'].apps.push(app);
            }
        });
        
        return appsByCategory;
    } catch (error) {
        console.error('Error in groupAppsByCategory:', error);
        return { 'Uncategorized': { apps: apps, color: '#4a90e2', isDefault: true } };
    }
}