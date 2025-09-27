// Create app element  
function createAppElement(app, bgColor) {
    const item = document.createElement('div');
    item.className = 'app-item';
    item.dataset.appId = app.id;
    item.dataset.category = app.category;

    const iconHtml = app.iconPath 
        ? `<img src="app-icon://${app.iconPath.replace('icons/', '')}" alt="${app.name}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none';">` 
        : `<div class="app-icon-small">${getAppIcon(app.name, app.category)}</div>`;
    
    item.innerHTML = `
        <div class="app-item-bg" style="background: ${bgColor};">
            ${iconHtml}
        </div>
        <div class="app-item-overlay">
            <div class="app-item-name">${app.name}</div>
            <div class="app-item-stats">
                <span class="app-item-hours">${app.totalTimeFormatted}</span>
                <span class="app-item-last-played">${app.lastUsedFormatted}</span>
            </div>
        </div>
    `;
    
    return item;
}

// Create recent app element
function createRecentAppElement(app, bgColor) {
    const item = document.createElement('div');
    item.className = 'recent-item';
    item.dataset.appId = app.id;
    
    const iconHtml = app.iconPath 
        ? `<img src="app-icon://${app.iconPath.replace('icons/', '')}" alt="${app.name}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none';">` 
        : `<div class="app-icon-small">${getAppIcon(app.name, app.category)}</div>`;

    item.innerHTML = `
        <div class="recent-item-bg" style="background: ${bgColor || getCategoryColor(app.category)};">
            ${iconHtml}
        </div>
        <div class="recent-item-info">
            <div class="recent-item-name">${app.name}</div>
            <div class="recent-item-time">${app.lastUsedFormatted}</div>
        </div>
    `;
    
    return item;
}

// Create a navigation section for a category
function createNavSection(categoryName, apps, isFavorites = false) {
    const navSection = document.createElement('div');
    navSection.className = 'nav-section';
    
    // Get category icon
    const categoryIcon = isFavorites ? '⭐' : getCategoryIcon(categoryName);
    
    // Create category header with expand/collapse button
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'nav-item category';
    categoryHeader.innerHTML = `
        <div class="category-main">
            <span class="icon">${categoryIcon}</span>
            <span>${categoryName}</span>
            <span class="category-count">(${apps.length})</span>
        </div>
        <button class="category-toggle" data-category="${categoryName}">
            <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    `;
    
    // Create subitems container
    const subitemsContainer = document.createElement('div');
    subitemsContainer.className = 'nav-subitems';
    subitemsContainer.dataset.category = categoryName;
    
    console.log("Creating nav section: ", apps)

    // Add each app as a nav item
    apps.forEach(app => {
        const navItem = document.createElement('div');
        navItem.className = 'nav-item';
        navItem.dataset.appId = app.id;  // Make sure this line exists
        navItem.dataset.appName = app.name;  // Add this line too
        navItem.draggable = true; 
        
        const iconHtml = app.iconPath
            ? `<img src="app-icon://${app.iconPath.replace('icons/', '')}" alt="${app.name}" 
                style="width: 18px; height: 18px; object-fit: contain; margin-right: 6px;">`
            : `<span class="icon">${getAppIcon(app.name, app.category)}</span>`;
        
        navItem.innerHTML = `
            ${iconHtml}
            <span>${app.name}</span>
        `;
        
        // Add drag event handlers
        navItem.addEventListener('dragstart', handleDragStart);
        navItem.addEventListener('dragend', handleDragEnd);
        
        subitemsContainer.appendChild(navItem);
    });
    
    navSection.appendChild(categoryHeader);
    navSection.appendChild(subitemsContainer);
    
    return navSection;
}


function createCategoryCard(categoryName, apps, color = '#4a90e2') {
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.dataset.category = categoryName;
    
    // Use the category's custom color as background gradient
    const bgColor = `linear-gradient(135deg, ${color} 0%, ${adjustBrightness(color, -20)} 80%)`;
    
    // Determine grid layout based on number of apps
    let gridClass, maxApps, totalSlots;
    
    if (apps.length === 0) {
        // Handle empty categories
        gridClass = 'grid-empty';
        maxApps = 0;
        totalSlots = 1;
    } else if (apps.length === 1) {
        gridClass = 'grid-1x1';
        maxApps = 1;
        totalSlots = 1;
    } else if (apps.length === 2) {
        gridClass = 'grid-1x2';
        maxApps = 2;
        totalSlots = 2;
    } else if (apps.length === 3) {
        gridClass = 'grid-1x3';
        maxApps = 3;
        totalSlots = 3;
    } else if (apps.length <= 4) {
        gridClass = 'grid-2x2';
        maxApps = 4;
        totalSlots = 4;
    } else {
        gridClass = 'grid-3x3';
        maxApps = 9;
        totalSlots = 9;
    }
    
    let backgroundIcons = [];
    
    if (apps.length === 0) {
        // Show empty state
        backgroundIcons.push('<div class="empty-category">Empty Collection</div>');
    } else {
        const sampleApps = apps.slice(0, maxApps);
        
        for (let i = 0; i < totalSlots; i++) {
            if (i < sampleApps.length) {
                const app = sampleApps[i];
                if (app.iconPath) {
                    backgroundIcons.push(`<img src="app-icon://${app.iconPath.replace('icons/', '')}" alt="${app.name}">`);
                } else {
                    backgroundIcons.push(`<span class="bg-icon">${getAppIcon(app.name, app.category)}</span>`);
                }
            } else {
                backgroundIcons.push(`<div class="bg-empty"></div>`);
            }
        }
    }
    
    card.innerHTML = `
        <div class="collection-card-bg" style="background: ${bgColor};">
            <div class="collection-bg-icons ${gridClass}">${backgroundIcons.join('')}</div>
        </div>
        <div class="collection-card-content">
            <div class="collection-title">${categoryName.toUpperCase()}</div>
            <div class="collection-count">( ${apps.length} )</div>
        </div>
    `;
    
    // Add click handler
    card.addEventListener('click', () => {
        currentCategory = categoryName;
        if (categoryName === 'Favorites') {
            loadFavoriteApps();
        } else {
            loadAppsByCategory(categoryName);
        }
        updateLibraryTitle(categoryName);
        
        toggleView('grid');
        document.querySelector('.view-toggle-btn[data-view="categories"]').classList.remove('active');
        
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        const navItem = document.querySelector(`[data-category="${categoryName}"]`)?.closest('.nav-item');
        if (navItem) navItem.classList.add('active');
    });
    
    return card;
}

function showHomeView() {
    // Show the main home content (recent + all apps sections)
    const recentSection = document.querySelector('.recent-section');
    const allAppsSection = document.querySelector('.all-apps-section');
    
    if (recentSection) recentSection.style.display = 'block';
    if (allAppsSection) allAppsSection.style.display = 'block';
    
    // Hide collections view if it's showing
    const categoryOverview = document.querySelector('.category-overview');
    if (categoryOverview) {
        categoryOverview.style.display = 'none';
    }
    
    // Reset to grid view (not categories view)
    toggleView('grid');
    
    // Update view toggle button state - NO view button should be active for home
    document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));
    
    // Load all apps data
    currentCategory = 'All Apps';
    loadAppData();
    updateLibraryTitle('All Apps');
    
    // Clear navigation selection
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    
    // Update submenu state - set Home as active
    document.querySelectorAll('.library-submenu-item').forEach(item => item.classList.remove('active'));
    const homeSubmenu = document.querySelector('.library-submenu-item[data-submenu="home"]');
    if (homeSubmenu) {
        homeSubmenu.classList.add('active');
    }
}

function showCollectionsView() {
    // Hide current content
    const recentSection = document.querySelector('.recent-section');
    const allAppsSection = document.querySelector('.all-apps-section');
    if (recentSection) recentSection.style.display = 'none';
    if (allAppsSection) allAppsSection.style.display = 'none';
    
    // Show collections view (categories view)
    toggleView('categories');
    
    // Update the view toggle button state - categories button should be active
    document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));
    const categoriesBtn = document.querySelector('.view-toggle-btn[data-view="categories"]');
    if (categoriesBtn) {
        categoriesBtn.classList.add('active');
    }
    
    // Update library title
    updateLibraryTitle('Collections');
    
    // Update submenu state - set Collections as active
    document.querySelectorAll('.library-submenu-item').forEach(item => item.classList.remove('active'));
    const collectionsSubmenu = document.querySelector('.library-submenu-item[data-submenu="collections"]');
    if (collectionsSubmenu) {
        collectionsSubmenu.classList.add('active');
    }
}