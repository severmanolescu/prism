
// Create navigation sections based on app categories
async function createCategoryNavigation(apps) {
    console.log('Creating category navigation for apps:', apps);
    
    const libraryNav = document.querySelector('.library-nav');
    if (!libraryNav) {
        console.error('Library nav container not found!');
        return;
    }
    
    // Clear existing navigation
    libraryNav.innerHTML = '';
    
    // Create favorites section first if there are any favorites
    if (favoritesCache.length > 0) {
        const favoriteApps = apps.filter(app => favoritesCache.includes(app.id));
        if (favoriteApps.length > 0) {
            const favoritesSection = createNavSection('Favorites', favoriteApps, true);
            libraryNav.appendChild(favoritesSection);
        }
    }
    
    // Group apps by category using helper function
    const appsByCategory = await groupAppsByCategory(apps);
    console.log('Apps grouped by category:', appsByCategory);
    
    // Create nav sections for each category
    Object.keys(appsByCategory).sort().forEach(categoryName => {
        const categoryApps = appsByCategory[categoryName];
        if(categoryApps.apps.length != 0){
            const navSection = createNavSection(categoryName, categoryApps.apps);
            libraryNav.appendChild(navSection);
        }
    });
}

// Update library title
function updateLibraryTitle(categoryName) {
    const libraryTitle = document.querySelector('.library-title');
    if (libraryTitle) {
        const icon = getCategoryIcon(categoryName);
        libraryTitle.innerHTML = `${icon} ${categoryName}`;
    }
}


// Filter navigation based on search term
function filterNavigation(searchTerm) {
    const navSections = document.querySelectorAll('.nav-section');
    
    if (searchTerm === '') {
        // Show all items when search is empty and restore original collapsed states
        navSections.forEach(section => {
            section.style.display = 'block';
            const navItems = section.querySelectorAll('.nav-subitems .nav-item');
            navItems.forEach(item => {
                item.style.display = 'flex';
            });
            
            // Don't auto-expand when clearing search - keep original collapsed state
            // Just ensure subitems container is properly sized
            const subitems = section.querySelector('.nav-subitems');
            const toggleButton = section.querySelector('.category-toggle');
            
            if (section.classList.contains('collapsed')) {
                // Keep it collapsed
                subitems.style.maxHeight = '0';
            } else {
                // Keep it expanded
                subitems.style.maxHeight = subitems.scrollHeight + 'px';
            }
        });
        return;
    }
    
    navSections.forEach(section => {
        const subitems = section.querySelector('.nav-subitems');
        const navItems = section.querySelectorAll('.nav-subitems .nav-item');
        let hasMatchingApps = false;
        
        // Check each app in this category
        navItems.forEach(navItem => {
            const appName = navItem.querySelector('span:last-child').textContent.toLowerCase();
            const matches = appName.includes(searchTerm);
            
            if (matches) {
                hasMatchingApps = true;
                navItem.style.display = 'flex';
            } else {
                navItem.style.display = 'none';
            }
        });
        
        // Show/hide entire category based on whether it has matches
        if (hasMatchingApps) {
            section.style.display = 'block';
            // Auto-expand categories with matches during search
            section.classList.remove('collapsed');
            subitems.style.maxHeight = subitems.scrollHeight + 'px';
            const toggleButton = section.querySelector('.category-toggle');
            if (toggleButton) toggleButton.classList.remove('collapsed');
        } else {
            section.style.display = 'none';
        }
    });
}