async function loadAppData() {
    try {       
        // Load favorites first
        favoritesCache = await window.electronAPI.getFavorites();
        
        // Load recent apps
        const recentApps = await window.electronAPI.getRecentApps();
        await displayRecentApps(recentApps);
        
        // Load all apps
        const allApps = await window.electronAPI.getAllApps();
        
        // Cache all apps for filtering
        allAppsCache = allApps;
        
        await displayAllApps(allApps);
        
        // Create navigation based on categories
        await createCategoryNavigation(allApps);
    } catch (error) {
        console.error('Error loading app data:', error);
    }
}

// Load apps by category
async function loadAppsByCategory(category, preserveScroll = false) {
    let scrollTop = 0;
    
    if (preserveScroll) {
        const contentArea = document.querySelector('.content-area');
        scrollTop = contentArea ? contentArea.scrollTop : 0;
    }

    try {        
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

        if(category === "Hidden"){
            await loadHiddenApps();
            return;
        }
        
        // Filter from cached apps
        const filteredApps = allAppsCache.filter(app => {
            const appCategory = app.category || 'Uncategorized';
            return appCategory === category;
        });

        await displayAllApps(filteredApps);

        if (preserveScroll) {
            setTimeout(() => {
                const contentArea = document.querySelector('.content-area');
                if (contentArea) {
                    contentArea.scrollTop = scrollTop;
                }
            }, 50);
        }

    } catch (error) {
        console.error('Error loading apps by category:', error);
    }
}

async function loadFavoriteApps() {
    try {
        // Get current favorites (returns full app objects)
        const favorites = await window.electronAPI.getFavorites();

        // Extract IDs from favorite objects
        const favoriteIds = favorites.map(app => app.id);

        // Filter from cached apps to get favorite apps
        const favoriteApps = allAppsCache.filter(app => favoriteIds.includes(app.id));

        await displayAllApps(favoriteApps);

    } catch (error) {
        console.error('Error loading favorite apps:', error);
    }
}

async function loadHiddenApps(params) {
        try {     
        // Get current favorites
        const hiddenIds = await window.electronAPI.getHiddenApps();
        
        await displayAllApps(hiddenIds);
        
    } catch (error) {
        console.error('Error loading favorite apps:', error);
    }
}

// Load recent apps separately
async function loadRecentApps() {
    try {
        const recentApps = await window.electronAPI.getRecentApps();
        await displayRecentApps(recentApps);
    } catch (error) {
        console.error('Error loading recent apps:', error);
    }
}

// Group apps by category helper function
async function groupAppsByCategory(apps) {
    try {
        const categories = await window.electronAPI.getCategories();
        
        if (!categories || !Array.isArray(categories)) {
            console.error('Categories data is invalid:', categories);
            return { 'Uncategorized': { apps: apps, color: '#092442', isDefault: true } };
        }
        
        const appsByCategory = {};
        
        // Initialize all categories from categories.json (including empty ones)
        categories.forEach(category => {
            appsByCategory[category.name] = {
                apps: [],
                color: category.color || '#092442 ',
                isDefault: category.isDefault || false,
                sortPreference: category.sortPreference || 'name-asc',
                productivity_level: category.productivity_level || 'neutral'
            };
        });

        // Ensure Uncategorized always exists
        if (!appsByCategory['Uncategorized']) {
            appsByCategory['Uncategorized'] = {
                apps: [],
                background: 'linear-gradient(135deg, #092442 0%, #07417a 80%)',
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
        
        Object.keys(appsByCategory).forEach(categoryName => {
            appsByCategory[categoryName].apps.sort((a, b) => b.totalTime - a.totalTime);
        });

        return appsByCategory;
    } catch (error) {
        console.error('Error in groupAppsByCategory:', error);
        return { 'Uncategorized': { apps: apps, color: '#4a90e2', isDefault: true } };
    }
}
